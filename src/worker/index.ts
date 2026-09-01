import 'dotenv/config';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { BotInstance, BotConfig, Signal } from '../bots/BotInstance';
import { KrakenService } from '../services/KrakenService';
import { DiscordService } from '../services/DiscordService';
import { io, latestPrices } from '../api/index';

const kraken = new KrakenService();
const discord = new DiscordService();

const PAIR_MAP: Record<string, string> = {
  'XBT/USD': 'XXBTZUSD',
  'ADA/USD': 'ADAUSD',
};

interface KrakenTickerResponse {
  error: string[];
  result: {
    [pair: string]: { c: string[] };
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────
async function fetchPrice(pair: string, retries = 3): Promise<number | null> {
  const restPair = PAIR_MAP[pair];
  if (!restPair) {
    console.error(`[Worker] ❌ No REST pair mapping for "${pair}"`);
    return null;
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `https://api.kraken.com/0/public/Ticker?pair=${restPair}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[Worker] Price fetch attempt ${attempt} failed: ${response.status}`);
        if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      const data = (await response.json()) as KrakenTickerResponse;
      if (data.error && data.error.length > 0) {
        console.warn(`[Worker] Kraken API error attempt ${attempt}:`, data.error);
        if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      const ticker = data.result[restPair];
      if (ticker && ticker.c && ticker.c.length > 0) {
        const price = parseFloat(ticker.c[0]);
        if (!isNaN(price)) return price;
      }
      return null;
    } catch (err) {
      console.warn(`[Worker] Price fetch attempt ${attempt} exception:`, err);
      if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return null;
}

async function storeBalanceSnapshot(botId: string): Promise<void> {
  try {
    const balances = await kraken.getBalances();
    // If balances is empty or undefined, we still store an empty object
    await db.insert(schema.balanceSnapshots).values({
      botId: botId,
      balances: balances || {},
    });
    console.log(`[Worker] Balance snapshot stored for bot ${botId}`);
  } catch (error) {
    console.error(`[Worker] Failed to store balance snapshot for bot ${botId}:`, error);
    // Optionally store an empty snapshot to avoid null errors
    try {
      await db.insert(schema.balanceSnapshots).values({
        botId: botId,
        balances: {},
      });
    } catch (e) {
      console.error(`[Worker] Even storing empty snapshot failed:`, e);
    }
  }
}

async function notifyDiscord(message: string): Promise<void> {
  await discord.sendMessage(message);
}

// ─── Worker state ────────────────────────────────────────────────────
let botInstances = new Map<string, BotInstance>();
let pendingVolumes = new Map<string, number>();

// ─── Main worker loop ──────────────────────────────────────────────
async function startWorker() {
  console.log('[Worker] Starting with balance tracking and Discord notifications...');

  // Initial load
  await loadBots();

  // Price polling (every 5s)
  setInterval(async () => {
    // Reload bots periodically in case of changes
    await loadBots();

    for (const [botId, instance] of botInstances) {
      const bot = (await db.select().from(schema.bots).where(eq(schema.bots.id, botId)))[0];
      if (!bot) continue;

      const price = await fetchPrice(bot.pair);
      if (price === null) continue;

      // Emit via Socket.io
      latestPrices.set(botId, price);
      io.to(`bot:${botId}`).emit('price', { botId, price, timestamp: Date.now() });

      // Save snapshot
      await db.insert(schema.priceSnapshots).values({
        botId: botId,
        price: price,
      });

      // Reference price
      if (instance.getReferencePrice() === null) {
        instance.setReferencePrice(price);
        await db.update(schema.bots)
          .set({ referencePrice: price })
          .where(eq(schema.bots.id, botId));
        console.log(`[${bot.pair}] Reference price set to ${price} and saved to DB.`);
        continue;
      }

      // Signal
      const signal = instance.onPrice(price);
      if (signal) {
        const internalPair = PAIR_MAP[bot.pair] || bot.pair;
        try {
          const order = await kraken.placeOrder(signal.type, internalPair, signal.volume, signal.price);
          const orderId = order.orderId;

          instance.setPendingOrder(orderId, signal.type);
          pendingVolumes.set(orderId, signal.volume);

          await db.update(schema.bots)
            .set({
              pendingOrderId: orderId,
              pendingOrderSide: signal.type,
            })
            .where(eq(schema.bots.id, botId));

          await db.insert(schema.orders).values({
            botId: botId,
            krakenOrderId: orderId,
            side: signal.type,
            price: signal.price,
            volume: signal.volume,
            quoteVolume: signal.price * signal.volume,
            status: 'open',
          });

          console.log(`[Worker] Order ${orderId} placed for ${bot.pair}`);
          await notifyDiscord(`📈 **Order Placed**\nPair: ${bot.pair}\nSide: ${signal.type.toUpperCase()}\nPrice: ${signal.price}\nVolume: ${signal.volume}\nOrder ID: ${orderId}`);
        } catch (error) {
          console.error(`[Worker] Failed to place order for ${bot.pair}:`, error);
          await notifyDiscord(`❌ **Order Failed**\nPair: ${bot.pair}\nSide: ${signal.type.toUpperCase()}\nError: ${String(error)}`);
        }
      }
    }
  }, 5000);

  // Order monitoring (every 30s)
  setInterval(async () => {
    for (const [botId, instance] of botInstances) {
      const orderId = instance.getPendingOrderId();
      if (!orderId) continue;

      try {
        const status = await kraken.getOrderStatus(orderId);
        const side = instance.getPendingSide();
        const lastPrice = instance.getLastPrice();

        if (status.status === 'closed' || status.status === 'filled') {
          let fillVolume = pendingVolumes.get(orderId) || status.filled || 0;
          const fillPrice = status.price || lastPrice || 0;

          instance.onOrderFilled(fillPrice);

          await db.update(schema.bots)
            .set({
              pendingOrderId: null,
              pendingOrderSide: null,
              referencePrice: fillPrice,
            })
            .where(eq(schema.bots.id, botId));

          await db.update(schema.orders)
            .set({ status: 'filled', filledAt: new Date() })
            .where(eq(schema.orders.krakenOrderId, orderId));

          const orderRecord = await db.select().from(schema.orders).where(eq(schema.orders.krakenOrderId, orderId));
          const orderIdUuid = orderRecord[0]?.id;

          await db.insert(schema.trades).values({
            botId: botId,
            orderId: orderIdUuid,
            side: side || 'unknown',
            price: fillPrice,
            volume: fillVolume,
            quoteVolume: fillPrice * fillVolume,
            fee: 0,
            pnl: side === 'sell' ? (fillPrice - instance.getReferencePrice()!) * fillVolume : null,
          });

          await storeBalanceSnapshot(botId);
          pendingVolumes.delete(orderId);

          console.log(`[Worker] Order ${orderId} filled and recorded.`);
          await notifyDiscord(`✅ **Order Filled**\nPair: ${instance.getPair()}\nSide: ${side?.toUpperCase()}\nPrice: ${fillPrice}\nVolume: ${fillVolume}\nOrder ID: ${orderId}`);
          continue;
        }

        if (status.status === 'canceled' || status.status === 'expired') {
          instance.onOrderCanceled();
          await db.update(schema.bots)
            .set({ pendingOrderId: null, pendingOrderSide: null })
            .where(eq(schema.bots.id, botId));
          await db.update(schema.orders)
            .set({ status: status.status })
            .where(eq(schema.orders.krakenOrderId, orderId));
          pendingVolumes.delete(orderId);

          console.log(`[Worker] Order ${orderId} ${status.status}`);
          await notifyDiscord(`⚠️ **Order ${status.status.toUpperCase()}**\nPair: ${instance.getPair()}\nOrder ID: ${orderId}`);
          continue;
        }

        const orderPrice = status.price;
        if (lastPrice && orderPrice && Math.abs((lastPrice - orderPrice) / orderPrice) > 0.005) {
          console.log(`[Worker] Canceling stale order ${orderId} (price moved to ${lastPrice})`);
          await kraken.cancelOrder(orderId);
          instance.onOrderCanceled();
          await db.update(schema.bots)
            .set({ pendingOrderId: null, pendingOrderSide: null })
            .where(eq(schema.bots.id, botId));
          await db.update(schema.orders)
            .set({ status: 'canceled' })
            .where(eq(schema.orders.krakenOrderId, orderId));
          pendingVolumes.delete(orderId);

          await notifyDiscord(`🔄 **Order Canceled (Stale)**\nPair: ${instance.getPair()}\nOrder ID: ${orderId}\nPrice moved to ${lastPrice}`);
        }
      } catch (error) {
        console.error(`[Worker] Error monitoring order ${orderId}:`, error);
        await notifyDiscord(`❌ **Monitoring Error**\nOrder ID: ${orderId}\nError: ${String(error)}`);
      }
    }
  }, 30000);

  // Periodic balance snapshots (every 5 minutes)
  setInterval(async () => {
    for (const [botId] of botInstances) {
      await storeBalanceSnapshot(botId);
    }
    console.log('[Worker] Periodic balance snapshots stored.');
  }, 5 * 60 * 1000);

  // ─── Graceful shutdown ────────────────────────────────────────────
  process.on('SIGINT', () => {
    console.log('[Worker] Received SIGINT – shutting down gracefully...');
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    console.log('[Worker] Received SIGTERM – shutting down gracefully...');
    process.exit(0);
  });
}

// ─── Helper to load bots and update instances ───────────────────────
async function loadBots() {
  const activeBots = await db.select().from(schema.bots).where(eq(schema.bots.isActive, true));
  console.log(`[Worker] Found ${activeBots.length} active bots`);

  // Remove instances that no longer exist
  const currentIds = new Set(activeBots.map(b => b.id));
  for (const [id, instance] of botInstances) {
    if (!currentIds.has(id)) {
      botInstances.delete(id);
      console.log(`[Worker] Removed bot ${instance.getPair()}`);
    }
  }

  // Add or update bots
  for (const bot of activeBots) {
    const existing = botInstances.get(bot.id);
    if (existing) {
      // Optionally update config if changed (we skip for simplicity)
      continue;
    }
    const config: BotConfig = {
      id: bot.id,
      pair: bot.pair,
      recipe: bot.recipe as any,
      buyThresholdPct: bot.buyThresholdPct ?? 0,
      sellThresholdPct: bot.sellThresholdPct ?? 0,
      buyAmount: bot.buyAmount ?? 0,
      sellAmount: bot.sellAmount ?? 0,
      maxPosition: bot.maxPosition ?? undefined,
      minQuoteReserve: bot.minQuoteReserve ?? undefined,
      isActive: bot.isActive ?? false,
      referencePrice: bot.referencePrice ?? null,
      momentumSensitivity: bot.momentumSensitivity ?? 0.5,
      maxDynamicShiftPct: bot.maxDynamicShiftPct ?? 5.0,
    };
    const instance = new BotInstance(config);
    if (bot.pendingOrderId && bot.pendingOrderSide) {
      instance.setPendingOrder(bot.pendingOrderId, bot.pendingOrderSide as 'buy' | 'sell');
      console.log(`[Worker] Restored pending order ${bot.pendingOrderId} for ${bot.pair}`);
    }
    botInstances.set(bot.id, instance);
    console.log(`[Worker] Bot ${bot.pair} initialized, refPrice: ${instance.getReferencePrice()}`);
  }
}

// ─── Start ──────────────────────────────────────────────────────────
startWorker().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
import { pgTable, uuid, text, real, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

// ─── Bots ──────────────────────────────────────────────────────────────
export const bots = pgTable('bots', {
  id: uuid('id').primaryKey().defaultRandom(),
  pair: text('pair').notNull(),
  recipe: text('recipe').notNull(), // 'crypto_accum', 'cash_accum', 'combination'
  buyThresholdPct: real('buy_threshold_pct').notNull(),
  sellThresholdPct: real('sell_threshold_pct').notNull(),
  buyAmount: real('buy_amount').notNull(),
  sellAmount: real('sell_amount').notNull(),
  maxPosition: real('max_position'),
  minQuoteReserve: real('min_quote_reserve'),
  isActive: boolean('is_active').default(false),
  referencePrice: real('reference_price'),
  momentumSensitivity: real('momentum_sensitivity').default(0.5),
  maxDynamicShiftPct: real('max_dynamic_shift_pct').default(5.0),

  // NEW: track pending orders in DB
  pendingOrderId: text('pending_order_id'),
  pendingOrderSide: text('pending_order_side'), // 'buy' or 'sell'

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Price Snapshots ──────────────────────────────────────────────────
export const priceSnapshots = pgTable('price_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  botId: uuid('bot_id').references(() => bots.id, { onDelete: 'cascade' }),
  price: real('price').notNull(),
  buyLine: real('buy_line'),
  sellLine: real('sell_line'),
  momentum: real('momentum'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// ─── Orders ──────────────────────────────────────────────────────────
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  botId: uuid('bot_id')
    .references(() => bots.id, { onDelete: 'cascade' })
    .notNull(),
  krakenOrderId: text('kraken_order_id').notNull(),
  side: text('side').notNull(), // 'buy' or 'sell'
  price: real('price').notNull(),
  volume: real('volume').notNull(),
  quoteVolume: real('quote_volume'), // price * volume
  status: text('status').notNull(), // 'open', 'filled', 'canceled', 'expired'
  filledAt: timestamp('filled_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Trades ──────────────────────────────────────────────────────────
export const trades = pgTable('trades', {
  id: uuid('id').primaryKey().defaultRandom(),
  botId: uuid('bot_id')
    .references(() => bots.id, { onDelete: 'cascade' })
    .notNull(),
  orderId: uuid('order_id')
    .references(() => orders.id, { onDelete: 'set null' }),
  side: text('side').notNull(), // 'buy' or 'sell'
  price: real('price').notNull(),
  volume: real('volume').notNull(),
  quoteVolume: real('quote_volume').notNull(),
  fee: real('fee').default(0),
  pnl: real('pnl'), // realised profit/loss (for sells)
  balanceSnapshot: jsonb('balance_snapshot'), // full balances after trade
  createdAt: timestamp('created_at').defaultNow(),
});

export const balanceSnapshots = pgTable('balance_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  botId: uuid('bot_id').references(() => bots.id, { onDelete: 'cascade' }),
  balances: jsonb('balances').notNull(), // e.g., { "XXBT": 0.01, "ZUSD": 1000 }
  timestamp: timestamp('timestamp').defaultNow(),
});
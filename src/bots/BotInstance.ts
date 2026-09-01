export interface BotConfig {
  id: string;
  pair: string;
  recipe: 'crypto_accumulator' | 'cash_accumulator' | 'combination';
  buyThresholdPct: number;
  sellThresholdPct: number;
  buyAmount: number;
  sellAmount: number;
  maxPosition?: number;
  minQuoteReserve?: number;
  isActive: boolean;
  referencePrice: number | null;
  momentumSensitivity: number;
  maxDynamicShiftPct: number;
  momentumWindowSeconds?: number;
}

export interface Signal {
  type: 'buy' | 'sell';
  price: number;
  volume: number;
}

interface PricePoint {
  price: number;
  timestamp: number;
}

export class BotInstance {
  private config: BotConfig;
  private referencePrice: number | null;
  private priceBuffer: PricePoint[] = [];
  private readonly windowMs: number;
  private pendingOrderId: string | null = null;
  private pendingSide: 'buy' | 'sell' | null = null;
  private lastPrice: number | null = null;

  constructor(config: BotConfig) {
    this.config = config;
    this.referencePrice = config.referencePrice ?? null;
    this.windowMs = (config.momentumWindowSeconds ?? 60) * 1000;
  }

  // ─── Public methods ──────────────────────────────────────────────

  setReferencePrice(price: number): void {
    this.referencePrice = price;
  }

  onPrice(price: number): Signal | null {
    this.lastPrice = price;
    const now = Date.now();

    this.priceBuffer.push({ price, timestamp: now });
    this.priceBuffer = this.priceBuffer.filter(p => now - p.timestamp <= this.windowMs);

    if (this.referencePrice === null) {
      this.referencePrice = price;
      console.log(`[${this.config.pair}] Reference price set to ${price}`);
      return null;
    }

    let momentum = 0;
    if (this.priceBuffer.length >= 2) {
      const oldest = this.priceBuffer[0];
      const latest = this.priceBuffer[this.priceBuffer.length - 1];
      if (oldest.price > 0) {
        momentum = ((latest.price - oldest.price) / oldest.price) * 100;
      }
    }

    const buyShift = Math.max(0, -momentum) * this.config.momentumSensitivity;
    const sellShift = Math.max(0, momentum) * this.config.momentumSensitivity;
    const cappedBuyShift = Math.min(this.config.maxDynamicShiftPct, buyShift);
    const cappedSellShift = Math.min(this.config.maxDynamicShiftPct, sellShift);

    const effectiveBuyThreshold = this.config.buyThresholdPct + cappedBuyShift;
    const effectiveSellThreshold = this.config.sellThresholdPct + cappedSellShift;

    const buyTriggerPrice = this.referencePrice * (1 - effectiveBuyThreshold / 100);
    const sellTriggerPrice = this.referencePrice * (1 + effectiveSellThreshold / 100);

    const pctFromRef = ((price - this.referencePrice) / this.referencePrice) * 100;

    if (cappedBuyShift > 0.01 || cappedSellShift > 0.01) {
      console.log(
        `[${this.config.pair}] 📊 Momentum: ${momentum.toFixed(2)}%, Shift: buy +${cappedBuyShift.toFixed(2)}%, sell +${cappedSellShift.toFixed(2)}%`
      );
    }

    if (this.pendingOrderId) return null;

    const recipe = this.config.recipe;

    if ((recipe === 'crypto_accumulator' || recipe === 'combination') && price <= buyTriggerPrice) {
      console.log(`[${this.config.pair}] 🔽 BUY SIGNAL! Price: ${price} (${pctFromRef.toFixed(2)}% from ref ${this.referencePrice})`);
      const volume = this.config.buyAmount / price;
      return { type: 'buy', price, volume };
    }

    if ((recipe === 'cash_accumulator' || recipe === 'combination') && price >= sellTriggerPrice) {
      console.log(`[${this.config.pair}] 🔼 SELL SIGNAL! Price: ${price} (${pctFromRef.toFixed(2)}% from ref ${this.referencePrice})`);
      const volume = this.config.sellAmount;
      return { type: 'sell', price, volume };
    }

    return null;
  }

  setPendingOrder(orderId: string, side: 'buy' | 'sell'): void {
    this.pendingOrderId = orderId;
    this.pendingSide = side;
  }

  clearPendingOrder(): void {
    this.pendingOrderId = null;
    this.pendingSide = null;
  }

  onOrderFilled(price: number): void {
    console.log(`[${this.config.pair}] Order ${this.pendingOrderId} filled at ${price}`);
    this.referencePrice = price;
    this.clearPendingOrder();
  }

  onOrderCanceled(): void {
    console.log(`[${this.config.pair}] Order ${this.pendingOrderId} canceled/expired`);
    this.clearPendingOrder();
  }

  // ─── Getters ──────────────────────────────────────────────────────
  getPendingOrderId(): string | null { return this.pendingOrderId; }
  getPendingSide(): 'buy' | 'sell' | null { return this.pendingSide; }
  getLastPrice(): number | null { return this.lastPrice; }
  getReferencePrice(): number | null { return this.referencePrice; }
  getPair(): string { return this.config.pair; }
  getConfig(): BotConfig { return this.config; }
}
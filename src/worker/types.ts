export interface BotConfig {
  id: string;
  pair: string;
  recipe: 'crypto_accum' | 'cash_accum' | 'combination';
  buyThresholdPct: number;
  sellThresholdPct: number;
  buyAmount: number;
  sellAmount: number;
  maxPosition: number | null;
  minQuoteReserve: number | null;
  isActive: boolean;
  referencePrice: number | null;
  momentumSensitivity: number;
  maxDynamicShiftPct: number;
}

export interface PriceSnapshot {
  price: number;
  buyLine: number | null;
  sellLine: number | null;
  momentum: number | null;
}
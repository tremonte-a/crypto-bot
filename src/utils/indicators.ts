// src/utils/indicators.ts

export interface AdvisorResult {
  volatility: number;
  trend: number;        // % change over the period
  rsi: number;
  recommendation: string;
  reason: string;
}

export function computeIndicators(prices: { price: number; timestamp: number }[]): AdvisorResult {
  // Need at least 20 prices for meaningful stats
  if (prices.length < 20) {
    return {
      volatility: 0,
      trend: 0,
      rsi: 50,
      recommendation: 'combination',
      reason: 'Not enough price data (need at least 20 snapshots).',
    };
  }

  // Use the last 100 prices (or all if fewer)
  const recent = prices.slice(-100);
  const pricesOnly = recent.map(p => p.price);

  // ─── Volatility (std dev of returns) ────────────────────────────────
  const returns: number[] = [];
  for (let i = 1; i < pricesOnly.length; i++) {
    returns.push((pricesOnly[i] - pricesOnly[i-1]) / pricesOnly[i-1]);
  }
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - meanReturn) ** 2, 0) / returns.length;
  const volatility = Math.sqrt(variance) * 100; // as percentage

  // ─── Trend (overall % change) ───────────────────────────────────────
  const firstPrice = pricesOnly[0];
  const lastPrice = pricesOnly[pricesOnly.length - 1];
  const trendPct = ((lastPrice - firstPrice) / firstPrice) * 100;

  // ─── RSI (14-period) ────────────────────────────────────────────────
  const period = Math.min(14, pricesOnly.length - 1);
  let gains = 0, losses = 0;
  for (let i = pricesOnly.length - period; i < pricesOnly.length - 1; i++) {
    const diff = pricesOnly[i+1] - pricesOnly[i];
    if (diff >= 0) gains += diff;
    else losses += -diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  // ─── Recommendation logic ──────────────────────────────────────────
  let recommendation = 'combination';
  let reason = '';

  if (trendPct > 1.0 && volatility < 2) {
    recommendation = 'cash_accumulator';
    reason = 'Strong uptrend with low volatility – selling on pumps is optimal.';
  } else if (trendPct < -1.0 && volatility < 2) {
    recommendation = 'crypto_accumulator';
    reason = 'Downtrend with low volatility – buying dips is optimal.';
  } else if (Math.abs(trendPct) < 0.5 && volatility < 2) {
    recommendation = 'combination';
    reason = 'Sideways market with low volatility – both buy and sell signals work well.';
  } else if (rsi > 70) {
    recommendation = 'cash_accumulator';
    reason = 'RSI indicates overbought – selling on pumps is suggested.';
  } else if (rsi < 30) {
    recommendation = 'crypto_accumulator';
    reason = 'RSI indicates oversold – buying dips is suggested.';
  } else if (volatility > 5) {
    recommendation = 'combination';
    reason = 'High volatility – combining buy and sell signals can capture both sides.';
  } else {
    recommendation = 'combination';
    reason = 'Balanced conditions – combination recipe is a safe default.';
  }

  return {
    volatility,
    trend: trendPct,
    rsi,
    recommendation,
    reason,
  };
}
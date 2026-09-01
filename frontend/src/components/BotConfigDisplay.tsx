import React from 'react';

interface Bot {
  id: string;
  pair: string;
  recipe: string;
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

const BotConfigDisplay: React.FC<{ bot: Bot }> = ({ bot }) => {
  const getRecipeLabel = (recipe: string) => {
    const map: Record<string, string> = {
      crypto_accumulator: 'Crypto Accumulator',
      cash_accumulator: 'Cash Accumulator',
      combination: 'Combination',
    };
    return map[recipe] || recipe;
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-gray-500">Pair:</span> {bot.pair}
        </div>
        <div>
          <span className="text-gray-500">Recipe:</span> {getRecipeLabel(bot.recipe)}
        </div>
        <div>
          <span className="text-gray-500">Buy Threshold:</span> {bot.buyThresholdPct}%
        </div>
        <div>
          <span className="text-gray-500">Sell Threshold:</span> {bot.sellThresholdPct}%
        </div>
        <div>
          <span className="text-gray-500">Buy Amount:</span> {bot.buyAmount} (quote)
        </div>
        <div>
          <span className="text-gray-500">Sell Amount:</span> {bot.sellAmount} (base)
        </div>
        <div>
          <span className="text-gray-500">Momentum Sensitivity:</span> {bot.momentumSensitivity}
        </div>
        <div>
          <span className="text-gray-500">Max Dynamic Shift:</span> {bot.maxDynamicShiftPct}%
        </div>
        <div>
          <span className="text-gray-500">Reference Price:</span> {bot.referencePrice ? bot.referencePrice.toFixed(2) : '—'}
        </div>
        <div>
          <span className="text-gray-500">Status:</span> {bot.isActive ? '🟢 Active' : '🔴 Inactive'}
        </div>
      </div>
    </div>
  );
};

export default BotConfigDisplay;
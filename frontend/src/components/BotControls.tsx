import React from 'react';

interface Bot {
  id: string;
  pair: string;
  isActive: boolean;
  referencePrice: number | null;
}

const BotControls: React.FC<{ bot: Bot; onUpdate: (id: string, data: any) => void }> = ({ bot, onUpdate }) => {
  const toggleActive = () => {
    console.log('[BotControls] Toggling active to:', !bot.isActive);
    onUpdate(bot.id, { isActive: !bot.isActive });
  };

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <button
        onClick={toggleActive}
        className={`px-4 py-2 rounded text-white ${bot.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
      >
        {bot.isActive ? '⏹ Stop Bot' : '▶ Start Bot'}
      </button>
      <span className="text-sm text-gray-600">
        Status: {bot.isActive ? '🟢 Active' : '🔴 Inactive'}
      </span>
      <span className="text-sm text-gray-600">
        Reference Price: {bot.referencePrice ? bot.referencePrice.toFixed(2) : '—'}
      </span>
    </div>
  );
};

export default BotControls;
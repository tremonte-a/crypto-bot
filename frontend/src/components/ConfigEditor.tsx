import React, { useState } from 'react';

interface Bot {
  id: string;
  buyThresholdPct: number;
  sellThresholdPct: number;
  buyAmount: number;
  sellAmount: number;
  momentumSensitivity: number;
  maxDynamicShiftPct: number;
}

const ConfigEditor: React.FC<{ bot: Bot; onUpdate: (id: string, data: any) => void }> = ({ bot, onUpdate }) => {
  const [form, setForm] = useState({
    buyThresholdPct: bot.buyThresholdPct,
    sellThresholdPct: bot.sellThresholdPct,
    buyAmount: bot.buyAmount,
    sellAmount: bot.sellAmount,
    momentumSensitivity: bot.momentumSensitivity,
    maxDynamicShiftPct: bot.maxDynamicShiftPct,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(bot.id, form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium">Buy Threshold %</label>
        <input
          type="number"
          name="buyThresholdPct"
          value={form.buyThresholdPct}
          onChange={handleChange}
          step="0.1"
          className="w-full border rounded px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Sell Threshold %</label>
        <input
          type="number"
          name="sellThresholdPct"
          value={form.sellThresholdPct}
          onChange={handleChange}
          step="0.1"
          className="w-full border rounded px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Buy Amount (quote)</label>
        <input
          type="number"
          name="buyAmount"
          value={form.buyAmount}
          onChange={handleChange}
          step="1"
          className="w-full border rounded px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Sell Amount (base)</label>
        <input
          type="number"
          name="sellAmount"
          value={form.sellAmount}
          onChange={handleChange}
          step="0.0001"
          className="w-full border rounded px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Momentum Sensitivity</label>
        <input
          type="number"
          name="momentumSensitivity"
          value={form.momentumSensitivity}
          onChange={handleChange}
          step="0.1"
          min="0"
          max="1"
          className="w-full border rounded px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Max Dynamic Shift %</label>
        <input
          type="number"
          name="maxDynamicShiftPct"
          value={form.maxDynamicShiftPct}
          onChange={handleChange}
          step="0.5"
          className="w-full border rounded px-2 py-1 text-sm"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        Update Config
      </button>
    </form>
  );
};

export default ConfigEditor;
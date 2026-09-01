import React, { useState } from 'react';
import { api } from '../api/client';

interface Props {
  onClose: () => void;
  onCreated: () => void; // refresh the bot list
}

const CreateBotModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    pair: 'ADA/USD',
    recipe: 'combination',
    buyThresholdPct: 2.0,
    sellThresholdPct: 2.5,
    buyAmount: 10,
    sellAmount: 28,
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.createBot(form);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create bot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">🤖 Create New Bot</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Pair</label>
            <input
              type="text"
              name="pair"
              value={form.pair}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="e.g. ADA/USD"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Recipe</label>
            <select
              name="recipe"
              value={form.recipe}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="crypto_accumulator">Crypto Accumulator</option>
              <option value="cash_accumulator">Cash Accumulator</option>
              <option value="combination">Combination</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div>
            <label className="block text-sm font-medium">Activate bot immediately</label>
            <select
              name="isActive"
              value={form.isActive ? 'true' : 'false'}
              onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Bot'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateBotModal;
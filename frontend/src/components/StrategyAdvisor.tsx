import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

interface AdvisorResult {
  volatility: number;
  trend: number;
  rsi: number;
  recommendation: string;
  reason: string;
}

interface Props {
  botId: string;
  onClose: () => void;
}

const StrategyAdvisor: React.FC<Props> = ({ botId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdvisorResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdvisor = async () => {
      try {
        const res = await api.getAdvisor(botId);
        setData(res.data);
      } catch (err: any) {
        // Handle 400 error specifically – not enough data
        if (err.response?.status === 400) {
          setError('Not enough price data yet. Let the bot run for a few minutes to collect data.');
        } else {
          setError(err.response?.data?.error || 'Failed to load advisor data.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAdvisor();
  }, [botId]);

  const getRecipeLabel = (recipe: string) => {
    const map: Record<string, string> = {
      crypto_accumulator: 'Crypto Accumulator',
      cash_accumulator: 'Cash Accumulator',
      combination: 'Combination',
    };
    return map[recipe] || recipe;
  };

  if (loading) return <div className="p-4 text-center">Loading advisor data...</div>;
  if (error) return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">📊 Strategy Advisor</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
        </div>
        <div className="text-red-600">{error}</div>
        <button onClick={onClose} className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
          Close
        </button>
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">📊 Strategy Advisor</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Recommended Recipe</p>
            <p className="text-xl font-bold text-blue-700">{getRecipeLabel(data.recommendation)}</p>
            <p className="text-sm text-gray-700 mt-1">{data.reason}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded text-center">
              <p className="text-xs text-gray-500">Volatility (Daily)</p>
              <p className="text-lg font-semibold">{data.volatility.toFixed(2)}%</p>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <p className="text-xs text-gray-500">Trend (Daily)</p>
              <p className="text-lg font-semibold">{data.trend.toFixed(2)}%</p>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <p className="text-xs text-gray-500">RSI (14-day)</p>
              <p className="text-lg font-semibold">{data.rsi.toFixed(1)}</p>
            </div>
          </div>

          <div className="text-xs text-gray-400 mt-2">
            Analysis based on last {data.volatility !== 0 ? 'available' : 'insufficient'} price data.
            {data.volatility === 0 && ' Add more price history for better recommendations.'}
          </div>

          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StrategyAdvisor;
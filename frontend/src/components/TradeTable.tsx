import React from 'react';

interface Trade {
  id: string;
  side: string;
  price: number | null;
  volume: number | null;
  quoteVolume: number | null;
  pnl: number | null;
  createdAt: string;
}

const TradeTable: React.FC<{ trades: Trade[] }> = ({ trades }) => {
  // Ensure trades is always an array
  const safeTrades = trades || [];

  if (safeTrades.length === 0) {
    return <p className="text-gray-500">No trades yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Side</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PnL</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {safeTrades.map((trade) => (
            <tr key={trade.id}>
              <td className={`px-6 py-4 whitespace-nowrap ${trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                {trade.side?.toUpperCase() || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {trade.price !== null && trade.price !== undefined ? trade.price.toFixed(2) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {trade.volume !== null && trade.volume !== undefined ? trade.volume.toFixed(8) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {trade.quoteVolume !== null && trade.quoteVolume !== undefined ? trade.quoteVolume.toFixed(2) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {trade.pnl !== null && trade.pnl !== undefined ? trade.pnl.toFixed(2) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {trade.createdAt ? new Date(trade.createdAt).toLocaleString() : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TradeTable;
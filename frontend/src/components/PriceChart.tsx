import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface PriceChartProps {
  priceHistory: { price: number; timestamp: number }[];
  latestPrice: number | null;
  referencePrice: number | null;
  buyThresholdPct: number;
  sellThresholdPct: number;
}

// ─── Timezone formatter (EST) ────────────────────────────────────
const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: '2-digit',
});

const fullFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const formatTimeEST = (timestamp: number): string => timeFormatter.format(timestamp);
const formatDateEST = (timestamp: number): string => dateFormatter.format(timestamp);
const formatFullEST = (timestamp: number): string => fullFormatter.format(timestamp);

const PriceChart: React.FC<PriceChartProps> = ({
  priceHistory,
  latestPrice,
  referencePrice,
  buyThresholdPct,
  sellThresholdPct,
}) => {
  if (!referencePrice) {
    return <div className="text-center text-gray-500 py-8">⏳ Waiting for reference price...</div>;
  }

  if (priceHistory.length === 0) {
    return <div className="text-center text-gray-500 py-8">📉 No price data yet</div>;
  }

  // ─── Convert price to number and filter out invalid values ──────
  const data = priceHistory
    .map(p => ({
      time: p.timestamp,
      price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
    }))
    .filter(p => !isNaN(p.price) && p.price > 0);

  if (data.length === 0) {
    return <div className="text-center text-gray-500 py-8">📉 No valid price data</div>;
  }

  const buyTrigger = referencePrice * (1 - buyThresholdPct / 100);
  const sellTrigger = referencePrice * (1 + sellThresholdPct / 100);

  // ─── Compute Y‑axis domain ──────────────────────────────────────
  const allPrices = data.map(d => d.price);
  const minPrice = Math.min(...allPrices, buyTrigger, sellTrigger);
  const maxPrice = Math.max(...allPrices, buyTrigger, sellTrigger);
  const padding = (maxPrice - minPrice) * 0.05 || 0.001;
  const yMin = minPrice - padding;
  const yMax = maxPrice + padding;

  // ─── Y‑axis tick formatter (handles small numbers) ────────────
  const yTickFormatter = (value: number) => {
    if (value === 0) return '0';
    if (value < 0.001) return value.toExponential(2);
    if (value < 1) return value.toFixed(4);
    if (value < 10) return value.toFixed(3);
    if (value < 1000) return value.toFixed(2);
    return value.toFixed(0);
  };

  // ─── X‑axis tick: show date when day changes ──────────────────
  let lastDate = '';
  const xTickFormatter = (timestamp: number) => {
    const dateStr = formatDateEST(timestamp);
    const timeStr = formatTimeEST(timestamp);
    if (dateStr !== lastDate) {
      lastDate = dateStr;
      return `${dateStr} ${timeStr}`;
    }
    return timeStr;
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tickFormatter={xTickFormatter}
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={yTickFormatter}
            tick={{ fontSize: 11 }}
            width={70}
          />
          <Tooltip
            labelFormatter={(label) => formatFullEST(label as number)}
            formatter={(value: any) => {
              if (typeof value === 'number') return value.toFixed(6);
              return value;
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="price" stroke="#3b82f6" dot={false} name="Price" />
          <ReferenceLine y={buyTrigger} stroke="#ef4444" strokeDasharray="3 3" label="Buy" />
          <ReferenceLine y={sellTrigger} stroke="#22c55e" strokeDasharray="3 3" label="Sell" />
          {latestPrice && (
            <ReferenceLine y={latestPrice} stroke="#f59e0b" strokeDasharray="5 5" label="Current" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;
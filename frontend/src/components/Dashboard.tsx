import React, { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { api } from '../api/client';
import PriceChart from './PriceChart';
import TradeTable from './TradeTable';
import BotControls from './BotControls';
import ConfigEditor from './ConfigEditor';
import StrategyAdvisor from './StrategyAdvisor';
import BotConfigDisplay from './BotConfigDisplay';
import CreateBotModal from './CreateBotModal';
import LoginModal from './LoginModal';

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

interface StatusData {
  currentPrice: number;
  momentum: number;
  buyShift: number;
  sellShift: number;
  effectiveBuyThreshold: number;
  effectiveSellThreshold: number;
  buyTriggerPrice: number;
  sellTriggerPrice: number;
}

interface StatsData {
  totalTrades: number;
  buys: number;
  sells: number;
  winningSells: number;
  winRate: number;
  totalPnl: number;
  totalVolume: number;
}

// ─── Helper: filter balances for a specific pair ────────────────
function filterBalancesForPair(balances: any, pair: string): any {
  if (!balances || typeof balances !== 'object') return {};
  const [base, quote] = pair.split('/');
  const quoteMap: Record<string, string> = {
    'USD': 'ZUSD',
    'EUR': 'ZEUR',
    'GBP': 'ZGBP',
    'AUD': 'ZAUD',
    'JPY': 'ZJPY',
    'CAD': 'ZCAD',
    'CHF': 'CHF',
  };
  const quoteAsset = quoteMap[quote] || quote;
  const filtered: any = {};
  if (balances[base] !== undefined) filtered[base] = balances[base];
  if (balances[quoteAsset] !== undefined) filtered[quoteAsset] = balances[quoteAsset];
  return filtered;
}

const Dashboard: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [priceSnapshots, setPriceSnapshots] = useState<any[]>([]);
  const [balances, setBalances] = useState<any>(null);
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ─── Auth state ──────────────────────────────────────────────────
  const [token, setToken] = useState<string | null>(localStorage.getItem('adminToken'));
  const [showLogin, setShowLogin] = useState(!token);
  const isAdmin = !!token;

  // ─── Status & Stats state ──────────────────────────────────────
  const [status, setStatus] = useState<StatusData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);

  const { latestPrice, priceHistory } = useSocket(selectedBotId);
  const selectedBot = bots.find(b => b.id === selectedBotId);

  // ─── Filtered balances ──────────────────────────────────────────
  const filteredBalances = selectedBot && balances
    ? filterBalancesForPair(balances, selectedBot.pair)
    : {};

  // ─── Map snake_case → camelCase ──────────────────────────────
  const mapBot = (bot: any): Bot => ({
    id: bot.id,
    pair: bot.pair,
    recipe: bot.recipe,
    buyThresholdPct: bot.buy_threshold_pct,
    sellThresholdPct: bot.sell_threshold_pct,
    buyAmount: bot.buy_amount,
    sellAmount: bot.sell_amount,
    maxPosition: bot.max_position,
    minQuoteReserve: bot.min_quote_reserve,
    isActive: bot.is_active,
    referencePrice: bot.reference_price,
    momentumSensitivity: bot.momentum_sensitivity,
    maxDynamicShiftPct: bot.max_dynamic_shift_pct,
  });

  const fetchBots = async () => {
    try {
      const res = await api.getBots();
      const mapped = res.data.map(mapBot);
      setBots(mapped);
      if (mapped.length > 0 && !selectedBotId) {
        setSelectedBotId(mapped[0].id);
      }
    } catch (err) {
      console.error('[Dashboard] Failed to fetch bots:', err);
    }
  };

  const fetchTrades = async (botId: string) => {
    try {
      const res = await api.getTrades(botId);
      setTrades(res.data);
    } catch (err) {
      console.error('[Dashboard] Failed to fetch trades:', err);
    }
  };

  const fetchPriceSnapshots = async (botId: string) => {
    try {
      const res = await api.getPriceSnapshots(botId, 200);
      setPriceSnapshots(res.data);
    } catch (err) {
      console.error('[Dashboard] Failed to fetch price snapshots:', err);
    }
  };

  const fetchBalances = async (botId: string) => {
    try {
      const res = await api.getBalanceSnapshots(botId);
      if (res.data && res.data.length > 0) {
        const snap = res.data[0];
        let balancesData = snap.balances;
        if (typeof balancesData === 'string') {
          try {
            balancesData = JSON.parse(balancesData);
          } catch (e) {
            balancesData = null;
          }
        }
        if (balancesData && typeof balancesData === 'object' && !Array.isArray(balancesData)) {
          setBalances(balancesData);
        } else {
          setBalances(null);
        }
      } else {
        setBalances(null);
      }
    } catch (err) {
      console.error('[Dashboard] Failed to fetch balances:', err);
      setBalances(null);
    }
  };

  // ─── NEW: fetch status and stats ──────────────────────────────
  const fetchStatus = async (botId: string) => {
    try {
      const res = await api.getStatus(botId);
      setStatus(res.data);
    } catch (err) {
      console.error('[Dashboard] Failed to fetch status:', err);
      setStatus(null);
    }
  };

  const fetchStats = async (botId: string) => {
    try {
      const res = await api.getStats(botId);
      setStats(res.data);
    } catch (err) {
      console.error('[Dashboard] Failed to fetch stats:', err);
      setStats(null);
    }
  };

  // ─── Auth handlers ──────────────────────────────────────────────
  const handleLogin = (newToken: string) => {
    localStorage.setItem('adminToken', newToken);
    api.setAuthToken(newToken);
    setToken(newToken);
    setShowLogin(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    api.setAuthToken(null);
    setToken(null);
    setShowLogin(true);
  };

  // ─── Effects ──────────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      api.setAuthToken(token);
    }
    fetchBots();
  }, []);

  useEffect(() => {
    if (selectedBotId) {
      fetchTrades(selectedBotId);
      fetchPriceSnapshots(selectedBotId);
      fetchBalances(selectedBotId);
      fetchStatus(selectedBotId);
      fetchStats(selectedBotId);
    }
  }, [selectedBotId]);

  // Poll for reference price
  useEffect(() => {
    if (!selectedBot) return;
    if (selectedBot.referencePrice !== null) return;
    let count = 0;
    const maxAttempts = 20;
    const interval = setInterval(() => {
      count++;
      fetchBots();
      if (count >= maxAttempts) {
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedBot]);

  const handleSelectBot = (id: string) => setSelectedBotId(id);
  const handleUpdateBot = async (id: string, data: any) => {
    try {
      await api.updateBot(id, data);
      await fetchBots();
    } catch (err) {
      console.error('[Dashboard] Update failed:', err);
    }
  };

  // ─── Empty state ──────────────────────────────────────────────
  if (bots.length === 0) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen flex items-center justify-center relative">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">🤖 No Bots Yet</h2>
          <p className="text-gray-600 mb-4">Create your first trading bot to get started.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Create New Bot
          </button>
        </div>
        {showCreateModal && (
          <CreateBotModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              fetchBots();
              setShowCreateModal(false);
            }}
          />
        )}
        <LoginModal
          isOpen={showLogin}
          onLogin={handleLogin}
          onClose={() => setShowLogin(false)}
        />
      </div>
    );
  }

  if (!selectedBot) return <div>Loading...</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Header with admin badge and login/logout */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🤖 Crypto Trading Bot Dashboard</h1>
        <div className="flex items-center gap-4">
          {isAdmin ? (
            <span className="text-sm text-green-600 font-medium">● Admin</span>
          ) : (
            <span className="text-sm text-gray-500">👁️ View‑only</span>
          )}
          {isAdmin ? (
            <button
              onClick={handleLogout}
              className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Login
            </button>
          )}
        </div>
      </div>

      {/* Bot selector buttons */}
      <div className="mb-4 flex gap-2 flex-wrap items-center">
        {bots.map(bot => (
          <button
            key={bot.id}
            onClick={() => handleSelectBot(bot.id)}
            className={`px-4 py-2 rounded ${selectedBotId === bot.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
          >
            {bot.pair}
          </button>
        ))}
        {/* New Bot button – only for admins */}
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            + New Bot
          </button>
        )}
        <button
          onClick={() => setShowAdvisor(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          📊 Strategy Advisor
        </button>
        {isAdmin && (
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {showConfig ? 'Hide Config' : 'Show Config'}
          </button>
        )}
      </div>

      {/* Config display – only for admins */}
      {isAdmin && showConfig && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-2">⚙️ Current Configuration</h2>
          <BotConfigDisplay bot={selectedBot} />
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN – Chart + Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <PriceChart
              priceHistory={priceHistory.length > 0 ? priceHistory : priceSnapshots.map(s => ({ price: s.price, timestamp: new Date(s.timestamp).getTime() }))}
              latestPrice={latestPrice}
              referencePrice={selectedBot.referencePrice}
              buyThresholdPct={selectedBot.buyThresholdPct}
              sellThresholdPct={selectedBot.sellThresholdPct}
            />
          </div>
          {/* BotControls – only for admins */}
          {isAdmin && (
            <div className="bg-white rounded-lg shadow p-4">
              <BotControls bot={selectedBot} onUpdate={handleUpdateBot} />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN – reordered: Balances → Config (if admin) → Status → Stats */}
        <div className="space-y-6">
          {/* 1. Balances (always visible) */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-3">💰 Balances</h2>
            {filteredBalances && typeof filteredBalances === 'object' && Object.keys(filteredBalances).length > 0 ? (
              <ul className="space-y-1">
                {Object.entries(filteredBalances).map(([asset, amount]) => (
                  <li key={asset} className="flex justify-between">
                    <span>{asset}</span>
                    <span className="font-mono">{Number(amount).toFixed(8)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No balance data yet.</p>
            )}
          </div>

          {/* 2. Config Editor (only for admins) */}
          {isAdmin && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-3">⚙️ Configuration</h2>
              <ConfigEditor bot={selectedBot} onUpdate={handleUpdateBot} />
            </div>
          )}

          {/* 3. Live Momentum (always visible) */}
          {status && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-3">📊 Live Momentum</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Price:</div>
                <div className="font-mono">{status.currentPrice?.toFixed(4)}</div>
                <div className="text-gray-600">Momentum:</div>
                <div className="font-mono">{status.momentum?.toFixed(4)}%</div>
                <div className="text-gray-600">Buy Shift:</div>
                <div className="font-mono">{status.buyShift?.toFixed(4)}</div>
                <div className="text-gray-600">Sell Shift:</div>
                <div className="font-mono">{status.sellShift?.toFixed(4)}</div>
                <div className="text-gray-600">Eff. Buy Thresh.:</div>
                <div className="font-mono">{status.effectiveBuyThreshold?.toFixed(4)}%</div>
                <div className="text-gray-600">Eff. Sell Thresh.:</div>
                <div className="font-mono">{status.effectiveSellThreshold?.toFixed(4)}%</div>
                <div className="text-gray-600">Buy Trigger:</div>
                <div className="font-mono">{status.buyTriggerPrice?.toFixed(4)}</div>
                <div className="text-gray-600">Sell Trigger:</div>
                <div className="font-mono">{status.sellTriggerPrice?.toFixed(4)}</div>
              </div>
            </div>
          )}

          {/* 4. Performance Stats (always visible) */}
          {stats && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-3">📈 Performance</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Total Trades:</div>
                <div className="font-mono">{stats.totalTrades}</div>
                <div className="text-gray-600">Buys / Sells:</div>
                <div className="font-mono">{stats.buys} / {stats.sells}</div>
                <div className="text-gray-600">Winning Sells:</div>
                <div className="font-mono">{stats.winningSells}</div>
                <div className="text-gray-600">Win Rate:</div>
                <div className="font-mono">{stats.winRate?.toFixed(2)}%</div>
                <div className="text-gray-600">Total PnL:</div>
                <div className={`font-mono ${stats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.totalPnl?.toFixed(2)}
                </div>
                <div className="text-gray-600">Volume:</div>
                <div className="font-mono">{stats.totalVolume?.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trade History */}
      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-3">📊 Trade History</h2>
        <TradeTable trades={trades} />
      </div>

      {/* Modals */}
      {showAdvisor && selectedBot && (
        <StrategyAdvisor botId={selectedBot.id} onClose={() => setShowAdvisor(false)} />
      )}

      {showCreateModal && (
        <CreateBotModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            fetchBots();
            setShowCreateModal(false);
          }}
        />
      )}

      <LoginModal
        isOpen={showLogin}
        onLogin={handleLogin}
        onClose={() => setShowLogin(false)}
      />
    </div>
  );
};

export default Dashboard;
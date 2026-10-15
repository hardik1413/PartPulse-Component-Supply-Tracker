import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  History,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { api } from '../api/client';
import { PageId } from '../components/Sidebar';

interface PriceHistoryPageProps {
  componentId?: string;
  onNavigate: (page: PageId, componentId?: string) => void;
  onRefreshSuccess: () => void;
}

export const PriceHistoryPage: React.FC<PriceHistoryPageProps> = ({
  componentId,
  onNavigate,
  onRefreshSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>(componentId || '');
  const [historyData, setHistoryData] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadComponentsList();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadHistory(selectedId);
    }
  }, [selectedId]);

  const loadComponentsList = async () => {
    try {
      setLoading(true);
      const res = await api.getComponents();
      setComponents(res.components);
      if (!selectedId && res.components.length > 0) {
        setSelectedId(res.components[0].id);
      }
    } catch (err) {
      console.error('Failed to load components:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.getComponentHistory(id);
      setHistoryData(res);
    } catch (err) {
      console.error('Failed to load component history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedId) return;
    try {
      setRefreshing(true);
      await api.refreshComponent(selectedId);
      await loadHistory(selectedId);
      onRefreshSuccess();
    } catch (err: any) {
      alert(`Refresh check failed: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !historyData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Price & Stock History</h1>
          <p className="text-sm text-slate-500">Historical snapshots and trajectory analytics</p>
        </div>
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Price & Stock History</h1>
          <p className="text-sm text-slate-500">Historical snapshots and trajectory analytics</p>
        </div>
        <EmptyState
          icon={History}
          title="No Tracked History Available"
          description="Price and inventory snapshots are automatically recorded each time you search or refresh a component. Search for a part to begin tracking."
          actionLabel="Search Components"
          onAction={() => onNavigate('search')}
        />
      </div>
    );
  }

  const { stats, component, history = [], alerts = [] } = historyData || {};

  // Format history for Recharts
  const chartPoints = history
    .filter((h: any) => h.price !== null && h.price > 0)
    .map((h: any, i: number) => ({
      index: i + 1,
      time: new Date(h.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      price: h.price,
      supplier: h.supplier,
      stock: h.stockQuantity,
    }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Price & Stock History</h1>
          <p className="text-sm text-slate-500">
            Recorded snapshots, price trend charts, and inventory transition timeline.
          </p>
        </div>

        {/* Component Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-sm font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500"
          >
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.mpn} ({c.manufacturer})
              </option>
            ))}
          </select>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Capture Snapshot'}</span>
          </button>
        </div>
      </div>

      {component && (
        <div className="space-y-6">
          {/* Component Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-bold text-slate-900">{component.mpn}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                    {component.manufacturer}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{component.name}</p>
              </div>

              {/* Price Change Pill */}
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="block text-[11px] text-slate-400 font-semibold uppercase">Current Price</span>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-xl font-bold text-slate-900">
                      {stats?.currentLowestPrice !== null ? `${stats.currentLowestPrice.toFixed(2)} ${stats.currency}` : 'Unpriced'}
                    </span>
                    {stats?.percentChange !== null && stats?.percentChange !== undefined && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded ${
                          stats.percentChange > 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : stats.percentChange < 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {stats.percentChange > 0 ? (
                          <TrendingUp className="w-3 h-3 text-rose-600" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-emerald-600" />
                        )}
                        {stats.percentChange > 0 ? `+${stats.percentChange}%` : `${stats.percentChange}%`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                <div>
                  <span className="block text-[11px] text-slate-400 font-semibold uppercase">Previous Price</span>
                  <span className="font-mono text-sm font-semibold text-slate-600">
                    {stats?.previousLowestPrice !== null
                      ? `${stats.previousLowestPrice.toFixed(2)} ${stats.currency}`
                      : 'None'}
                  </span>
                </div>

                <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                <div>
                  <span className="block text-[11px] text-slate-400 font-semibold uppercase">Stock State</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusBadge status={stats?.currentStockStatus} />
                    {stats?.previousStockStatus && stats?.previousStockStatus !== stats?.currentStockStatus && (
                      <span className="text-[10px] text-slate-400">
                        (was {stats.previousStockStatus})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Price History Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Price Trajectory Over Time</h3>
                <p className="text-xs text-slate-500">Unit prices recorded across all distributor snapshots</p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {stats?.totalSnapshots || 0} Total Snapshots
              </span>
            </div>

            {chartPoints.length < 2 ? (
              <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg p-6 text-center text-slate-400 text-xs">
                <History className="w-8 h-8 text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">Need at least two snapshots to plot trend</p>
                <p className="mt-1 max-w-sm">
                  Click "Capture Snapshot" above or refresh this component over time to build your historical price trend curve.
                </p>
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartPoints} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      stroke="#cbd5e1"
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      stroke="#cbd5e1"
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs space-y-1">
                              <div className="font-bold">{data.supplier}</div>
                              <div className="font-mono text-emerald-400 font-semibold">
                                Price: ${data.price}
                              </div>
                              {data.stock !== null && (
                                <div className="text-slate-300">
                                  Stock: {data.stock?.toLocaleString()}
                                </div>
                              )}
                              <div className="text-slate-400 text-[10px]">{data.time}</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="price"
                      name="Unit Price ($)"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ fill: '#2563eb', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Historical Snapshots Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 text-sm">Recorded Snapshots Log</h3>
              <p className="text-xs text-slate-500">Every price and stock checkpoint captured in SQLite database</p>
            </div>

            {history.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No snapshots captured yet for this component.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">Stock Status</th>
                      <th className="px-4 py-3">Available Quantity</th>
                      <th className="px-4 py-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((snap: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                          {new Date(snap.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{snap.supplier}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={snap.stockStatus} />
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {snap.stockQuantity !== null ? snap.stockQuantity.toLocaleString() : 'Not published'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {snap.price !== null ? `${snap.price.toFixed(2)} ${snap.currency}` : 'Unpriced'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  Layers,
  Store,
  TrendingDown,
  AlertOctagon,
  Search,
  ExternalLink,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { api } from '../api/client';
import { PageId } from '../components/Sidebar';

interface DashboardPageProps {
  onNavigate: (page: PageId, componentId?: string) => void;
  onRefreshSuccess: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onRefreshSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [data, setData] = useState<{
    components: any[];
    metrics: {
      trackedComponents: number;
      totalSupplierListings: number;
      priceChangesCount: number;
      shortageAlertsCount: number;
    };
  }>({
    components: [],
    metrics: {
      trackedComponents: 0,
      totalSupplierListings: 0,
      priceChangesCount: 0,
      shortageAlertsCount: 0,
    },
  });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [compRes, alertRes] = await Promise.all([
        api.getComponents(),
        api.getAlerts(false),
      ]);
      setData(compRes);
      setRecentAlerts(alertRes.alerts.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setRefreshingId(id);
      await api.refreshComponent(id);
      await fetchDashboardData();
      onRefreshSuccess();
    } catch (err: any) {
      alert(`Refresh failed: ${err.message}`);
    } finally {
      setRefreshingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Engineering Overview</h1>
          <p className="text-sm text-slate-500">Live inventory and pricing intelligence across suppliers</p>
        </div>
        <LoadingSkeleton type="card" />
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  const hasComponents = data.components.length > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Engineering Overview</h1>
          <p className="text-sm text-slate-500">
            Real-time component stock availability, price tracking, and supply disruption warnings.
          </p>
        </div>
        <button
          onClick={() => onNavigate('search')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-xs shrink-0"
        >
          <Search className="w-4 h-4" />
          <span>Search New Component</span>
        </button>
      </div>

      {/* Metrics Row (Real database values) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tracked Components"
          value={data.metrics.trackedComponents}
          icon={Layers}
          description="Components in active watchlist"
          color="blue"
        />
        <MetricCard
          title="Supplier Listings"
          value={data.metrics.totalSupplierListings}
          icon={Store}
          description="Verified distributor links found"
          color="slate"
        />
        <MetricCard
          title="Price Changes"
          value={data.metrics.priceChangesCount}
          icon={TrendingDown}
          description="Recorded price fluctuations"
          color="amber"
        />
        <MetricCard
          title="Shortage Alerts"
          value={data.metrics.shortageAlertsCount}
          icon={AlertOctagon}
          description="Out-of-stock or high spike flags"
          color={data.metrics.shortageAlertsCount > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Main Content Area */}
      {!hasComponents ? (
        <EmptyState
          icon={Layers}
          title="No Tracked Components Yet"
          description="Search for electronic components such as microcontrollers, sensors, or power ICs via TinyFish to compare distributors and start tracking price and stock changes."
          actionLabel="Search Component"
          onAction={() => onNavigate('search')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recently Tracked Components (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Recently Tracked Components</h3>
                <p className="text-xs text-slate-500">Click any component to view historical price trajectory</p>
              </div>
              <button
                onClick={() => onNavigate('tracked')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                View all ({data.components.length})
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">MPN & Part</th>
                    <th className="px-4 py-3">Manufacturer</th>
                    <th className="px-4 py-3">Stock Status</th>
                    <th className="px-4 py-3 text-right">Lowest Price</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.components.slice(0, 6).map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => onNavigate('history', c.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-slate-900">{c.mpn}</div>
                        <div className="text-slate-500 truncate max-w-[200px]">{c.name}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{c.manufacturer}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={c.stockStatus} />
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900">
                        {c.lowestPrice !== null ? `${c.lowestPrice.toFixed(2)} ${c.currency}` : 'Unpriced'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => handleRefresh(e, c.id)}
                          disabled={refreshingId === c.id}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                          title="Run fresh check"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === c.id ? 'animate-spin text-blue-600' : ''}`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Alerts Feed (1 Col) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Recent Supply Alerts</h3>
                <p className="text-xs text-slate-500">Shortage & price volatility</p>
              </div>
              <button
                onClick={() => onNavigate('alerts')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                View all
              </button>
            </div>

            <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[380px]">
              {recentAlerts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No alerts recorded yet. Price shifts or stock depletions will appear here.
                </div>
              ) : (
                recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <StatusBadge alertType={alert.type} />
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-700 font-medium leading-relaxed">{alert.message}</p>
                    {alert.component && (
                      <div className="font-mono text-[11px] text-blue-600 font-semibold">
                        {alert.component.mpn}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  BookmarkCheck,
  Search,
  RefreshCw,
  Trash2,
  History,
  Scale,
  ExternalLink,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { api } from '../api/client';
import { PageId } from '../components/Sidebar';

interface TrackedComponentsPageProps {
  onNavigate: (page: PageId, componentId?: string) => void;
  onRefreshSuccess: () => void;
}

export const TrackedComponentsPage: React.FC<TrackedComponentsPageProps> = ({
  onNavigate,
  onRefreshSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState<any[]>([]);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTracked();
  }, []);

  const loadTracked = async () => {
    try {
      setLoading(true);
      const res = await api.getComponents();
      setComponents(res.components);
    } catch (err) {
      console.error('Failed to load tracked components:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setRefreshingId(id);
      await api.refreshComponent(id);
      await loadTracked();
      onRefreshSuccess();
    } catch (err: any) {
      alert(`Refresh failed: ${err.message}`);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, mpn: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to stop tracking ${mpn}?`)) return;

    try {
      await api.deleteComponent(id);
      await loadTracked();
      onRefreshSuccess();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const filtered = components.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.mpn.toLowerCase().includes(term) ||
      c.name.toLowerCase().includes(term) ||
      c.manufacturer.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tracked Components Watchlist</h1>
          <p className="text-sm text-slate-500">Live monitoring of component stock levels and distributor pricing</p>
        </div>
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tracked Components Watchlist</h1>
          <p className="text-sm text-slate-500">
            Components actively checked across distributors. Trigger fresh checks or view price history snapshots.
          </p>
        </div>
        <button
          onClick={() => onNavigate('search')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Component</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by MPN, part name, or manufacturer..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total Tracked: <span className="font-bold text-slate-900">{components.length}</span>
        </div>
      </div>

      {components.length === 0 ? (
        <EmptyState
          icon={BookmarkCheck}
          title="Watchlist is Empty"
          description="You are not tracking any components yet. Use the Component Search to discover distributor listings and save components to your watchlist."
          actionLabel="Search Components"
          onAction={() => onNavigate('search')}
        />
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
          No components match your filter "{searchTerm}".
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">MPN & Part Details</th>
                  <th className="px-4 py-3">Manufacturer</th>
                  <th className="px-4 py-3">Overall Stock</th>
                  <th className="px-4 py-3 text-right">Lowest Price</th>
                  <th className="px-4 py-3">Distributors</th>
                  <th className="px-4 py-3">Last Checked</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onNavigate('history', item.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    {/* MPN */}
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-slate-900 text-sm">{item.mpn}</div>
                      <div className="text-slate-500 truncate max-w-[240px]" title={item.name}>
                        {item.name}
                      </div>
                    </td>

                    {/* Manufacturer */}
                    <td className="px-4 py-3.5 text-slate-700 font-medium">{item.manufacturer}</td>

                    {/* Stock status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={item.stockStatus} />
                    </td>

                    {/* Lowest price */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      {item.lowestPrice !== null ? `${item.lowestPrice.toFixed(2)} ${item.currency}` : 'Unpriced'}
                    </td>

                    {/* Distributors count */}
                    <td className="px-4 py-3.5 text-slate-600 font-mono">
                      {item.supplierCount} supplier(s)
                    </td>

                    {/* Last checked */}
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      {new Date(item.lastCheckedAt).toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Refresh */}
                        <button
                          onClick={(e) => handleRefresh(e, item.id)}
                          disabled={refreshingId === item.id}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                          title="Run fresh check now"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${refreshingId === item.id ? 'animate-spin text-blue-600' : ''}`}
                          />
                        </button>

                        {/* View History */}
                        <button
                          onClick={() => onNavigate('history', item.id)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                          title="View price history and snapshots"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        {/* Compare suppliers */}
                        <button
                          onClick={() => onNavigate('comparison', item.id)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                          title="Open supplier comparison matrix"
                        >
                          <Scale className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={(e) => handleDelete(e, item.id, item.mpn)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Remove from tracking"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

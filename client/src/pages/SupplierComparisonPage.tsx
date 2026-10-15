import React, { useState, useEffect } from 'react';
import { Scale, ArrowUpDown, Filter, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { api } from '../api/client';
import { PageId } from '../components/Sidebar';

interface SupplierComparisonPageProps {
  onNavigate: (page: PageId, componentId?: string) => void;
  selectedComponentId?: string;
}

export const SupplierComparisonPage: React.FC<SupplierComparisonPageProps> = ({
  onNavigate,
  selectedComponentId,
}) => {
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState<any[]>([]);
  const [activeComponentId, setActiveComponentId] = useState<string>(selectedComponentId || '');
  const [activeComponent, setActiveComponent] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'stock'>('price_asc');
  const [stockOnly, setStockOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTrackedComponents();
  }, []);

  useEffect(() => {
    if (activeComponentId) {
      loadComponentDetails(activeComponentId);
    }
  }, [activeComponentId]);

  const loadTrackedComponents = async () => {
    try {
      setLoading(true);
      const res = await api.getComponents();
      setComponents(res.components);
      if (!activeComponentId && res.components.length > 0) {
        setActiveComponentId(res.components[0].id);
      }
    } catch (err) {
      console.error('Failed to load tracked components:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadComponentDetails = async (id: string) => {
    try {
      const res = await api.getComponent(id);
      setActiveComponent(res.component);
    } catch (err) {
      console.error('Failed to load component details:', err);
    }
  };

  const handleRefresh = async () => {
    if (!activeComponentId) return;
    try {
      setRefreshing(true);
      await api.refreshComponent(activeComponentId);
      await loadComponentDetails(activeComponentId);
    } catch (err: any) {
      alert(`Refresh failed: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Supplier Comparison Matrix</h1>
          <p className="text-sm text-slate-500">Cross-distributor unit pricing and inventory availability</p>
        </div>
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Supplier Comparison Matrix</h1>
          <p className="text-sm text-slate-500">Cross-distributor unit pricing and inventory availability</p>
        </div>
        <EmptyState
          icon={Scale}
          title="No Tracked Components Available"
          description="To compare suppliers side-by-side, search for a component and save it to your tracked watchlist."
          actionLabel="Search Components"
          onAction={() => onNavigate('search')}
        />
      </div>
    );
  }

  const rawListings = activeComponent?.listings || [];

  // Filter & sort
  const filteredListings = rawListings
    .filter((l: any) => {
      if (stockOnly) {
        return l.stockStatus === 'IN_STOCK' || l.stockStatus === 'LIMITED_STOCK';
      }
      return true;
    })
    .sort((a: any, b: any) => {
      if (sortBy === 'price_asc') {
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return a.price - b.price;
      }
      if (sortBy === 'price_desc') {
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return b.price - a.price;
      }
      if (sortBy === 'stock') {
        return (b.stockQuantity || 0) - (a.stockQuantity || 0);
      }
      return 0;
    });

  // Find lowest price
  const prices = filteredListings.map((l: any) => l.price).filter((p: any) => p !== null && p > 0);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Supplier Comparison Matrix</h1>
          <p className="text-sm text-slate-500">
            Compare verified prices, lead times, and inventory depth across major distributors.
          </p>
        </div>

        {/* Component Selector */}
        <div className="flex items-center gap-3">
          <select
            value={activeComponentId}
            onChange={(e) => setActiveComponentId(e.target.value)}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-sm font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500"
          >
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.mpn} — {c.manufacturer}
              </option>
            ))}
          </select>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            title="Refresh current component suppliers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Re-check'}</span>
          </button>
        </div>
      </div>

      {activeComponent && (
        <div className="space-y-6">
          {/* Component Banner */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-slate-900">{activeComponent.mpn}</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
                  {activeComponent.manufacturer}
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xl">{activeComponent.name}</p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="text-right">
                <span className="block text-[10px] text-slate-400 uppercase font-sans font-semibold">Lowest Price</span>
                <span className="text-base font-bold text-emerald-600">
                  {lowestPrice !== null ? `${lowestPrice.toFixed(2)} USD` : 'Unpriced'}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-right">
                <span className="block text-[10px] text-slate-400 uppercase font-sans font-semibold">Suppliers</span>
                <span className="text-base font-bold text-slate-800">{rawListings.length}</span>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-100/70 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={stockOnly}
                  onChange={(e) => setStockOnly(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>In-Stock Only</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700"
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="stock">Stock Quantity</option>
              </select>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Supplier Name</th>
                    <th className="px-4 py-3">Stock Status</th>
                    <th className="px-4 py-3">Stock Quantity</th>
                    <th className="px-4 py-3">Lead Time</th>
                    <th className="px-4 py-3">Verification</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-center">Supplier Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredListings.map((item: any) => {
                    const isLowest = item.price !== null && item.price === lowestPrice;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isLowest ? 'bg-emerald-50/50 hover:bg-emerald-50/80 font-medium' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            {item.supplierName}
                            {isLowest && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Lowest Price
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={item.stockStatus} />
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-700">
                          {item.stockQuantity !== null ? item.stockQuantity.toLocaleString() : 'Not published'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {item.leadTime || 'Not published'}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge verification={item.verificationStatus} />
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono">
                          {item.price !== null ? (
                            <span
                              className={`text-sm font-bold ${
                                isLowest ? 'text-emerald-700' : 'text-slate-900'
                              }`}
                            >
                              {item.price.toFixed(2)} {item.currency}
                            </span>
                          ) : (
                            <span className="text-slate-400">Not published</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <a
                            href={item.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

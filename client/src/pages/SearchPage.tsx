import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  BookmarkPlus,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Info,
  Clock,
  Layers,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../api/client';
import { SearchComponentResponse, SearchResultItem } from '../../../shared/types';
import { PageId } from '../components/Sidebar';

interface SearchPageProps {
  onNavigate: (page: PageId, componentId?: string) => void;
  onTrackSuccess: () => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ onNavigate, onTrackSuccess }) => {
  const [query, setQuery] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [technicalRequirement, setTechnicalRequirement] = useState('');
  const [maxSuppliers, setMaxSuppliers] = useState(5);
  const [useAgentFallback, setUseAgentFallback] = useState(false);

  const [loading, setLoading] = useState(false);
  const [searchStage, setSearchStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] = useState<SearchComponentResponse | null>(null);

  // Sorting and filtering
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'supplier'>('price_asc');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'verified_only'>('all');
  const [savingToWatchlist, setSavingToWatchlist] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Quick suggestions for hardware robotics & electronics engineers
  const suggestions = [
    { label: 'ESP32-WROOM-32', mfg: 'Espressif', spec: 'Wi-Fi BLE Module' },
    { label: 'BNO055', mfg: 'Bosch', spec: '9-DOF IMU Sensor' },
    { label: 'STM32F401RET6', mfg: 'STMicroelectronics', spec: 'ARM Cortex-M4' },
    { label: 'DRV8825', mfg: 'Texas Instruments', spec: 'Stepper Motor Driver' },
    { label: 'LM2596S-5.0', mfg: 'Texas Instruments', spec: 'Step-Down Regulator' },
  ];

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setSavedSuccess(false);

      setSearchStage('Querying TinyFish Search for supplier listings...');
      await new Promise((r) => setTimeout(r, 400));

      setSearchStage('Fetching live distributor pages & verifying inventory...');
      const response = await api.searchComponents({
        query: query.trim(),
        manufacturer: manufacturer.trim() || undefined,
        technicalRequirement: technicalRequirement.trim() || undefined,
        maxSuppliers,
        useAgentFallback,
        saveToDatabase: false,
      });

      setSearchResponse(response);
    } catch (err: any) {
      setError(err.message || 'Component search failed');
    } finally {
      setLoading(false);
      setSearchStage('');
    }
  };

  const handleSaveToWatchlist = async () => {
    if (!searchResponse || searchResponse.results.length === 0) return;

    try {
      setSavingToWatchlist(true);
      // Run search with saveToDatabase: true to persist component, listings, and initial snapshot
      const res = await api.searchComponents({
        query: searchResponse.searchedMpn,
        manufacturer: manufacturer.trim() || searchResponse.results[0]?.manufacturer,
        maxSuppliers,
        saveToDatabase: true,
      });

      setSavedSuccess(true);
      onTrackSuccess();
      if (res.componentId) {
        // Option to view in tracked watchlist
      }
    } catch (err: any) {
      alert(`Failed to save to watchlist: ${err.message}`);
    } finally {
      setSavingToWatchlist(false);
    }
  };

  // Filter and sort listings
  const filterAndSort = (items: SearchResultItem[]) => {
    return items
      .filter((item) => {
        if (stockFilter === 'in_stock') {
          return item.stockStatus === 'IN_STOCK' || item.stockStatus === 'LIMITED_STOCK';
        }
        if (stockFilter === 'verified_only') {
          return item.verificationStatus === 'VERIFIED';
        }
        return true;
      })
      .sort((a, b) => {
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
        if (sortBy === 'supplier') {
          return a.supplier.localeCompare(b.supplier);
        }
        return 0;
      });
  };

  const processedResults = searchResponse ? filterAndSort(searchResponse.results) : [];
  const processedSubstitutes = searchResponse ? filterAndSort(searchResponse.substitutes) : [];

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Component Search & Compare</h1>
        <p className="text-sm text-slate-500">
          Targeted real-time supplier discovery via TinyFish Search & Fetch APIs.
        </p>
      </div>

      {/* Search Form Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Component MPN or Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. ESP32-WROOM-32D"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Manufacturer (Optional)
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Espressif Systems"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Technical Requirement (Optional)
              </label>
              <input
                type="text"
                value={technicalRequirement}
                onChange={(e) => setTechnicalRequirement(e.target.value)}
                placeholder="e.g. 3.3V SMD I2C"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
              />
            </div>
          </div>

          {/* Advanced toggle & controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-6 text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useAgentFallback}
                  onChange={(e) => setUseAgentFallback(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Enable Agent Fallback for JS-heavy supplier listings</span>
              </label>

              <div className="flex items-center gap-2">
                <span>Distributor depth:</span>
                <select
                  value={maxSuppliers}
                  onChange={(e) => setMaxSuppliers(Number(e.target.value))}
                  className="px-2 py-1 rounded border border-slate-200 text-xs font-medium"
                >
                  <option value={3}>Top 3</option>
                  <option value={5}>Top 5 (Recommended)</option>
                  <option value={8}>Top 8</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-xs"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Searching TinyFish...' : 'Discover & Compare'}</span>
            </button>
          </div>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Quick samples:
          </span>
          {suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setQuery(s.label);
                setManufacturer(s.mfg);
                setTechnicalRequirement(s.spec);
              }}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-mono text-[11px] border border-slate-200 transition-colors"
            >
              {s.label} ({s.mfg})
            </button>
          ))}
        </div>
      </div>

      {/* Loading Progress */}
      {loading && (
        <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center gap-3 animate-pulse">
          <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <div>
            <div className="text-sm font-semibold text-blue-900">{searchStage}</div>
            <div className="text-xs text-blue-700">Connecting to TinyFish API Gateway (api.search.tinyfish.ai & api.fetch.tinyfish.ai)...</div>
          </div>
        </div>
      )}

      {/* Error Message Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Search Request Notice</div>
            <div className="mt-0.5 leading-relaxed">{error}</div>
            {error.includes('TINYFISH_API_KEY') && (
              <div className="mt-2 text-xs text-rose-700 font-mono bg-rose-100/60 p-2 rounded">
                Please add your TinyFish API Key to the backend <code>.env</code> file:
                <br />
                <code>TINYFISH_API_KEY=your_key_here</code>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Results Display */}
      {searchResponse && (
        <div className="space-y-6">
          {/* Header Bar with Stats and Watchlist Action */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Search Results For</span>
                <span className="font-mono font-bold text-slate-900 text-base">{searchResponse.searchedMpn}</span>
                <span className="text-xs text-slate-500 font-mono">
                  (Normalized: {searchResponse.normalizedMpn})
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{processedResults.length} direct supplier listings</span>
                <span>•</span>
                <span>Method: {searchResponse.tinyFishMethodUsed}</span>
                <span>•</span>
                <span>Time: {searchResponse.executionTimeMs}ms</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {savedSuccess ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Saved to Watchlist!
                </span>
              ) : (
                <button
                  onClick={handleSaveToWatchlist}
                  disabled={savingToWatchlist || searchResponse.results.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:bg-emerald-400 transition-colors shadow-xs"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>{savingToWatchlist ? 'Saving Snapshot...' : 'Save to Watchlist & Track'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter & Sort Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-100/70 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-700">Filter:</span>
              <button
                onClick={() => setStockFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  stockFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Listings ({searchResponse.results.length})
              </button>
              <button
                onClick={() => setStockFilter('in_stock')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  stockFilter === 'in_stock' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                In Stock Only
              </button>
              <button
                onClick={() => setStockFilter('verified_only')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  stockFilter === 'verified_only' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Verified Pages Only
              </button>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700"
              >
                <option value="price_asc">Price: Lowest to Highest</option>
                <option value="price_desc">Price: Highest to Lowest</option>
                <option value="supplier">Distributor Name</option>
              </select>
            </div>
          </div>

          {/* Packaging & Currency comparability note */}
          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-blue-800 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Prices are normalized to single-unit quantities. If distributor currency does not match base currency,
              comparison is explicitly marked incomparable to prevent misleading calculations.
            </span>
          </div>

          {/* Supplier Comparison Table */}
          {processedResults.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
              No supplier listings match your active filter.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Distributor / Supplier</th>
                      <th className="px-4 py-3">Part Details & MPN</th>
                      <th className="px-4 py-3">Verification</th>
                      <th className="px-4 py-3">Availability</th>
                      <th className="px-4 py-3">Lead Time</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-center">Distributor Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedResults.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          item.isLowestPrice ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Supplier */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {item.supplier}
                            {item.isLowestPrice && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Lowest
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Part Details & MPN */}
                        <td className="px-4 py-3.5">
                          <div className="font-mono font-bold text-slate-900">{item.mpn}</div>
                          <div className="text-slate-500 truncate max-w-[220px]" title={item.name}>
                            {item.name}
                          </div>
                          {item.manufacturer && (
                            <div className="text-[11px] text-slate-400">Mfg: {item.manufacturer}</div>
                          )}
                        </td>

                        {/* Verification */}
                        <td className="px-4 py-3.5">
                          <StatusBadge verification={item.verificationStatus} />
                        </td>

                        {/* Availability */}
                        <td className="px-4 py-3.5">
                          <StatusBadge status={item.stockStatus} quantity={item.stockQuantity} />
                        </td>

                        {/* Lead time */}
                        <td className="px-4 py-3.5 text-slate-600">
                          {item.leadTime ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {item.leadTime}
                            </span>
                          ) : (
                            <span className="text-slate-400">Not published</span>
                          )}
                        </td>

                        {/* Unit price */}
                        <td className="px-4 py-3.5 text-right font-mono">
                          {item.price !== null ? (
                            <div>
                              <span
                                className={`text-sm font-bold ${
                                  item.isLowestPrice ? 'text-emerald-700' : 'text-slate-900'
                                }`}
                              >
                                {item.price.toFixed(2)} {item.currency}
                              </span>
                              {!item.comparable && item.incomparabilityReason && (
                                <div className="text-[10px] text-amber-600 font-sans" title={item.incomparabilityReason}>
                                  (Not comparable)
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">Not published</span>
                          )}
                        </td>

                        {/* Link */}
                        <td className="px-4 py-3.5 text-center">
                          <a
                            href={item.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Potential Substitutes Section */}
          {processedSubstitutes.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    Potential Substitutes & Pin-Compatible Variants
                  </h3>
                  <p className="text-xs text-slate-500">
                    Candidate components sharing footprint, protocol, or voltage specs. Requires engineering verification.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                  {processedSubstitutes.length} Potential Alternative(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-50/50 text-slate-700 uppercase tracking-wider font-semibold border-b border-amber-100">
                    <tr>
                      <th className="px-4 py-2.5">Candidate MPN</th>
                      <th className="px-4 py-2.5">Supplier</th>
                      <th className="px-4 py-2.5">Verification</th>
                      <th className="px-4 py-2.5">Availability</th>
                      <th className="px-4 py-2.5 text-right">Unit Price</th>
                      <th className="px-4 py-2.5 text-center">Distributor Page</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/60">
                    {processedSubstitutes.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/30">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{sub.mpn}</td>
                        <td className="px-4 py-3 text-slate-700">{sub.supplier}</td>
                        <td className="px-4 py-3">
                          <StatusBadge verification="NEEDS_VERIFICATION" />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={sub.stockStatus} quantity={sub.stockQuantity} />
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          {sub.price !== null ? `${sub.price.toFixed(2)} ${sub.currency}` : 'Unpriced'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <a
                            href={sub.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { api } from '../api/client';
import { PageId } from '../components/Sidebar';

interface BomPageProps {
  onNavigate: (page: PageId, componentId?: string) => void;
}

export const BomPage: React.FC<BomPageProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [boms, setBoms] = useState<any[]>([]);
  const [trackedComponents, setTrackedComponents] = useState<any[]>([]);
  const [activeBomId, setActiveBomId] = useState<string>('');
  const [activeBom, setActiveBom] = useState<any | null>(null);

  // New BOM modal
  const [showNewBomModal, setShowNewBomModal] = useState(false);
  const [newBomName, setNewBomName] = useState('');
  const [newBomDesc, setNewBomDesc] = useState('');

  // Add Item state
  const [selectedCompId, setSelectedCompId] = useState('');
  const [reqQty, setReqQty] = useState(1);
  const [addingItem, setAddingItem] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeBomId) {
      loadBomDetails(activeBomId);
    }
  }, [activeBomId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bomRes, compRes] = await Promise.all([
        api.getBoms(),
        api.getComponents(),
      ]);
      setBoms(bomRes.boms);
      setTrackedComponents(compRes.components);

      if (!activeBomId && bomRes.boms.length > 0) {
        setActiveBomId(bomRes.boms[0].id);
      }
    } catch (err) {
      console.error('Failed to load BOM data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBomDetails = async (id: string) => {
    try {
      const res = await api.getBom(id);
      setActiveBom(res.bom);
    } catch (err) {
      console.error('Failed to load BOM details:', err);
    }
  };

  const handleCreateBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBomName.trim()) return;

    try {
      const res = await api.createBom(newBomName.trim(), newBomDesc.trim());
      setShowNewBomModal(false);
      setNewBomName('');
      setNewBomDesc('');
      await loadData();
      setActiveBomId(res.bom.id);
    } catch (err: any) {
      alert(`Failed to create BOM: ${err.message}`);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBomId || !selectedCompId) return;

    try {
      setAddingItem(true);
      await api.addBomItem(activeBomId, selectedCompId, reqQty);
      await loadBomDetails(activeBomId);
      setSelectedCompId('');
      setReqQty(1);
    } catch (err: any) {
      alert(`Failed to add item: ${err.message}`);
    } finally {
      setAddingItem(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!activeBomId) return;
    try {
      await api.removeBomItem(activeBomId, itemId);
      await loadBomDetails(activeBomId);
    } catch (err: any) {
      alert(`Failed to remove item: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bill of Materials (BOM)</h1>
          <p className="text-sm text-slate-500">Track aggregate component costs and supplier availability</p>
        </div>
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bill of Materials (BOM)</h1>
          <p className="text-sm text-slate-500">
            Combine tracked components into project assemblies and compute estimated total build cost.
          </p>
        </div>

        <button
          onClick={() => setShowNewBomModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New BOM</span>
        </button>
      </div>

      {boms.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No Bill of Materials Created"
          description="Create your first BOM assembly to calculate project build cost and monitor shortage bottlenecks across your parts."
          actionLabel="Create BOM"
          onAction={() => setShowNewBomModal(true)}
        />
      ) : (
        <div className="space-y-6">
          {/* BOM Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Select BOM:</span>
              <select
                value={activeBomId}
                onChange={(e) => setActiveBomId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              >
                {boms.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.itemCount} items)
                  </option>
                ))}
              </select>
            </div>

            {activeBom && (
              <div className="flex items-center gap-6 text-xs font-mono">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-sans font-semibold">Total Cost</span>
                  <span className="text-lg font-bold text-emerald-600">
                    ${activeBom.totalEstimatedCost.toFixed(2)}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-sans font-semibold">Unresolved</span>
                  <span
                    className={`text-lg font-bold ${
                      activeBom.unresolvedCount > 0 ? 'text-amber-600' : 'text-slate-800'
                    }`}
                  >
                    {activeBom.unresolvedCount} item(s)
                  </span>
                </div>
              </div>
            )}
          </div>

          {activeBom && (
            <div className="space-y-6">
              {/* Add Component Form */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <form onSubmit={handleAddItem} className="flex flex-wrap items-end gap-3 text-xs">
                  <div className="flex-1 min-w-[220px]">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Add Tracked Component
                    </label>
                    <select
                      value={selectedCompId}
                      onChange={(e) => setSelectedCompId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-900"
                    >
                      <option value="">-- Choose tracked component --</option>
                      {trackedComponents.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.mpn} ({c.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Required Qty
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={reqQty}
                      onChange={(e) => setReqQty(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={addingItem || !selectedCompId}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    {addingItem ? 'Adding...' : 'Add to BOM'}
                  </button>

                  {trackedComponents.length === 0 && (
                    <span className="text-amber-600 text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      No components tracked yet. Search & track components first.
                    </span>
                  )}
                </form>
              </div>

              {/* BOM Items Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{activeBom.name}</h3>
                    {activeBom.description && (
                      <p className="text-xs text-slate-500">{activeBom.description}</p>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {activeBom.items.length} item(s) listed
                  </span>
                </div>

                {activeBom.items.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No components added to this BOM yet. Choose a tracked component above to start calculating costs.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">MPN & Part</th>
                          <th className="px-4 py-3">Req. Qty</th>
                          <th className="px-4 py-3">Best Listing (Distributor)</th>
                          <th className="px-4 py-3">Stock Status</th>
                          <th className="px-4 py-3 text-right">Unit Price</th>
                          <th className="px-4 py-3 text-right">Subtotal</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeBom.items.map((item: any) => {
                          const hasBest = Boolean(item.bestListing && item.bestListing.price !== null);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80">
                              <td className="px-4 py-3.5">
                                <div className="font-mono font-bold text-slate-900">
                                  {item.component?.mpn}
                                </div>
                                <div className="text-slate-500 truncate max-w-[200px]">
                                  {item.component?.name}
                                </div>
                              </td>

                              <td className="px-4 py-3.5 font-mono font-bold text-slate-800">
                                {item.requiredQuantity}
                              </td>

                              <td className="px-4 py-3.5">
                                {item.bestListing ? (
                                  <div className="font-medium text-slate-800">
                                    {item.bestListing.supplierName}
                                  </div>
                                ) : (
                                  <span className="text-amber-600 font-medium">No verified supplier</span>
                                )}
                              </td>

                              <td className="px-4 py-3.5">
                                <StatusBadge status={item.bestListing?.stockStatus} />
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono">
                                {hasBest ? (
                                  <span>${item.bestListing.price.toFixed(2)}</span>
                                ) : (
                                  <span className="text-slate-400">Unpriced</span>
                                )}
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                                {item.estimatedCost !== null ? (
                                  <span className="text-emerald-700">
                                    ${item.estimatedCost.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-normal">Pending price</span>
                                )}
                              </td>

                              <td className="px-4 py-3.5 text-right">
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="Remove item from BOM"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New BOM Modal */}
      {showNewBomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create Bill of Materials</h3>
            <form onSubmit={handleCreateBom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assembly / Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newBomName}
                  onChange={(e) => setNewBomName(e.target.value)}
                  placeholder="e.g. Autonomous Rover Mainboard v2"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={newBomDesc}
                  onChange={(e) => setNewBomDesc(e.target.value)}
                  placeholder="Brief description of project requirements or target quantities"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBomModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Create BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

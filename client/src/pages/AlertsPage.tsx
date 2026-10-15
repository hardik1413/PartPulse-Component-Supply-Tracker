import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  Filter,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { api } from '../api/client';
import { PageId } from '../components/Sidebar';

interface AlertsPageProps {
  onNavigate: (page: PageId, componentId?: string) => void;
  onRefreshAlertsCount: () => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  onNavigate,
  onRefreshAlertsCount,
}) => {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, [unreadOnly]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.getAlerts(unreadOnly);
      setAlerts(res.alerts);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      setMarkingId(id);
      await api.markAlertRead(id);
      await loadAlerts();
      onRefreshAlertsCount();
    } catch (err: any) {
      alert(`Failed to mark alert as read: ${err.message}`);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllAlertsRead();
      await loadAlerts();
      onRefreshAlertsCount();
    } catch (err: any) {
      alert(`Failed to mark all as read: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shortage & Price Alerts</h1>
          <p className="text-sm text-slate-500">Real-time alerts triggered by distributor snapshot transitions</p>
        </div>
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  const unreadCount = alerts.filter((a) => !a.readAt).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shortage & Price Alerts</h1>
          <p className="text-sm text-slate-500">
            Automated alerts when components go out of stock, prices spike by +10%+, or inventory recovers.
          </p>
        </div>

        {alerts.length > 0 && unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors shrink-0"
          >
            <CheckCheck className="w-4 h-4 text-slate-600" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-700">Filter view:</span>
        <button
          onClick={() => setUnreadOnly(false)}
          className={`px-3 py-1 rounded-md font-medium transition-colors ${
            !unreadOnly ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setUnreadOnly(true)}
          className={`px-3 py-1 rounded-md font-medium transition-colors ${
            unreadOnly ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Unread Only {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title={unreadOnly ? 'No Unread Alerts' : 'No Shortage Alerts Logged'}
          description="Whenever a component in your watchlist experiences a price increase >= 10%, goes out of stock, or recovers inventory during automated or manual checks, it will trigger an alert here."
          actionLabel="View Tracked Watchlist"
          onAction={() => onNavigate('tracked')}
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const isUnread = !alert.readAt;
            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all ${
                  isUnread
                    ? 'bg-white border-blue-200 shadow-xs ring-1 ring-blue-100'
                    : 'bg-slate-50/70 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge alertType={alert.type} />
                      {alert.component && (
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {alert.component.mpn}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-900 leading-relaxed">
                      {alert.message}
                    </p>

                    {(alert.previousValue || alert.currentValue) && (
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-2 pt-0.5">
                        <span className="text-slate-400">Previous: {alert.previousValue || 'N/A'}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-slate-800">Current: {alert.currentValue || 'N/A'}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                    {/* View history */}
                    {alert.componentId && (
                      <button
                        onClick={() => onNavigate('history', alert.componentId)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>History</span>
                      </button>
                    )}

                    {/* Mark as read */}
                    {isUnread && (
                      <button
                        onClick={() => handleMarkRead(alert.id)}
                        disabled={markingId === alert.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Read</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

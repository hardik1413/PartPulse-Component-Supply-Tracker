import React from 'react';
import {
  LayoutDashboard,
  Search,
  Scale,
  BookmarkCheck,
  History,
  FileSpreadsheet,
  Bell,
  Cpu,
} from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'search'
  | 'comparison'
  | 'tracked'
  | 'history'
  | 'bom'
  | 'alerts';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  unreadAlertsCount: number;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  unreadAlertsCount,
  isOpen,
  onClose,
}) => {
  const navItems: {
    id: PageId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'search', label: 'Component Search', icon: Search },
    { id: 'comparison', label: 'Supplier Comparison', icon: Scale },
    { id: 'tracked', label: 'Tracked Watchlist', icon: BookmarkCheck },
    { id: 'history', label: 'Price History', icon: History },
    { id: 'bom', label: 'Bill of Materials', icon: FileSpreadsheet },
    { id: 'alerts', label: 'Shortage Alerts', icon: Bell, badge: unreadAlertsCount },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight text-lg">PartPulse</span>
            <span className="block text-[10px] font-medium tracking-wider uppercase text-blue-400">
              Supply Tracker
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive ? 'bg-white text-blue-600' : 'bg-red-500 text-white animate-pulse'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom system status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-slate-300 font-medium">TinyFish Integration</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Live Search & Fetch enabled</p>
        </div>
      </aside>
    </>
  );
};

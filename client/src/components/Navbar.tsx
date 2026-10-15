import React from 'react';
import { Menu, Bell, Search, Database } from 'lucide-react';
import { PageId } from './Sidebar';

interface NavbarProps {
  onToggleSidebar: () => void;
  onNavigate: (page: PageId) => void;
  unreadAlertsCount: number;
  apiStatus: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onNavigate,
  unreadAlertsCount,
  apiStatus,
}) => {
  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>SQLite: Sync</span>
          <span className="text-slate-400">|</span>
          <span className={apiStatus === 'configured' ? 'text-emerald-700 font-semibold' : 'text-amber-700'}>
            API: {apiStatus}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick search shortcut */}
        <button
          onClick={() => onNavigate('search')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search component...</span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">
            Ctrl+K
          </kbd>
        </button>

        {/* Alerts button */}
        <button
          onClick={() => onNavigate('alerts')}
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Shortage Alerts"
        >
          <Bell className="w-5 h-5" />
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </button>
      </div>
    </header>
  );
};

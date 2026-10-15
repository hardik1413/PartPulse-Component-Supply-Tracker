import React, { useState, useEffect } from 'react';
import { Sidebar, PageId } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { SearchPage } from './pages/SearchPage';
import { SupplierComparisonPage } from './pages/SupplierComparisonPage';
import { TrackedComponentsPage } from './pages/TrackedComponentsPage';
import { PriceHistoryPage } from './pages/PriceHistoryPage';
import { BomPage } from './pages/BomPage';
import { AlertsPage } from './pages/AlertsPage';
import { api } from './api/client';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [apiStatus, setApiStatus] = useState<string>('checking...');

  const refreshAlertCount = async () => {
    try {
      const res = await api.getAlerts(true);
      setUnreadAlertsCount(res.unreadCount);
    } catch {
      // Ignore background errors
    }
  };

  const checkApiHealth = async () => {
    try {
      const res = await api.checkHealth();
      setApiStatus(res.services.tinyFishApiKey === 'configured' ? 'configured' : 'key_missing');
    } catch {
      setApiStatus('offline');
    }
  };

  useEffect(() => {
    refreshAlertCount();
    checkApiHealth();
  }, []);

  const handleNavigate = (page: PageId, componentId?: string) => {
    setCurrentPage(page);
    if (componentId) {
      setSelectedComponentId(componentId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadAlertsCount={unreadAlertsCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Layout Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNavigate={handleNavigate}
          unreadAlertsCount={unreadAlertsCount}
          apiStatus={apiStatus}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentPage === 'dashboard' && (
            <DashboardPage
              onNavigate={handleNavigate}
              onRefreshSuccess={refreshAlertCount}
            />
          )}

          {currentPage === 'search' && (
            <SearchPage
              onNavigate={handleNavigate}
              onTrackSuccess={refreshAlertCount}
            />
          )}

          {currentPage === 'comparison' && (
            <SupplierComparisonPage
              onNavigate={handleNavigate}
              selectedComponentId={selectedComponentId}
            />
          )}

          {currentPage === 'tracked' && (
            <TrackedComponentsPage
              onNavigate={handleNavigate}
              onRefreshSuccess={refreshAlertCount}
            />
          )}

          {currentPage === 'history' && (
            <PriceHistoryPage
              componentId={selectedComponentId}
              onNavigate={handleNavigate}
              onRefreshSuccess={refreshAlertCount}
            />
          )}

          {currentPage === 'bom' && (
            <BomPage onNavigate={handleNavigate} />
          )}

          {currentPage === 'alerts' && (
            <AlertsPage
              onNavigate={handleNavigate}
              onRefreshAlertsCount={refreshAlertCount}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

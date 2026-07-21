import { useLocation } from 'react-router-dom';
import { Search, Bell, Menu, User } from 'lucide-react';
import { useUiStore } from '@/store/appStateStore';
import { useAuthStore } from '@/store/authManagementStore';
import useCompanyStore from '@/store/companyStore';
import ThemeToggle from './ThemeToggle';
import PreviewAsUser from './PreviewAsUser';
import MySQLSyncPanel from './MySQLSyncPanel';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const Navbar = () => {
  const location = useLocation();
  const { toggleSidebar } = useUiStore();
  const { user } = useAuthStore();
  const companyLogo = useCompanyStore((state) => state.companyDetails?.logo);
  // Prefer the user-uploaded company logo (a data URL → works everywhere).
  // Fall back to the bundled image via BASE_URL so it resolves correctly in the
  // packaged Electron build (an absolute "/header.png" points at the filesystem
  // root there and shows a broken-image icon).
  const logoSrc = companyLogo || `${import.meta.env.BASE_URL}header.png`;
  const [cacheStatus, setCacheStatus] = useState({
    enabled: false,
    pendingChanges: 0,
    isUploading: false
  });
  const [showCachePopup, setShowCachePopup] = useState(false);
  
  const PATH_TITLES = {
    'om':          'Operation & Management',
    'jobs':        'Jobs',
    'dashboard':   'Dashboard',
    'customer':    'Customer',
    'vendors':     'Vendors',
    'labour':      'Employee',
    'supplier':    'Supplier',
    'inventory':   'Inventory',
    'accounts':    'Accounts',
    'summary':     'Summary',
    'daily-tasks': 'Daily Tasks',
    'settings':    'Settings',
  };
  const rawSegment  = location.pathname.split('/').filter(Boolean).pop() || 'dashboard';
  const formattedTitle = PATH_TITLES[rawSegment] || (rawSegment.charAt(0).toUpperCase() + rawSegment.slice(1).replace(/-/g, ' '));

  useEffect(() => {
    // Update cache status every 10 seconds
    const updateCacheStatus = async () => {
      if (window.cacheManager && typeof window.cacheManager.status === 'function') {
        try {
          const status = await window.cacheManager.status();
          setCacheStatus(status);
        } catch (error) {
          console.error('Failed to get cache status:', error);
        }
      }
    };

    updateCacheStatus();
    const interval = setInterval(updateCacheStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-dark-card backdrop-blur-lg border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center flex-1">
        <button onClick={toggleSidebar} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface">
          <Menu className="h-6 w-6 text-gray-600 dark:text-dark-text" />
        </button>
        <motion.div initial={{ opacity:0, x: -10}} animate={{opacity: 1, x: 0}} key={formattedTitle} className="ml-4">
            <h1 className="text-xl font-bold text-brand-dark dark:text-dark-text">{formattedTitle}</h1>
        </motion.div>
      </div>
      
      {/* Center Logo */}
      <div className="flex items-center justify-center absolute left-1/2 transform -translate-x-1/2">
        <img
          src={logoSrc}
          alt="Company Logo"
          className="h-12 object-contain"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </div>

      <div className="flex items-center space-x-4 flex-1 justify-end">
        <PreviewAsUser />
        <MySQLSyncPanel />
        <ThemeToggle />
        <div className="relative">
          <button 
            onClick={() => setShowCachePopup(!showCachePopup)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface relative"
          >
            <Bell className="h-6 w-6 text-gray-600 dark:text-dark-text" />
            {cacheStatus.pendingChanges > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-brand-red rounded-full ring-2 ring-white dark:ring-dark-card">
                {cacheStatus.pendingChanges > 99 ? '99+' : cacheStatus.pendingChanges}
              </span>
            )}
            {cacheStatus.isUploading && (
              <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-blue-500 animate-pulse ring-2 ring-white dark:ring-dark-card" />
            )}
          </button>

          {/* Cache Status Popup */}
          {showCachePopup && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-lg p-4 z-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-text">Cache Status</h3>
                <button 
                  onClick={() => setShowCachePopup(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  <span className={`text-sm font-medium ${cacheStatus.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                    {cacheStatus.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pending Changes</span>
                  <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                    {cacheStatus.pendingChanges || 0}
                  </span>
                </div>

                {cacheStatus.isUploading && (
                  <div className="flex items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
                    <span className="text-sm text-blue-600 dark:text-blue-400">Uploading...</span>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200 dark:border-dark-border">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Cache automatically syncs every 8 hours. Pending changes are queued for next upload.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';

// Expose toast to window for Electron IPC
if (typeof window !== 'undefined') {
  window.toast = toast;
}
import Login from '@/pages/Login';
import Layout from '@/components/Layout';
import AppInitializer from '@/components/AppInitializer';
import ErrorOverlay from '@/components/ErrorOverlay';
import InstallationStatusIndicator from '@/components/InstallationStatusIndicator';
import Dashboard from '@/pages/Dashboard';
import Jobs from '@/pages/Jobs';
import OperationManagement from '@/pages/OperationManagement';
import Customer from '@/pages/Customer';
import Vendors from '@/pages/Vendors';
import Labour from '@/pages/Labour';
import Supplier from '@/pages/Supplier';
import Inventory from '@/pages/Inventory';
import Accounts from '@/pages/Accounts';
import Summary from '@/pages/Summary';
import DailyTasks from '@/pages/DailyTasks';
import Settings from '@/pages/Settings';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageAccessGuard from '@/components/PageAccessGuard';
import { useAuthStore, usePermissionStore } from '@/store/authManagementStore';
import CashReceipt from "./pages/accounts/CashReceipt";
// import { localDB } from '@/utils/localDatabase'; // Removed - merged into indexedDB
import { initDB, dbOperations } from '@/lib/db';
import { healNumericFields } from '@/utils/healNumericFields';
import { initPathConfig } from '@/utils/pathConfig';
import debugUserPermissions from '@/utils/debugPermissions';
import BackendSettingsModal from '@/components/BackendSettingsModal';
import { isApiModeEnabled } from '@/api/client';
import { startWebSyncListeners } from '@/utils/webSyncQueue';
import SyncPendingBanner from '@/components/SyncPendingBanner';

// Expose debugging utilities globally
if (typeof window !== 'undefined') {
  window.debugUserPermissions = debugUserPermissions;
  window.dbOperations = dbOperations;
}
// import { syncManager } from '@/utils/jobSyncManager'; // Merged into unifiedSyncManager
import { authService } from '@/lib/auth';
import useMultiplierStore from '@/store/multiplierStore';
import unifiedSyncManager from '@/utils/unifiedSyncManager';
import { desktopSyncHandler } from '@/utils/desktopSyncHandler';
import { backendMigrationManager } from '@/utils/backendMigrationManager';
// import '@/utils/adminSetup'; // Disabled to prevent async errors

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const { loadPermissions, initialized: permissionsInitialized } = usePermissionStore();
  const [dbReady, setDbReady] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [showInstallationIndicator, setShowInstallationIndicator] = useState(false);
  const [installationComplete, setInstallationComplete] = useState(false);

  // Load permissions when user is authenticated (except Super Admin who has god-mode access)
  useEffect(() => {
    if (isAuthenticated && user?.id && dbReady && !permissionsInitialized) {
      // Skip permission loading for Super Admin - they have god-mode access
      if (user.id === 'super-admin-sheddy-smith' || user.email === 'Shahidmultaniii') {
        console.log('👑 Super Admin detected - God mode access granted');
        return;
      }
      
      console.log('🔐 Loading user permissions...');
      loadPermissions(user.id);
    }
  }, [isAuthenticated, user, dbReady, permissionsInitialized, loadPermissions]);

  // Initialize database on app startup (before authentication)
  useEffect(() => {
    if (dbInitialized) return; // Prevent double initialization
    
    const initializeDatabase = async () => {
      try {
        console.log('🔄 Initializing Database System...');
        
        // Initialize path configuration first (desktop only)
        if (!isApiModeEnabled()) {
          await initPathConfig();
          console.log('✅ Path configuration initialized');
        }
        
        // Log database configuration if available
        if (!isApiModeEnabled() && window.electron?.getDbConfig) {
          const config = await window.electron.getDbConfig();
          console.log('📁 Database Configuration:', config);
          
          // Initialize directory structure based on IndexedDB mapping
          if (window.electron?.initDbStructure) {
            console.log('🏗️ Initializing directory structure...');
            const structResult = await window.electron.initDbStructure();
            if (structResult.success) {
              console.log('✅ Directory structure initialized:', structResult.message);
            } else {
              console.error('❌ Failed to initialize directory structure:', structResult.error);
            }
          }
        }
        
        setDbInitialized(true);
        
        await initDB();
        console.log('✅ IndexedDB initialized successfully');

        // One-time repair: coerce any string-typed numeric columns (legacy data
        // pulled from MySQL as strings) back to numbers, so `value.toFixed()`
        // across the UI never crashes. Runs before routes render (during the
        // loading screen) and is a no-op after the first successful pass.
        await healNumericFields();

        const apiMode = isApiModeEnabled();
        if (apiMode) {
          console.log('🌐 Web API mode (Option B) — MySQL via FastAPI; browser queue for offline');
          startWebSyncListeners();
        }
        
        // Desktop-only: file sync + Windows install (skipped in web API mode)
        if (!apiMode && window.electron && window.electron.fs) {
          console.log('🔄 Initializing Enhanced Database Sync Manager with Windows Installation...');
          setShowInstallationIndicator(true); // Show installation indicator
          
          const initResult = await unifiedSyncManager.initialize();
          
          if (initResult.success) {
            console.log('✅ Enhanced Database Sync Manager initialized');
            if (initResult.warnings && initResult.warnings.length > 0) {
              console.log('⚠️ Initialization warnings:', initResult.warnings);
            }
            setInstallationComplete(true);
          } else {
            console.error('❌ Database Sync Manager initialization failed:', initResult.error);
            setInstallationComplete(false);
          }
          
          console.log('📁 Using standardized file structure: C:/malwa-crm/data-base');
          
          // Initialize backend migration and desktop features
          console.log('🔄 Initializing backend migration...');
          const migrationResult = await backendMigrationManager.initialize();
          
          if (migrationResult.success) {
            console.log('✅ Backend migration completed successfully');
          } else {
            console.warn('⚠️ Backend migration completed with warnings:', migrationResult.error);
          }
        } else if (!apiMode) {
          console.log('ℹ️ Running in browser mode - file system sync disabled');
        }
        
        // Admin setup is handled by adminSetup.js auto-initialization
        // Check existing users for logging purposes
        try {
          const users = await dbOperations.getAll('users');
          if (!users || users.length === 0) {
            console.log('🔄 Admin auto-initialization will handle user creation...');
            console.log('🔧 Malwa CRM initialized');
          } else {
            console.log(`✅ Found ${users.length} existing user(s) in database`);
          }
        } catch (userErr) {
          console.warn('User count check skipped:', userErr);
        }
        
        setDbReady(true);
      } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        setDbInitialized(false); // Allow retry
        
        // Enhanced error reporting
        const errorDetails = {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        };
        
        console.error('📊 Database Error Details:', errorDetails);
        
        toast.error(`Database initialization failed: ${error.message}`, {
          description: 'Please refresh the page or clear browser data',
          duration: 10000,
          action: {
            label: 'Clear Data & Retry',
            onClick: () => {
              localStorage.clear();
              sessionStorage.clear();
              location.reload();
            }
          }
        });
      }
    };

    initializeDatabase();
  }, [dbInitialized]);

  // Handle session persistence - prevent logout on page reload
  useEffect(() => {
    // Mark that the app was properly loaded (not refreshed)
    const appLoadTime = Date.now();
    window.appLoadTime = appLoadTime;
    
    // Set a flag in sessionStorage to track if this is a reload
    const isReload = sessionStorage.getItem('malwa_app_reload');
    if (!isReload) {
      sessionStorage.setItem('malwa_app_reload', 'true');
    }

    // Handle beforeunload - only for actual app close, not refresh
    const handleBeforeUnload = (e) => {
      // Only logout if window is actually closing (not refreshing)
      const timeSinceLoad = Date.now() - appLoadTime;
      
      // If the page was loaded less than 1 second ago, it's likely a refresh
      if (timeSinceLoad > 1000) {
        // This is likely an actual close, not a refresh
        // The persist middleware will handle saving state automatically
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const initLocalDatabase = async () => {
      if (!dbReady) return;
      
      try {        
        // Enhanced unified sync manager already initialized in main database setup
        console.log('✅ Database system ready with enhanced operations');
        console.log('📁 File structure: C:/malwa-crm/Data_base/');
        
      } catch (error) {
        console.error('Failed to initialize enhanced database:', error);
      }
    };

    if (isAuthenticated && dbReady) {
      initLocalDatabase();
    }

    return () => {
      // Cleanup unified sync manager on unmount
      try {
        if (isAuthenticated && unifiedSyncManager && typeof unifiedSyncManager.cleanup === 'function') {
          unifiedSyncManager.cleanup();
        }
        
        // Additional cleanup for database sync manager
        if (window.electron && window.electron.fs && unifiedSyncManager && typeof unifiedSyncManager.cleanup === 'function') {
          unifiedSyncManager.cleanup();
        }
      } catch (error) {
        console.warn('⚠️ Cleanup error (non-critical):', error);
      }
    };
  }, [isAuthenticated, dbReady]);

  // Show loading while database initializes
  if (!dbReady) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-dark-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Initializing application...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorOverlay>
      <AppInitializer>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={
            <PageAccessGuard pageKey="dashboard">
              <Dashboard />
            </PageAccessGuard>
          } />
          <Route path="jobs" element={
            <PageAccessGuard pageKey="jobs">
              <Jobs />
            </PageAccessGuard>
          } />
          <Route path="om" element={
            <PageAccessGuard pageKey="om">
              <OperationManagement />
            </PageAccessGuard>
          } />
          <Route path="customer" element={
            <PageAccessGuard pageKey="customer">
              <Customer />
            </PageAccessGuard>
          } />
          <Route path="vendors" element={
            <PageAccessGuard pageKey="vendors">
              <Vendors />
            </PageAccessGuard>
          } />
          <Route path="labour" element={
            <PageAccessGuard pageKey="labour">
              <Labour />
            </PageAccessGuard>
          } />
          <Route path="supplier" element={
            <PageAccessGuard pageKey="supplier">
              <Supplier />
            </PageAccessGuard>
          } />
          <Route path="inventory" element={
            <PageAccessGuard pageKey="inventory">
              <Inventory />
            </PageAccessGuard>
          } />
          <Route path="accounts" element={
            <PageAccessGuard pageKey="accounts">
              <Accounts />
            </PageAccessGuard>
          } />
          <Route path="summary" element={
            <PageAccessGuard pageKey="summary">
              <Summary />
            </PageAccessGuard>
          } />
          <Route path="daily-tasks" element={
            <PageAccessGuard pageKey="dailyTasks">
              <DailyTasks />
            </PageAccessGuard>
          } />
          <Route path="CashReceipt" element={
            <PageAccessGuard pageKey="accounts" subPageKey="cashReceipt">
              <CashReceipt />
            </PageAccessGuard>
          } />

          <Route path="settings" element={
            <PageAccessGuard pageKey="settings">
              <Settings />
            </PageAccessGuard>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
         <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </AppInitializer>
      
      <SyncPendingBanner />

      {/* Hidden backend settings popup — desktop MySQL config (Shift+Alt+D then B). Hidden in web API mode. */}
      {!isApiModeEnabled() && <BackendSettingsModal />}

      {/* Windows Installation Status Indicator */}
      {!isApiModeEnabled() && showInstallationIndicator && (
        <InstallationStatusIndicator
          onComplete={(success) => {
            setShowInstallationIndicator(false);
            console.log(`🏁 Installation indicator completed: ${success ? 'SUCCESS' : 'PARTIAL/FAILED'}`);
          }}
        />
      )}
    </ErrorOverlay>
  );
}

export default App;

import { toast } from 'sonner';
import unifiedSyncManager from '@/utils/unifiedSyncManager';

/**
 * Desktop Sync Handler - Manages data synchronization for Electron app
 */
class DesktopSyncHandler {
  constructor() {
    this.isInitialized = false;
    this.syncInProgress = false;
  }

  /**
   * Initialize sync handlers for Electron environment
   */
  init() {
    if (this.isInitialized || !window.electron) return;

    try {
      // Listen for sync triggers from main process
      window.electron.onPerformSync(() => {
        this.handleManualSync();
      });

      console.log('🔄 Desktop sync handler initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize desktop sync handler:', error);
    }
  }

  /**
   * Handle manual sync triggered from menu
   */
  async handleManualSync() {
    if (this.syncInProgress) {
      toast.info('Sync already in progress...');
      return;
    }

    this.syncInProgress = true;
    
    try {
      console.log('🔄 Starting manual data sync...');
      toast.info('Synchronizing data...', { duration: 2000 });

      // Perform comprehensive sync using unified sync manager
      const syncResult = await this.performFullSync();

      if (syncResult.success) {
        toast.success(`✅ Sync completed successfully! ${syncResult.message}`, {
          duration: 4000
        });
        console.log('✅ Manual sync completed:', syncResult);
      } else {
        throw new Error(syncResult.error || 'Sync failed');
      }

    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      toast.error(`❌ Sync failed: ${error.message}`, {
        duration: 5000
      });
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Perform full data synchronization
   */
  async performFullSync() {
    try {
      const results = {
        success: true,
        operations: [],
        errors: []
      };

      // 1. Sync with file system if available
      if (unifiedSyncManager && typeof unifiedSyncManager.syncAll === 'function') {
        console.log('🔄 Syncing with unified sync manager...');
        const unifiedResult = await unifiedSyncManager.syncAll();
        
        if (unifiedResult.success) {
          results.operations.push('File system sync completed');
        } else {
          results.errors.push(`File sync error: ${unifiedResult.error}`);
        }
      }

      // 2. Trigger IndexedDB sync operations
      if (window.electron?.triggerManualSync) {
        console.log('🔄 Triggering backend sync...');
        const backendResult = await window.electron.triggerManualSync();
        
        if (backendResult.success) {
          results.operations.push('Backend sync initiated');
        } else {
          results.errors.push(`Backend sync error: ${backendResult.error}`);
        }
      }

      // 3. Refresh current page data
      console.log('🔄 Refreshing page data...');
      await this.refreshCurrentPageData();
      results.operations.push('Page data refreshed');

      // 4. Update sync status
      const totalOperations = results.operations.length;
      const totalErrors = results.errors.length;

      if (totalErrors > 0) {
        console.warn('⚠️ Sync completed with warnings:', results.errors);
        return {
          success: true,
          message: `${totalOperations} operations completed, ${totalErrors} warnings`,
          details: results
        };
      }

      return {
        success: true,
        message: `${totalOperations} operations completed successfully`,
        details: results
      };

    } catch (error) {
      console.error('❌ Full sync failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Refresh current page data by dispatching custom events
   */
  async refreshCurrentPageData() {
    try {
      // Dispatch custom event for components to refresh their data
      const refreshEvent = new CustomEvent('manual-data-refresh', {
        detail: { 
          timestamp: Date.now(),
          source: 'desktop-sync'
        }
      });
      
      window.dispatchEvent(refreshEvent);
      
      // Small delay to allow components to process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('📄 Page data refresh triggered');
    } catch (error) {
      console.error('❌ Failed to refresh page data:', error);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isInitialized: this.isInitialized,
      syncInProgress: this.syncInProgress,
      isElectron: !!window.electron
    };
  }

  /**
   * Cleanup sync handlers
   */
  cleanup() {
    if (window.electron?.removeAllListeners) {
      window.electron.removeAllListeners('perform-data-sync');
    }
    this.isInitialized = false;
    console.log('🧹 Desktop sync handler cleaned up');
  }
}

// Create singleton instance
export const desktopSyncHandler = new DesktopSyncHandler();

// Auto-initialize in Electron environment
if (typeof window !== 'undefined' && window.electron) {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      desktopSyncHandler.init();
    });
  } else {
    desktopSyncHandler.init();
  }
}

export default desktopSyncHandler;
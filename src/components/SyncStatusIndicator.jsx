import { useState } from 'react';
import unifiedSyncManager from '@/utils/unifiedSyncManager';
import { Download, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import Button from './ui/Button';

const SyncStatusIndicator = () => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState(null);

  const handleRestore = async () => {
    setIsRestoring(true);
    setRestoreStatus(null);
    
    try {
      console.log('🔄 Starting manual restore...');
      const result = await unifiedSyncManager.manualRestore();
      
      setRestoreStatus({
        success: true,
        message: `✅ Successfully restored ${result.restoredCount} records from ${result.backupFile}`,
        count: result.restoredCount
      });
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setRestoreStatus(null);
      }, 5000);
      
      // Refresh page to show restored data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Restore failed:', error);
      setRestoreStatus({
        success: false,
        message: `❌ Restore failed: ${error.message}`
      });
      
      // Auto-hide error message after 8 seconds
      setTimeout(() => {
        setRestoreStatus(null);
      }, 8000);
    } finally {
      setIsRestoring(false);
    }
  };

  const getButtonContent = () => {
    if (isRestoring) {
      return (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Restoring...</span>
        </>
      );
    }
    
    if (restoreStatus?.success) {
      return (
        <>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">Restored</span>
        </>
      );
    }
    
    if (restoreStatus?.success === false) {
      return (
        <>
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm font-medium text-red-700 dark:text-red-400">Failed</span>
        </>
      );
    }
    
    return (
      <>
        <Download className="h-4 w-4" />
        <span className="text-sm font-medium">Restore Data</span>
      </>
    );
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        size="sm"
        variant={restoreStatus?.success ? "success" : restoreStatus?.success === false ? "danger" : "secondary"}
        onClick={handleRestore}
        disabled={isRestoring}
        className="flex items-center gap-2 px-3 py-2 min-w-[120px] justify-center"
      >
        {getButtonContent()}
      </Button>
      
      {restoreStatus && (
        <div className={`text-xs px-2 py-1 rounded max-w-xs text-center ${
          restoreStatus.success 
            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' 
            : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
        }`}>
          {restoreStatus.message}
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;

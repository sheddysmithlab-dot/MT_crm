import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import unifiedSyncManager from '@/utils/unifiedSyncManager';
import { toast } from 'sonner';

const OfflineIndicator = () => {
  const isOnline = useOfflineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!isOnline);
  }, [isOnline]);

  const handleSync = async () => {
    if (!isOnline) {
      toast.warning('Cannot sync while offline');
      return;
    }

    setIsSyncing(true);
    try {
      await unifiedSyncManager.manualSync();
      toast.success('Sync completed successfully!');
    } catch (error) {
      toast.error('Sync failed: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!show && isOnline) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
          isOnline
            ? 'bg-green-500 text-white'
            : 'bg-orange-500 text-white'
        }`}
      >
        {isOnline ? (
          <>
            <Wifi className="h-5 w-5" />
            <div className="flex flex-col">
              <span className="font-medium text-sm">Back Online</span>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="text-xs underline hover:no-underline flex items-center gap-1"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    Sync Now
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <WifiOff className="h-5 w-5 animate-pulse" />
            <div className="flex flex-col">
              <span className="font-medium text-sm">You're Offline</span>
              <span className="text-xs opacity-90">Changes will sync when online</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;

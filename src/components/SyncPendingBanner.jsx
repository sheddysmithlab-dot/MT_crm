import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { getPendingCount, flushSyncQueue, startWebSyncListeners } from '@/utils/webSyncQueue';
import { isApiModeEnabled } from '@/api/client';
import { isOnline, subscribeNetworkStatus } from '@/utils/networkStatus';

/**
 * Small banner for Option B: shows offline / pending sync count.
 */
export default function SyncPendingBanner() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isApiModeEnabled()) return undefined;
    startWebSyncListeners();
    setPending(getPendingCount());
    const unsub = subscribeNetworkStatus((on) => {
      setOnline(on);
      setPending(getPendingCount());
    });
    const timer = setInterval(() => setPending(getPendingCount()), 3000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  if (!isApiModeEnabled()) return null;
  if (online && pending === 0) return null;

  const handleSync = async () => {
    setSyncing(true);
    try {
      await flushSyncQueue();
      setPending(getPendingCount());
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-[90] -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 shadow-lg dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <div className="flex items-center gap-3">
        {!online ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Offline — changes will sync when internet returns{pending ? ` (${pending} pending)` : ''}.</span>
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4" />
            <span>{pending} change{pending === 1 ? '' : 's'} waiting to sync.</span>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-1 rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
            >
              <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
              Sync now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

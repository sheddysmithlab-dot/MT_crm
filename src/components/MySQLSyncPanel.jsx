import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, UploadCloud, DownloadCloud } from 'lucide-react';
import { db } from '@/db/dexie.js';
import { syncAllNow, forceFullResync, pushAllLocalData, pullAllFromMySQL } from '@/utils/syncService';
import { toast } from 'sonner';

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STARTUP_PULL_DELAY_MS = 4000;           // 4 s after mount — let app stabilize

async function flushCache() {
  try {
    if (window.cacheManager?.uploadNow) await window.cacheManager.uploadNow();
  } catch {}
}

// Read the most common failure reason from syncQueue — checks BOTH failed
// status entries AND pending entries that have a last_error (connection failures
// keep status='pending' but we still write last_error there).
async function getTopFailureError() {
  try {
    const entries = await db.syncQueue
      .filter(e => e.last_error)
      .limit(100)
      .toArray();
    if (!entries.length) return null;
    const counts = new Map();
    for (const e of entries) {
      const msg = (e.last_error || 'unknown error').slice(0, 200);
      counts.set(msg, (counts.get(msg) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const [topMsg, topCount] = sorted[0];
    return `${topCount}× "${topMsg}"`;
  } catch {
    return null;
  }
}

// Log all failure breakdowns grouped by table + error to console for debugging
async function logFailureBreakdown() {
  try {
    const entries = await db.syncQueue
      .filter(e => e.last_error)
      .toArray();
    if (!entries.length) return;
    const grouped = {};
    for (const e of entries) {
      const key = `${e.store_name} (${e.status}) :: ${(e.last_error || 'unknown').slice(0, 200)}`;
      grouped[key] = (grouped[key] || 0) + 1;
    }
    console.group(`[Sync] ${entries.length} entries with errors — breakdown:`);
    Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .forEach(([key, count]) => console.error(`  ${count}× ${key}`));
    console.groupEnd();
  } catch (err) {
    console.error('[Sync] Failed to log breakdown:', err);
  }
}

const IS_ELECTRON =
  typeof window !== 'undefined' &&
  !!window.electron?.isElectron &&
  typeof window.electron?.pushSyncRecords === 'function';

const MySQLSyncPanel = () => {
  const [isSyncing, setIsSyncing]   = useState(false);
  const [status, setStatus]         = useState({
    configured: false, pendingCount: 0, failedCount: 0, lastSynced: null,
  });
  const syncingRef = useRef(false); // avoid closure-stale isSyncing in timers

  const refreshStatus = useCallback(async () => {
    if (!IS_ELECTRON) return;
    try {
      const cfgRes     = await window.backendSettings?.getConfig?.();
      const configured = !!(cfgRes?.success && cfgRes?.config?.host);

      const [pendingCount, failedCount, syncStatusRows] = await Promise.all([
        db.syncQueue.where('status').equals('pending').count(),
        db.syncQueue.where('status').equals('failed').count(),
        db.sync_status.toArray(),
      ]);

      const lastSynced = syncStatusRows.reduce(
        (max, e) => (e.last_sync && (!max || e.last_sync > max) ? e.last_sync : max),
        null
      );

      setStatus({ configured, pendingCount, failedCount, lastSynced });
    } catch {}
  }, []);

  // Poll status every 15 s
  useEffect(() => {
    refreshStatus();
    const id = setInterval(refreshStatus, 15000);
    return () => clearInterval(id);
  }, [refreshStatus]);

  // ── handleSyncNow declared BEFORE any useEffect that references it ─────────
  const handleSyncNow = useCallback(async (options = {}) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);

    await flushCache();

    const cfgRes     = await window.backendSettings?.getConfig?.().catch(() => null);
    const configured = !!(cfgRes?.success && cfgRes?.config?.host);

    if (!configured) {
      if (!options.silent) toast.info('Cache flushed. MySQL not configured — skipping remote sync.');
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshStatus();
      return;
    }

    try {
      const result = await syncAllNow();
      if (result.skipped) {
        if (!options.silent) toast.info(`Sync skipped: ${result.reason}`);
      } else {
        const pushed = result.totalSynced  || 0;
        const pulled = result.totalPulled  || 0;
        const failed = result.totalFailed  || 0;

        if (!options.silent) {
          if (failed > 0) {
            // Prefer the live error from this sync run, fall back to syncQueue
            const liveErr = result.topError ? `Error: ${result.topError}` : null;
            const errSummary = liveErr || await getTopFailureError();
            toast.warning(
              `Sync: ↑${pushed} pushed, ↓${pulled} pulled, ${failed} failed`,
              {
                description: errSummary || 'Open DevTools (Ctrl+Shift+I) console for details',
                duration: 15000,
              }
            );
            // Also log all distinct errors to console grouped by table
            await logFailureBreakdown();
          } else if (pushed > 0 || pulled > 0) {
            toast.success(`Sync complete — ↑${pushed} pushed, ↓${pulled} pulled`);
          } else {
            toast.success('MySQL: All data is up to date');
          }
        }
      }
    } catch (err) {
      if (!options.silent) toast.error(`MySQL sync failed: ${err?.message || 'unknown'}`);
      console.error('[Sync] Unexpected error:', err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshStatus();
    }
  }, [refreshStatus]);

  // Force full re-sync — clears sync_status cursors and pulls every row from
  // MySQL. Use on a fresh PC2 to make sure labour/accounts/ledger tables that
  // previously failed to pull get loaded. Confirms before running.
  const handleForceFullResync = useCallback(async () => {
    if (syncingRef.current) return;
    const ok = window.confirm(
      'Force Full Re-Sync?\n\n' +
      'Yeh sync_status cursors clear karega aur Hostinger se saari rows freshly ' +
      'pull karega (labour ledger, accounts, customer/vendor/supplier ledger sab).\n\n' +
      'Local data delete NAHI hoga. Last-write-wins se conflicts resolve honge.\n\n' +
      'Continue?'
    );
    if (!ok) return;

    syncingRef.current = true;
    setIsSyncing(true);
    await flushCache();

    const cfgRes     = await window.backendSettings?.getConfig?.().catch(() => null);
    const configured = !!(cfgRes?.success && cfgRes?.config?.host);
    if (!configured) {
      toast.error('MySQL not configured. Open Backend Settings first.');
      syncingRef.current = false;
      setIsSyncing(false);
      return;
    }

    try {
      toast.info('Force full re-sync started — this may take a few minutes…', { duration: 8000 });
      const result = await forceFullResync();
      if (result.skipped) {
        toast.info(`Force sync skipped: ${result.reason}`);
      } else {
        const pushed = result.totalSynced || 0;
        const pulled = result.totalPulled || 0;
        const failed = result.totalFailed || 0;
        toast.success(
          `Force re-sync complete — ↑${pushed} pushed, ↓${pulled} pulled` +
          (failed > 0 ? `, ${failed} failed` : ''),
          { duration: 12000 }
        );
        await logFailureBreakdown();
      }
    } catch (err) {
      toast.error(`Force re-sync failed: ${err?.message || 'unknown'}`);
      console.error('[Sync] Force re-sync error:', err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshStatus();
    }
  }, [refreshStatus]);

  // One-time full push — uploads EVERY row of EVERY table from IndexedDB to
  // MySQL unconditionally (ignores updated_at / cursors). Use this to seed
  // MySQL with legacy local data that the incremental sync never catches.
  const handlePushAllLocal = useCallback(async () => {
    if (syncingRef.current) return;
    const ok = window.confirm(
      'Push ALL local data to MySQL?\n\n' +
      'Yeh IndexedDB (local storage) ki SAARI tables ka HAR record ek baar ' +
      'MySQL par upsert karega — chahe wo cache/queue me na bhi ho.\n\n' +
      'Purana local data jo ab tak MySQL par nahi gaya, yeh usse push kar dega.\n' +
      'MySQL par jo rows already hain wo update ho jayengi (id ke hisaab se).\n\n' +
      'Bade data par yeh kuch minute le sakta hai. Continue?'
    );
    if (!ok) return;

    syncingRef.current = true;
    setIsSyncing(true);
    await flushCache();

    const cfgRes     = await window.backendSettings?.getConfig?.().catch(() => null);
    const configured = !!(cfgRes?.success && cfgRes?.config?.host);
    if (!configured) {
      toast.error('MySQL not configured. Open Backend Settings first.');
      syncingRef.current = false;
      setIsSyncing(false);
      return;
    }

    try {
      toast.info('Full local push started — uploading all tables…', { duration: 8000 });
      const result = await pushAllLocalData((p) => {
        // lightweight console progress; avoids toast spam per table
        console.log(`[Sync:pushAll] (${p.index}/${p.total}) ${p.table} — ${p.pushed} pushed`);
      });

      if (result.skipped) {
        toast.info(`Full push skipped: ${result.reason}`);
      } else {
        const pushed = result.totalPushed || 0;
        const failed = result.totalFailed || 0;
        if (failed > 0) {
          toast.warning(
            `Full push done — ↑${pushed} pushed, ${failed} failed`,
            { description: result.firstError || 'See DevTools console for details', duration: 15000 }
          );
        } else {
          toast.success(`Full push complete — ↑${pushed} records pushed to MySQL`, { duration: 12000 });
        }
      }
    } catch (err) {
      toast.error(`Full push failed: ${err?.message || 'unknown'}`);
      console.error('[Sync] Full push error:', err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshStatus();
    }
  }, [refreshStatus]);

  // One-time full pull — resets pull cursors and downloads EVERY row of EVERY
  // table from MySQL into IndexedDB. Use when "pull nahi ho raha" — re-fetches
  // rows a previous run skipped (unique-conflict) whose cursor moved past them.
  const handlePullAll = useCallback(async () => {
    if (syncingRef.current) return;
    const ok = window.confirm(
      'Pull ALL data from MySQL?\n\n' +
      'Yeh sabhi tables ke pull cursors reset karke MySQL se SAARA data dobara ' +
      'IndexedDB me download karega.\n\n' +
      'Jo rows pehle skip ho gayi thi (unique conflict) wo bhi aa jayengi.\n' +
      'Local data delete NAHI hoga — last-write-wins se conflicts resolve honge.\n\n' +
      'Bade data par yeh kuch minute le sakta hai. Continue?'
    );
    if (!ok) return;

    syncingRef.current = true;
    setIsSyncing(true);

    const cfgRes     = await window.backendSettings?.getConfig?.().catch(() => null);
    const configured = !!(cfgRes?.success && cfgRes?.config?.host);
    if (!configured) {
      toast.error('MySQL not configured. Open Backend Settings first.');
      syncingRef.current = false;
      setIsSyncing(false);
      return;
    }

    try {
      toast.info('Full pull started — downloading all tables…', { duration: 8000 });
      const result = await pullAllFromMySQL((p) => {
        console.log(`[Sync:pullAll] (${p.index}/${p.total}) ${p.table} — ${p.pulled} pulled`);
      });

      if (result.skipped) {
        toast.info(`Full pull skipped: ${result.reason}`);
      } else {
        const pulled  = result.totalPulled  || 0;
        const deleted = result.totalDeleted || 0;
        if (result.firstError) {
          toast.warning(
            `Pull done — ↓${pulled} pulled` + (deleted ? `, ${deleted} removed` : ''),
            { description: result.firstError, duration: 15000 }
          );
        } else {
          toast.success(`Full pull complete — ↓${pulled} records downloaded from MySQL`, { duration: 12000 });
        }
      }
    } catch (err) {
      toast.error(`Full pull failed: ${err?.message || 'unknown'}`);
      console.error('[Sync] Full pull error:', err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshStatus();
    }
  }, [refreshStatus]);

  // Expose globally for Electron IPC
  useEffect(() => {
    window.__malwaSyncNow = handleSyncNow;
    window.__malwaForceFullResync = handleForceFullResync;
    window.__malwaPushAllLocal = handlePushAllLocal;
    window.__malwaPullAll = handlePullAll;
    return () => {
      delete window.__malwaSyncNow;
      delete window.__malwaForceFullResync;
      delete window.__malwaPushAllLocal;
      delete window.__malwaPullAll;
    };
  }, [handleSyncNow, handleForceFullResync, handlePushAllLocal, handlePullAll]);

  // Custom event from Electron main process
  useEffect(() => {
    const onSync = () => handleSyncNow();
    window.addEventListener('malwa:sync-now', onSync);
    return () => window.removeEventListener('malwa:sync-now', onSync);
  }, [handleSyncNow]);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleSyncNow();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSyncNow]);

  // Pull on startup — fetch latest MySQL data shortly after app loads
  useEffect(() => {
    if (!IS_ELECTRON) return;
    const t = setTimeout(() => {
      handleSyncNow({ silent: true });
    }, STARTUP_PULL_DELAY_MS);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-sync every 5 minutes (silent, no toast unless there's a failure)
  useEffect(() => {
    if (!IS_ELECTRON) return;
    const id = setInterval(() => {
      handleSyncNow({ silent: true });
    }, AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [handleSyncNow]);

  if (!IS_ELECTRON) return null;

  // ── derive indicator state ─────────────────────────────────────────────────
  const state = !status.configured
    ? 'not-configured'
    : isSyncing
    ? 'syncing'
    : status.failedCount > 0
    ? 'failed'
    : status.pendingCount > 0
    ? 'pending'
    : 'ok';

  const dotColor = {
    'not-configured': 'bg-gray-400',
    syncing:          'bg-blue-500',
    failed:           'bg-red-500',
    pending:          'bg-amber-400',
    ok:               'bg-green-500',
  }[state];

  const pingable = state === 'syncing' || state === 'pending';

  const tooltip =
    state === 'not-configured' ? 'MySQL: Not configured'
    : isSyncing               ? 'Syncing…'
    : status.failedCount > 0  ? `MySQL: ${status.failedCount} failed — Ctrl+S to retry, right-click for Force Full Re-Sync`
    : status.pendingCount > 0 ? `MySQL: ${status.pendingCount} pending — auto-syncs every 5 min (right-click: Force Full Re-Sync)`
    :                           'MySQL: All synced (auto every 5 min) — right-click for Force Full Re-Sync';

  return (
    <div className="flex items-center">
      <button
        onClick={() => handleSyncNow()}
        onContextMenu={(e) => { e.preventDefault(); handleForceFullResync(); }}
        title={tooltip}
        disabled={isSyncing}
        className="flex items-center gap-1 px-1.5 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors disabled:cursor-wait"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-500' : 'text-gray-400 dark:text-gray-500'}`} />
        <span className="relative flex h-2 w-2">
          {pingable && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${dotColor}`} />
          )}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`} />
        </span>
      </button>

      {/* One-time full push of ALL local IndexedDB data to MySQL */}
      <button
        onClick={handlePushAllLocal}
        title="Push ALL local data to MySQL (one-time full upload of every table)"
        disabled={isSyncing || !status.configured}
        className="flex items-center px-1.5 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <UploadCloud className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
      </button>

      {/* One-time full pull of ALL data from MySQL into IndexedDB */}
      <button
        onClick={handlePullAll}
        title="Pull ALL data from MySQL (one-time full download of every table)"
        disabled={isSyncing || !status.configured}
        className="flex items-center px-1.5 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <DownloadCloud className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
      </button>
    </div>
  );
};

export default MySQLSyncPanel;

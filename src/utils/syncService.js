/**
 * syncService.js
 *
 * Generic bi-directional sync between Dexie (local) and MySQL (remote) for all
 * supported CRM tables.
 *
 * Push strategy (Dexie → MySQL):
 *   1. syncQueue-based — flush pending queue entries (catches all online changes)
 *   2. Incremental direct scan — push any records with updated_at > lastPushAt
 *      (safety net for records that bypassed the queue)
 *
 * Pull strategy (MySQL → Dexie):
 *   - Loop while MySQL keeps returning rows with updated_at > lastPullAt.
 *     Each batch is capped at 2000 rows by the IPC handler, so a fresh PC2
 *     with N rows needs ceil(N/2000) round-trips. lastPullAt advances to the
 *     MAX(updated_at) of rows pulled so far — never NOW — so no rows can be
 *     skipped if there are more than one batch's worth.
 *   - Conflict rule: last-write-wins by updated_at; local wins ties
 *   - Soft-deleted MySQL rows are marked deleted in Dexie (status='deleted')
 *   - Wrapped in withRemoteWrite() so Dexie hooks DON'T overwrite updated_at
 *     or re-queue the pulled rows as outgoing changes (ping-pong fix).
 *
 * State is persisted in Dexie's sync_status table:
 *   { id: '<table>_push' | '<table>_pull', store_name, last_sync, status, last_error? }
 */

import { db, withRemoteWrite } from '@/db/dexie.js';

// ── constants ─────────────────────────────────────────────────────────────────

export const SUPPORTED_TABLES = [
  // Master tables
  'customers', 'vendors', 'suppliers', 'labour',
  // Customer-related
  'customer_ledger_entries', 'customer_jobs',
  'invoices', 'invoice_items', 'receipts', 'cash_receipts',
  // Vendor-related
  'vendor_ledger_entries', 'vendor_services',
  'vendor_orders', 'vendor_invoices', 'vendor_invoice_items', 'service_orders',
  // Supplier-related
  'supplier_ledger_entries', 'supplier_products',
  // Labour-related
  'labour_ledger_entries', 'labour_attendance', 'weekly_balances',
  // Inventory
  'inventory_categories', 'inventory_items',
  'stock_movements', 'stock_transactions', 'products',
  // Accounts
  'accounts', 'purchases', 'purchase_items',
  'vouchers', 'payments',
  'gst_ledger', 'gstledger', 'gst_accounts', 'ledger_views',
  'journal_entries', 'journal_lines',
  // Jobs workflow
  'jobs', 'inspections', 'estimates', 'estimate_items',
  'jobsheets', 'jobsheet_items',
  // Challans
  'challans', 'challan', 'challan_items',
  'sell_challans', 'sellchallan', 'sell_challan_items',
  'purchase_challans', 'purchase_challan_items',
  // Settings & users
  'templates', 'roles', 'permissions', 'taxes', 'hsn_codes',
  'audit_logs', 'rate_history', 'rate_list_memory',
  'users', 'profiles', 'documents', 'branches',
  // Operations
  'daily_tasks',
];

const IS_ELECTRON =
  typeof window !== 'undefined' &&
  !!window.electron?.isElectron &&
  typeof window.electron?.pushSyncRecords === 'function';

const MAX_PULL_LOOPS = 50;  // safety cap: 50 × 2000 = 100k rows per table per run

// ── sync-state helpers ────────────────────────────────────────────────────────

async function getLastSync(storeName, direction) {
  try {
    const row = await db.sync_status.get(`${storeName}_${direction}`);
    return row?.last_sync || null;
  } catch {
    return null;
  }
}

async function setLastSync(storeName, direction, status, lastSyncValue, lastError = null) {
  try {
    await db.sync_status.put({
      id:         `${storeName}_${direction}`,
      store_name: storeName,
      last_sync:  lastSyncValue || new Date().toISOString(),
      status,
      last_error: lastError,
    });
  } catch {
    // non-critical — silently ignore
  }
}

async function clearSyncState(storeName) {
  try {
    await db.sync_status.where('store_name').equals(storeName).delete();
  } catch {}
}

// ── deduplication for syncQueue entries ───────────────────────────────────────

function deduplicate(sortedEntries) {
  const byRecordId = new Map();
  const noId       = [];
  for (const e of sortedEntries) {
    if (e.record_id) {
      byRecordId.set(e.record_id, e); // latest overwrites
    } else {
      noId.push(e);
    }
  }
  const winners      = [...byRecordId.values(), ...noId];
  const winnerIdSet  = new Set(winners.map(e => e.id));
  const supersededIds = sortedEntries.filter(e => !winnerIdSet.has(e.id)).map(e => e.id);
  return { winners, supersededIds };
}

// ── queue-based push ──────────────────────────────────────────────────────────

async function flushSyncQueue(storeName) {
  const pending = await db.syncQueue
    .where('[store_name+status]')
    .equals([storeName, 'pending'])
    .sortBy('created_at');

  if (!pending.length) return { synced: 0, failed: 0, superseded: 0 };

  const { winners, supersededIds } = deduplicate(pending);

  const ipcEntries = winners.map(e => ({
    queue_id:  e.id,
    record_id: e.record_id,
    operation: e.operation,
    data:      e.data || {},
  }));

  let result;
  try {
    result = await window.electron.pushSyncRecords(storeName, ipcEntries);
  } catch (err) {
    // IPC-level failure — log error on all attempted entries so user sees it
    await db.syncQueue.where('id').anyOf(winners.map(e => e.id)).modify({
      last_error: `IPC error: ${err.message}`,
      last_attempted_at: new Date().toISOString(),
    }).catch(() => {});
    return { synced: 0, failed: winners.length, error: err.message };
  }

  if (!result?.results || result.success === false) {
    // Connection-level failure — leave entries as pending so they're retried next time
    // BUT save last_error on all of them so the user can diagnose the issue
    const errMsg = result?.error || 'Connection failed (no error message)';
    await db.syncQueue.where('id').anyOf(winners.map(e => e.id)).modify({
      last_error: errMsg,
      last_attempted_at: new Date().toISOString(),
    }).catch(() => {});
    return { synced: 0, failed: winners.length, error: errMsg };
  }

  const now = new Date().toISOString();
  let synced = 0, failed = 0;

  await Promise.all([
    ...result.results.map(async (res) => {
      if (res.success) {
        await db.syncQueue.update(res.queue_id, { status: 'synced', synced_at: now, last_error: null });
        synced++;
      } else {
        const existing = await db.syncQueue.get(res.queue_id);
        await db.syncQueue.update(res.queue_id, {
          status:            'failed',
          last_error:        res.error,
          last_attempted_at: now,
          retry_count:       (existing?.retry_count || 0) + 1,
        });
        failed++;
      }
    }),
    // Mark superseded entries synced (they're stale — winner replaced them)
    ...supersededIds.map(qid =>
      db.syncQueue.update(qid, { status: 'synced', synced_at: now, last_error: null })
    ),
  ]);

  return { synced, failed, superseded: supersededIds.length };
}

// ── incremental direct push (catch-all safety net) ───────────────────────────
// Returns the max updated_at observed (or null), so syncTable can advance
// lastPushAt to a value that EXISTS in the data — not NOW. Avoids the race
// where records created during the push window get skipped next run.

async function incrementalPush(storeName) {
  const lastPushAt = await getLastSync(storeName, 'push');
  const since      = lastPushAt ? new Date(lastPushAt) : new Date(0);

  let records;
  try {
    records = await db.table(storeName)
      .filter(r => r.updated_at && new Date(r.updated_at) > since)
      .toArray();
  } catch {
    return { synced: 0, failed: 0, maxUpdatedAt: null };
  }

  if (!records.length) return { synced: 0, failed: 0, maxUpdatedAt: null };

  // Capture max updated_at BEFORE pushing — this is what we'll advance to.
  const maxUpdatedAt = records.reduce((max, r) => {
    return (!max || r.updated_at > max) ? r.updated_at : max;
  }, null);

  // Build IPC entries (no queue_id — these come from direct scan)
  const ipcEntries = records.map(r => ({
    queue_id:  null,
    record_id: r.id,
    operation: 'update',  // treat all as upserts
    data:      r,
  }));

  let result;
  try {
    result = await window.electron.pushSyncRecords(storeName, ipcEntries);
  } catch (err) {
    return { synced: 0, failed: records.length, error: err.message, maxUpdatedAt: null };
  }

  const ok = (result?.results || []).filter(r => r.success).length;
  return {
    synced:       ok,
    failed:       (result?.results?.length || 0) - ok,
    maxUpdatedAt: ok > 0 ? maxUpdatedAt : null,
  };
}

// ── pull (MySQL → Dexie) ──────────────────────────────────────────────────────
// Looped: each IPC call is capped at 2000 rows server-side. Loop until MySQL
// returns nothing new. lastPullAt advances to MAX(records.updated_at) per batch
// — never NOW — so no rows can be skipped between batches.

// Save a pulled MySQL row into Dexie, resolving unique-index (&) conflicts.
//
// Tables like vendors/suppliers/labour (&code), invoices (&invoice_no),
// customer_jobs (&job_no), users (&email), roles (&name) etc. have unique
// indexes. If the incoming row's unique value already belongs to a DIFFERENT
// local id, a plain put() throws ConstraintError and the row silently never
// pulls — that's why "some tables come, some don't". The MySQL row is the
// authoritative copy, so we delete the clashing local duplicate(s) (under a
// different id) and retry. Runs inside withRemoteWrite, so the delete does NOT
// re-queue an outgoing sync op.
async function putResolvingUnique(table, rec, uniqueIndexes) {
  try {
    await table.put(rec);
    return { resolved: false };
  } catch (err) {
    let removedAny = false;
    for (const field of uniqueIndexes) {
      const val = rec[field];
      if (val == null) continue;
      let clashes;
      try { clashes = await table.where(field).equals(val).toArray(); }
      catch { continue; }
      for (const c of clashes) {
        if (c.id !== rec.id) {
          await table.delete(c.id);
          removedAny = true;
          console.warn(`[Sync:pull] ${table.name}: removed local dup id=${c.id} (${field}="${val}") → keeping remote id=${rec.id}`);
        }
      }
    }
    if (!removedAny) throw err;   // conflict wasn't a unique-key dup — re-throw
    await table.put(rec);          // retry; any further error bubbles to caller
    return { resolved: true };
  }
}

async function pullTable(storeName) {
  let lastPullAt        = await getLastSync(storeName, 'pull');
  let totalPulled       = 0;
  let totalDeleted      = 0;
  let lastBatchError    = null;
  let perRowErrors      = [];
  let highWaterMark     = lastPullAt;  // advance only after successful save

  // Simple (non-compound) unique index field names for this table — used to
  // resolve unique-constraint conflicts when saving pulled rows.
  let uniqueIndexes = [];
  try {
    uniqueIndexes = db.table(storeName).schema.indexes
      .filter(idx => idx.unique && !idx.compound && typeof idx.keyPath === 'string')
      .map(idx => idx.keyPath);
  } catch {}

  for (let loop = 0; loop < MAX_PULL_LOOPS; loop++) {
    let pullResult;
    try {
      pullResult = await window.electron.pullSyncRecords(storeName, lastPullAt);
    } catch (err) {
      lastBatchError = err.message;
      break;
    }

    if (!pullResult?.success) {
      lastBatchError = pullResult?.error || 'pull failed';
      break;
    }

    const { records = [], deletedIds = [] } = pullResult;
    if (!records.length && !deletedIds.length) break;  // caught up

    // Save records inside withRemoteWrite so Dexie hooks DON'T:
    //   (a) overwrite mysqlRec.updated_at with Date.now(), or
    //   (b) re-queue this row in syncQueue as a fresh outgoing change.
    await withRemoteWrite(async () => {
      for (const mysqlRec of records) {
        try {
          const table = db.table(storeName);
          const local = await table.get(mysqlRec.id);
          if (local?.updated_at && mysqlRec.updated_at && local.updated_at >= mysqlRec.updated_at) {
            continue; // local is newer or equal — skip
          }
          await putResolvingUnique(table, mysqlRec, uniqueIndexes);
          totalPulled++;
          // Advance the high-water mark to the actual updated_at of pulled rows.
          if (mysqlRec.updated_at && (!highWaterMark || mysqlRec.updated_at > highWaterMark)) {
            highWaterMark = mysqlRec.updated_at;
          }
        } catch (rowErr) {
          // Don't swallow — surface to the user via sync_status.last_error
          perRowErrors.push(`${mysqlRec.id}: ${rowErr?.message || rowErr}`);
          if (perRowErrors.length <= 5) {
            console.error(`[Sync:pull] ${storeName} row ${mysqlRec.id} failed:`, rowErr);
          }
        }
      }

      // Handle soft-deleted records from MySQL
      for (const id of deletedIds) {
        try {
          const local = await db.table(storeName).get(id);
          if (local) {
            await db.table(storeName).update(id, {
              status:     'deleted',
              deleted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            totalDeleted++;
          }
        } catch (rowErr) {
          perRowErrors.push(`delete ${id}: ${rowErr?.message || rowErr}`);
        }
      }
    });

    // If MySQL returned fewer than batch size, this is the last batch.
    // (Batch size is 2000 in main.cjs.)
    if (records.length < 2000) break;

    // Advance the cursor for the next IPC call. If we couldn't advance (no
    // pulled rows in this batch) but MySQL returned 2000 — that means all 2000
    // rows had local.updated_at >= mysqlRec.updated_at, OR all rows failed to
    // save. Without a cursor advance we'd loop forever, so bail.
    if (!highWaterMark || highWaterMark === lastPullAt) break;
    lastPullAt = highWaterMark;
  }

  // Persist the high-water mark as the new lastPullAt. If nothing was pulled
  // and there's no prior cursor, leave it null so next run still starts fresh.
  const finalCursor = highWaterMark || lastPullAt || null;
  const errSummary  = perRowErrors.length
    ? `${perRowErrors.length} row error(s); first: ${perRowErrors[0]}`
    : null;

  if (finalCursor && !lastBatchError) {
    await setLastSync(storeName, 'pull', 'success', finalCursor, errSummary);
  } else if (lastBatchError) {
    await setLastSync(storeName, 'pull', 'error', lastPullAt, lastBatchError);
  }

  return {
    pulled:         totalPulled,
    deletedLocally: totalDeleted,
    error:          lastBatchError || errSummary,
  };
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Full sync for one table: queue flush → incremental push → pull
 * Never throws. Returns a result object.
 */
export async function syncTable(storeName) {
  if (!IS_ELECTRON) return { skipped: true, reason: 'not-electron' };

  try {
    const queueResult       = await flushSyncQueue(storeName);
    const incrementalResult = await incrementalPush(storeName);

    // Advance lastPushAt to the actual max(updated_at) of pushed rows — not NOW.
    // Avoids the race where rows created mid-push (updated_at < NOW) get skipped.
    if (incrementalResult.maxUpdatedAt) {
      await setLastSync(storeName, 'push', 'success', incrementalResult.maxUpdatedAt);
    } else if ((queueResult.synced || 0) > 0) {
      // Queue-only path: no incremental rows, but queue did push something.
      // Safe to stamp NOW because queue rows are individually removed from queue.
      await setLastSync(storeName, 'push', 'success');
    }

    const pullResult = await pullTable(storeName);

    console.log(`[Sync] ${storeName} ✅ queue=${queueResult.synced}↑ inc=${incrementalResult.synced}↑ pull=${pullResult.pulled}↓ del=${pullResult.deletedLocally}`);

    return {
      storeName,
      queue:       queueResult,
      incremental: incrementalResult,
      pull:        pullResult,
      failed:      (queueResult.failed || 0) + (incrementalResult.failed || 0),
    };
  } catch (err) {
    return { storeName, skipped: true, reason: 'unexpected-error', error: err.message };
  }
}

/**
 * Reset all 'failed' syncQueue entries back to 'pending' so they retry.
 * Called at the start of syncAllNow — handles transient failures
 * (schema not imported yet, MySQL down, etc.) without manual intervention.
 */
async function retryFailedEntries() {
  try {
    const failed = await db.syncQueue.where('status').equals('failed').toArray();
    if (!failed.length) return 0;
    const ids = failed.map(e => e.id);
    await db.syncQueue.where('id').anyOf(ids).modify({
      status: 'pending',
      last_error: null,
    });
    return failed.length;
  } catch {
    return 0;
  }
}

/**
 * Sync all supported tables sequentially.
 * Returns aggregate results per table.
 */
export async function syncAllNow() {
  if (!IS_ELECTRON) return { skipped: true, reason: 'not-electron' };

  // Auto-retry any previously failed entries — gives them another chance
  // now that schema/connection might have been fixed
  const retried = await retryFailedEntries();
  if (retried > 0) {
    console.log(`[Sync] Re-queued ${retried} previously failed entries for retry`);
  }

  const results = {};
  for (const table of SUPPORTED_TABLES) {
    results[table] = await syncTable(table);
  }

  const totalFailed = Object.values(results).reduce((sum, r) => sum + (r.failed || 0), 0);
  const totalSynced = Object.values(results).reduce(
    (sum, r) => sum + (r.queue?.synced || 0) + (r.incremental?.synced || 0),
    0
  );

  const totalPulled = Object.values(results).reduce(
    (sum, r) => sum + (r.pull?.pulled || 0),
    0
  );

  // Surface the first non-empty error so the toast can show what went wrong
  const topError = Object.values(results)
    .map(r => r.queue?.error || r.incremental?.error || r.pull?.error)
    .find(e => e && typeof e === 'string');

  console.log(`[Sync:all] ✅ total pushed=${totalSynced} pulled=${totalPulled} failed=${totalFailed}`);
  if (topError) console.error(`[Sync:all] First error: ${topError}`);
  return { results, totalSynced, totalPulled, totalFailed, topError };
}

/**
 * Safe single-table trigger. Call after any CRUD operation.
 * Fire-and-forget — never throws.
 */
export async function syncTableNow(storeName) {
  try {
    return await syncTable(storeName);
  } catch {
    return { skipped: true, reason: 'unexpected-error' };
  }
}

/**
 * ONE-TIME FULL PUSH (Dexie → MySQL), unconditional.
 *
 * Unlike syncTable's incrementalPush — which only picks rows whose
 * `updated_at` is present AND newer than the push cursor — this pushes EVERY
 * row of EVERY supported table to MySQL as an upsert, regardless of timestamp
 * or cursor. Use it to seed MySQL with legacy IndexedDB data that was created
 * before sync was enabled (or that has no/old `updated_at` and therefore never
 * gets caught by the incremental scan or even by forceFullResync).
 *
 * - Reads each table fully, pushes in batches of PUSH_BATCH_SIZE.
 * - operation: 'update' (the MySQL handler treats create/update as upsert).
 * - Does NOT touch the syncQueue or sync_status cursors, so it won't interfere
 *   with the normal incremental sync that keeps running afterwards.
 * - Never throws. Returns aggregate counts and per-table breakdown.
 *
 * @param {(progress:{table:string, index:number, total:number, pushed:number}) => void} [onProgress]
 */
const PUSH_BATCH_SIZE = 500;

export async function pushAllLocalData(onProgress) {
  if (!IS_ELECTRON) return { skipped: true, reason: 'not-electron' };

  // Make sure every MySQL table + column exists before we start uploading —
  // otherwise legacy/missing tables would fail every row with "Unknown column".
  if (typeof window.electron?.ensureSyncSchema === 'function') {
    try {
      const schema = await window.electron.ensureSyncSchema();
      if (schema && schema.success === false && schema.error) {
        return { skipped: true, reason: 'schema-ensure-failed', error: schema.error };
      }
    } catch {
      // Non-fatal — per-table ensure still runs inside each push.
    }
  }

  const perTable    = {};
  let totalPushed   = 0;
  let totalFailed   = 0;
  let firstError    = null;

  for (let i = 0; i < SUPPORTED_TABLES.length; i++) {
    const storeName = SUPPORTED_TABLES[i];

    let records;
    try {
      records = await db.table(storeName).toArray();
    } catch {
      // Table not present in this Dexie schema — skip silently
      perTable[storeName] = { pushed: 0, failed: 0, skipped: true };
      continue;
    }

    if (!records.length) {
      perTable[storeName] = { pushed: 0, failed: 0 };
      onProgress?.({ table: storeName, index: i + 1, total: SUPPORTED_TABLES.length, pushed: 0 });
      continue;
    }

    let pushed = 0, failed = 0;

    for (let start = 0; start < records.length; start += PUSH_BATCH_SIZE) {
      const batch = records.slice(start, start + PUSH_BATCH_SIZE);
      const ipcEntries = batch
        .filter(r => r && r.id != null)
        .map(r => ({
          queue_id:  null,
          record_id: r.id,
          operation: 'update', // upsert
          data:      r,
        }));

      if (!ipcEntries.length) continue;

      let result;
      try {
        result = await window.electron.pushSyncRecords(storeName, ipcEntries);
      } catch (err) {
        failed += ipcEntries.length;
        if (!firstError) firstError = `${storeName}: ${err.message}`;
        continue;
      }

      if (!result?.results || result.success === false) {
        failed += ipcEntries.length;
        if (!firstError) firstError = `${storeName}: ${result?.error || 'push failed'}`;
        continue;
      }

      for (const res of result.results) {
        if (res.success) pushed++;
        else {
          failed++;
          if (!firstError) firstError = `${storeName}: ${res.error}`;
        }
      }
    }

    perTable[storeName] = { pushed, failed };
    totalPushed += pushed;
    totalFailed += failed;
    onProgress?.({ table: storeName, index: i + 1, total: SUPPORTED_TABLES.length, pushed });
    console.log(`[Sync:pushAll] ${storeName} → ${pushed} pushed, ${failed} failed (of ${records.length})`);
  }

  console.log(`[Sync:pushAll] ✅ DONE — total pushed=${totalPushed} failed=${totalFailed}`);
  return { perTable, totalPushed, totalFailed, firstError };
}

/**
 * ONE-TIME FULL PULL (MySQL → Dexie), unconditional.
 *
 * Mirror of pushAllLocalData but for the download direction. Resets the pull
 * cursor of EVERY supported table to epoch and re-pulls every row from MySQL,
 * looping through all batches. Use this when "pull nahi ho raha" — it re-fetches
 * rows that a previous run skipped (e.g. unique-conflict rows) and whose cursor
 * had already advanced past them.
 *
 * - Ensures the MySQL schema first (so no table errors).
 * - Uses pullTable(), which resolves unique-index conflicts and advances the
 *   cursor as it goes — so after this run, normal incremental pull continues.
 * - Never throws. Returns aggregate counts and per-table breakdown.
 *
 * @param {(progress:{table:string, index:number, total:number, pulled:number}) => void} [onProgress]
 */
export async function pullAllFromMySQL(onProgress) {
  if (!IS_ELECTRON) return { skipped: true, reason: 'not-electron' };

  // Make sure every MySQL table + column exists before pulling.
  if (typeof window.electron?.ensureSyncSchema === 'function') {
    try { await window.electron.ensureSyncSchema(); } catch {}
  }

  const perTable     = {};
  let totalPulled    = 0;
  let totalDeleted   = 0;
  let firstError     = null;

  for (let i = 0; i < SUPPORTED_TABLES.length; i++) {
    const storeName = SUPPORTED_TABLES[i];

    // Reset ONLY the pull cursor so we re-pull everything from epoch.
    try { await db.sync_status.delete(`${storeName}_pull`); } catch {}

    let res;
    try {
      res = await pullTable(storeName);
    } catch (err) {
      res = { pulled: 0, deletedLocally: 0, error: err.message };
    }

    perTable[storeName] = res;
    totalPulled  += res.pulled         || 0;
    totalDeleted += res.deletedLocally || 0;
    if (!firstError && res.error) firstError = `${storeName}: ${res.error}`;

    onProgress?.({ table: storeName, index: i + 1, total: SUPPORTED_TABLES.length, pulled: res.pulled || 0 });
    console.log(`[Sync:pullAll] ${storeName} ← ${res.pulled || 0} pulled, ${res.deletedLocally || 0} deleted`);
  }

  console.log(`[Sync:pullAll] ✅ DONE — total pulled=${totalPulled} deleted=${totalDeleted}`);
  return { perTable, totalPulled, totalDeleted, firstError };
}

/**
 * Force a full re-sync: wipes the sync_status cursors for every table, then
 * runs syncAllNow. Push will re-scan all rows; pull will start from epoch and
 * loop through every batch. Use this on a fresh PC2, or to recover from a
 * partial/broken sync state.
 *
 * Note: this does NOT wipe local Dexie data — it only resets the cursors.
 * Local rows that match remote rows are skipped (last-write-wins). Local rows
 * with newer updated_at than remote will WIN and overwrite the remote copy.
 */
export async function forceFullResync() {
  if (!IS_ELECTRON) return { skipped: true, reason: 'not-electron' };

  // Clear cursors for every supported table
  for (const table of SUPPORTED_TABLES) {
    await clearSyncState(table);
  }
  console.log('[Sync] 🔄 Force full re-sync: cleared all sync_status cursors');

  return await syncAllNow();
}

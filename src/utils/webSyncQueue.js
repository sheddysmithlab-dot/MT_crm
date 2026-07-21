/**
 * Browser offline sync queue (Option B).
 * Stores pending mutations in localStorage (simple v1).
 * Later can move to Dexie sync_queue table.
 */
import { syncPush, syncPull } from '@/api/sync';
import { isApiModeEnabled, getAccessToken } from '@/api/client';
import { isOnline } from '@/utils/networkStatus';

const QUEUE_KEY = 'malwa_web_sync_queue';
const META_KEY = 'malwa_web_sync_meta';

/** Tables that must not be written while offline (architecture Option B) */
export const ONLINE_ONLY_TABLES = new Set([
  'payments',
  'cash_receipts',
  'vouchers',
  'stock_movements',
  'stock_transactions',
  'invoices',
  'journal_entries',
  'journal_lines',
]);

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

function loadMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `q_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getPendingCount() {
  return loadQueue().length;
}

export function canWriteOffline(table) {
  return !ONLINE_ONLY_TABLES.has(table);
}

/**
 * Enqueue a mutation. If online + API mode, flush immediately.
 */
export async function enqueueMutation({ table, recordId, operation, data }) {
  if (ONLINE_ONLY_TABLES.has(table) && !isOnline()) {
    const err = new Error(`'${table}' requires internet. Connect and try again.`);
    err.code = 'ONLINE_ONLY';
    throw err;
  }

  const item = {
    queue_id: uuid(),
    table,
    record_id: recordId,
    operation: operation || 'upsert',
    data: data || null,
    updated_at: new Date().toISOString(),
    client_id: localStorage.getItem('malwa_client_id') || 'web',
  };

  const queue = loadQueue();
  queue.push(item);
  saveQueue(queue);

  if (isOnline() && isApiModeEnabled() && getAccessToken()) {
    await flushSyncQueue();
  }

  return item;
}

export async function flushSyncQueue() {
  if (!isApiModeEnabled() || !getAccessToken() || !isOnline()) {
    return { success: false, reason: 'offline_or_disabled', flushed: 0 };
  }

  const queue = loadQueue();
  if (!queue.length) return { success: true, flushed: 0 };

  const response = await syncPush(queue);
  const okIds = new Set(
    (response.results || []).filter((r) => r.success).map((r) => r.queue_id)
  );
  const remaining = queue.filter((q) => !okIds.has(q.queue_id));
  saveQueue(remaining);

  return {
    success: remaining.length === 0,
    flushed: queue.length - remaining.length,
    remaining: remaining.length,
    results: response.results,
  };
}

export async function pullTable(table) {
  if (!isApiModeEnabled() || !getAccessToken() || !isOnline()) {
    return { success: false, records: [], deleted_ids: [] };
  }
  const meta = loadMeta();
  const since = meta[`last_pull_${table}`] || null;
  const result = await syncPull(table, since);
  if (result?.pulled_at) {
    meta[`last_pull_${table}`] = result.pulled_at;
    saveMeta(meta);
  }
  return result;
}

let autoStarted = false;

/** Call once from App — flush queue when browser goes online */
export function startWebSyncListeners() {
  if (autoStarted || typeof window === 'undefined') return;
  autoStarted = true;

  window.addEventListener('online', () => {
    flushSyncQueue().catch((err) => console.warn('[webSync] flush failed', err));
  });

  // Initial attempt
  if (isOnline()) {
    flushSyncQueue().catch(() => {});
  }
}

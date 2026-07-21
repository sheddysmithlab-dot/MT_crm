import { dbOperations } from '@/lib/db';
import TYRE_WORK_RATES_SEED from '@/data/tyreWorkRates';

// Tyre Work rate memory is stored as a SINGLE record in the synced
// `rate_list_memory` table (list_name = LIST_NAME) so it rides the existing
// MySQL sync queue, and is mirrored to a backend JSON file for portability —
// exactly like the rest of the rate-list settings.
export const TYRE_WORK_RECORD_ID = 'tyre_work_memory';
export const TYRE_WORK_LIST_NAME = 'tyre_work_memory';
const FILE_PATH = 'C:/malwa-crm/Data_base/settings/Rate_List_Memory/tyre_work_memory.json';

const clone = (o) => JSON.parse(JSON.stringify(o));

// Merge stored data over the seed so newly-seeded categories/conditions still
// appear even if an older saved copy predates them.
const mergeWithSeed = (data) => ({ ...clone(TYRE_WORK_RATES_SEED), ...(data || {}) });

/**
 * Load the tyre-work rate memory.
 * Order of precedence: backend JSON file → synced DB record → bundled seed.
 * @returns {Promise<object>} categories keyed by tyre count
 */
export async function loadTyreWorkRates() {
  // 1) Backend JSON file (authoritative, portable across machines)
  try {
    if (window.electron?.fs?.readFile) {
      const res = await window.electron.fs.readFile(FILE_PATH);
      if (res?.success && res.data) {
        const parsed = JSON.parse(res.data);
        if (parsed && typeof parsed === 'object') return mergeWithSeed(parsed);
      }
    }
  } catch {
    /* fall through to DB */
  }

  // 2) Synced DB record (also kept fresh by the MySQL pull path)
  try {
    const rec = await dbOperations.getById('rate_list_memory', TYRE_WORK_RECORD_ID);
    if (rec) {
      const data = typeof rec.items === 'string' ? JSON.parse(rec.items) : rec.items;
      if (data && typeof data === 'object') return mergeWithSeed(data);
    }
  } catch {
    /* fall through to seed */
  }

  // 3) Bundled default
  return clone(TYRE_WORK_RATES_SEED);
}

/**
 * Persist the tyre-work rate memory to both the synced DB table and the
 * backend JSON file. DB write throws on failure (so the UI can surface it);
 * the file mirror is best-effort.
 * @param {object} data categories keyed by tyre count
 */
export async function saveTyreWorkRates(data) {
  // Synced DB table — dbOperations queues the MySQL sync operation for us.
  const existing = await dbOperations.getById('rate_list_memory', TYRE_WORK_RECORD_ID).catch(() => null);
  const payload = {
    list_name: TYRE_WORK_LIST_NAME,
    material_name: '',     // marks this as a config record, not a material row
    items: data,
  };
  if (existing) {
    await dbOperations.update('rate_list_memory', TYRE_WORK_RECORD_ID, payload);
  } else {
    await dbOperations.insert('rate_list_memory', { id: TYRE_WORK_RECORD_ID, ...payload });
  }

  // Mirror to backend JSON file (best-effort, matches other rate-list settings)
  try {
    if (window.electron?.fs?.writeFile) {
      await window.electron.fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.warn('⚠️ Tyre work memory file mirror failed (DB copy saved):', err?.message);
  }
}

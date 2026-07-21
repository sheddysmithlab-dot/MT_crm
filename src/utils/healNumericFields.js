/**
 * healNumericFields.js
 *
 * One-time repair for legacy IndexedDB rows whose numeric columns were stored as
 * STRINGS. MySQL's mysql2 driver returns DECIMAL columns as strings by default,
 * so data pulled before the `decimalNumbers` fix landed in Dexie as strings like
 * "1234.00". The UI calls `value.toFixed(2)` in ~200 places, and a string has no
 * `.toFixed`, so any page rendering such a value crashed with
 * "toFixed is not a function".
 *
 * This pass coerces those string values back to real numbers, using the
 * AUTHORITATIVE numeric-column map from electron's TABLE_DEFS (so text columns
 * like phone / code / pincode / gstin are never touched). It runs once per
 * machine (guarded by a localStorage flag) during DB init, before any route
 * renders — so the crash is prevented without editing every component.
 *
 * Writes happen inside withRemoteWrite() so they DON'T bump updated_at or
 * re-queue the rows for sync — this is a pure local type-fix.
 */

import { db, withRemoteWrite } from '@/db/dexie.js';

const HEAL_FLAG = 'malwa-numeric-heal-v1';

export async function healNumericFields() {
  try {
    if (localStorage.getItem(HEAL_FLAG)) return;                 // already done
    if (typeof window.electron?.getNumericColumns !== 'function') return; // browser/dev

    const res = await window.electron.getNumericColumns();
    if (!res?.success || !res.map) return;

    let totalFixed = 0;

    for (const [storeName, cols] of Object.entries(res.map)) {
      if (!cols?.length) continue;

      let rows;
      try { rows = await db.table(storeName).toArray(); }
      catch { continue; } // table not present in this schema

      const changed = [];
      for (const row of rows) {
        let dirty = false;
        for (const col of cols) {
          const v = row[col];
          if (typeof v === 'string' && v.trim() !== '') {
            const num = Number(v);
            if (!Number.isNaN(num)) { row[col] = num; dirty = true; }
          }
        }
        if (dirty) changed.push(row);
      }

      if (changed.length) {
        try {
          await withRemoteWrite(async () => {
            await db.table(storeName).bulkPut(changed);
          });
          totalFixed += changed.length;
        } catch (err) {
          console.warn(`[heal] ${storeName} bulkPut failed:`, err?.message || err);
        }
      }
    }

    localStorage.setItem(HEAL_FLAG, new Date().toISOString());
    if (totalFixed) console.log(`[heal] ✅ Numeric fields repaired in ${totalFixed} record(s)`);
  } catch (err) {
    // Never block app startup — leave the flag unset so it retries next launch.
    console.warn('[heal] healNumericFields failed:', err?.message || err);
  }
}

export default healNumericFields;

# Phase 12 — Go-live runbook

## Soft launch (Day 0–2)
1. Deploy staging URL first (optional subdomain).
2. Seed admin; change password immediately.
3. Run `migrate_from_json` with desktop export / MySQL dump transform.
4. 1–2 power users only; keep desktop app as read-only backup.
5. Watch API logs + Nginx error log.

## Cutover day
1. Announce freeze window for desktop writes (30–60 min).
2. Final export from desktop IndexedDB / `C:/malwa-crm/Data_base` or last MySQL sync.
3. `python -m scripts.migrate_from_json <export>`
4. Spot-check counts: customers, jobs, vendors, inventory_items, purchases.
5. Flip DNS / confirm `crm.malwatrolley.com` → VPS.
6. Staff login with new URL only.

## First week
- Daily mysqldump restore test once.
- Collect sync pending issues (weak network shops).
- No Electron feature work — web only.

## Desktop sunset
- After 1–2 stable weeks, uninstall desktop CRM on shop PCs.
- Archive `electron/` as legacy; do not delete from git until backup confirmed.

## Rollback
- Keep previous `dist/` + DB dump.
- Point Nginx back / restore dump if critical failure.

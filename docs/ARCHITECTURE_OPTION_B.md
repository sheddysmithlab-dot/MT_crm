# Malwa CRM — Architecture Option B (Final)

**Decision date:** 2026-07-21  
**Product:** Online web CRM at `crm.malwatrolley.com`  
**Mode:** Online-first + browser offline queue (Option B)

## Architecture

```
React SPA (browser)
  ├─ Online:  fetch → Python FastAPI → MySQL
  └─ Offline: IndexedDB (Dexie) + sync_queue
                 └─ on reconnect → POST /api/sync/push
                                  GET  /api/sync/pull
```

## Rules (locked)

| Rule | Detail |
|------|--------|
| Source of truth | MySQL on server |
| Local storage | Browser IndexedDB only (cache + pending queue) |
| Desktop Electron | Legacy — do not extend; web path is primary |
| File paths `C:/malwa-crm` | Not used on web |
| Conflict (v1) | Last-write-wins by `updated_at` |
| Money / stock / final invoice | **Online-only writes** |
| Drafts / customers / leads / job drafts | Offline writes allowed |
| Auth | Server JWT — no hardcoded production passwords |

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Zustand + Dexie |
| Backend | Python FastAPI + SQLAlchemy + Alembic |
| DB | MySQL 8 |
| Hosting | Hostinger VPS + Nginx + HTTPS |

## Architecture alignment

- Store/module map: **same as** `BACKEND_COMPLETE_ARCHITECTURE (1).md`
- Web rewrite: `docs/BACKEND_COMPLETE_ARCHITECTURE.md`
- Code registry: `backend/app/db/architecture_registry.py`
- Frontend catalog: `src/data/architectureStores.js`

```
crm.malwatrolley.com/
├── src/                 # React frontend (existing)
├── backend/             # New FastAPI app
├── electron/            # Legacy desktop (deprecated for web)
├── docs/                # Migration docs
└── package.json         # Frontend scripts
```

## Offline write policy

**Allowed offline:** customers, leads, daily_tasks, job drafts, estimates (draft)  
**Blocked offline:** payments, cash receipts, stock movements (issue), posted invoices, vouchers (posted)

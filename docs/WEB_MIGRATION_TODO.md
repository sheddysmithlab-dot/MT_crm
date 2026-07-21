# Web Migration TODO — Phases 0–12

Status legend: `[x]` done · `[~]` in progress · `[ ]` pending

## Phase 0 — Freeze & setup
- [x] Option B architecture locked (`docs/ARCHITECTURE_OPTION_B.md`)
- [x] Repo layout: `backend/` + existing `src/`
- [x] Soft rules: money/stock online-only; LWW conflicts
- [ ] Hostinger VPS provisioned
- [ ] DNS `crm.malwatrolley.com` → VPS
- [ ] Production + staging MySQL created

## Phase 1 — FastAPI foundation
- [x] Scaffold `backend/app`
- [x] Config via `.env`
- [x] SQLAlchemy + MySQL session
- [x] `GET /api/health`
- [x] Core models (users, profiles, customers)
- [x] Extended models + **full architecture store registry** (73 resources)
- [x] Aligned with `BACKEND_COMPLETE_ARCHITECTURE` module/store map
- [x] requirements.txt + README
- [ ] Alembic migrations on real DB
- [ ] Full schema for every legacy Dexie table

## Phase 2 — Auth & security
- [x] Login / logout / me
- [x] JWT bearer auth
- [x] bcrypt passwords
- [x] Seed admin script
- [ ] Rate limit login
- [ ] Fine-grained permission middleware on all mutating routes
- [ ] Audit log

## Phase 3 — Sync API
- [x] `POST /api/sync/push` (all RESOURCE_MODELS)
- [x] `GET /api/sync/pull`
- [x] Online-only table rejection
- [ ] Idempotent queue ids persisted server-side

## Phase 4 — Module APIs
- [x] Customers CRUD
- [x] Generic `/api/resources/{name}` for jobs, vendors, labour, suppliers, inventory, purchases, vouchers, products
- [ ] Nested job steps (inspections/estimates) as dedicated tables
- [ ] Ledgers endpoints polish

## Phase 5 — Frontend API client
- [x] `src/api/client.js`, auth, customers, sync, resources
- [x] `.env.example` / `.env.local`

## Phase 6 — Offline queue
- [x] `webSyncQueue.js` + network helpers
- [x] Auto-sync on online + `SyncPendingBanner`

## Phase 7 — Wire Login + stores
- [x] Auth store API mode
- [x] Customer create/update/delete + fetch
- [x] Jobs / vendors / labour / suppliers / inventory / purchases list via API
- [ ] Every mutation path for all modules (gradual)

## Phase 8 — Desktop strip (web mode)
- [x] `main.jsx` skips pathConfig / writeBehind / adminSetup in API mode
- [x] App skips Electron sync + BackendSettings in API mode
- [x] `writeDesktopJson` no-op in API mode
- [ ] Delete unused desktop utils after full cutover

## Phase 9 — Data migration
- [x] `python -m scripts.migrate_from_json <export_folder>`
- [ ] Run against real desktop export
- [ ] Validate counts in production

## Phase 10 — Hostinger deploy
- [x] Deploy guide (`docs/HOSTINGER_DEPLOY.md`)
- [ ] Nginx + uvicorn + SSL on VPS
- [ ] Frontend build deploy
- [ ] mysqldump cron

## Phase 11 — QA
- [x] Checklist written (`docs/QA_CHECKLIST.md`)
- [ ] Execute checklist on staging/production

## Phase 12 — Go-live
- [x] Runbook written (`docs/GO_LIVE.md`)
- [ ] Soft launch
- [ ] Desktop sunset
- [ ] Monitor week 1

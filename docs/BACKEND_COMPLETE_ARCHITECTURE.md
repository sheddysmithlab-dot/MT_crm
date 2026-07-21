# Malwa CRM — Backend Complete Architecture (Option B / Web)

> **Canonical update of** `BACKEND_COMPLETE_ARCHITECTURE (1).md`  
> Desktop Electron + `C:/malwa-crm` remains **legacy**.  
> **Production target:** Online web app at `crm.malwatrolley.com` (Python FastAPI + MySQL + browser offline queue).

## Table of Contents
- [Overview](#overview)
- [Storage Architecture](#storage-architecture)
- [Module Store Map](#module-store-map) (unchanged from original — source of truth)
- [Web Backend Layer](#web-backend-layer)
- [Desktop Legacy Layer](#desktop-legacy-layer)
- [Sync & Data Flow (Option B)](#sync--data-flow-option-b)
- [Security & Authentication](#security--authentication)
- [File Structure Map](#file-structure-map)
- [API Reference](#api-reference)
- [Migration from Desktop](#migration-from-desktop)

---

## Overview

### System Architecture (current target)

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + Zustand + Dexie (offline cache only) |
| API | **Python FastAPI** (`backend/`) |
| Primary DB | **MySQL** (`crm_*` tables) |
| Offline | Browser IndexedDB + `sync_queue` → `/api/sync/push` |
| Hosting | Hostinger VPS + Nginx + HTTPS |
| Legacy | Electron + `C:/malwa-crm/Data_base/` (import / sunset) |

### Core Design Principles (updated)

1. **MySQL is source of truth** (multi-user, multi-device)
2. **Browser IndexedDB** = cache + offline queue (not primary)
3. **Module-Based**: same **11 modules** + store names as original architecture
4. **Permission-Driven**: RBAC (server JWT + role checks)
5. **Online-only writes** for money/stock: payments, cash_receipts, vouchers, stock_movements, stock_transactions, invoices, journal_*
6. **Last-write-wins** conflicts via `updated_at`

### What stayed the same from the original doc

- All **module store names** (customers, jobs, inspections, …)
- Logical grouping (Customer / Jobs / Vendors / Labour / Supplier / Inventory / Accounts / Settings / Financial / System)
- Desktop **JSON path map** under `C:/malwa-crm/Data_base/` (used for migrate)

### What changed

| Original (desktop) | Option B (web) |
|--------------------|----------------|
| IndexedDB primary | MySQL primary |
| File system dual storage | Optional import only |
| Electron IPC | HTTP `/api/*` |
| Offline-first always | Online-first + offline queue |
| Client MySQL sync panel | Server `.env` MySQL |

---

## Storage Architecture

### MySQL naming

Every architecture store → table `crm_{store}`  
Examples: `customers` → `crm_customers`, `jobs` → `crm_jobs`, `vendor_ledger_entries` → `crm_vendor_ledger_entries`

Typed tables (rich columns): customers, jobs, vendors, labour, suppliers, inventory_*, stock_movements, purchases, vouchers, products, users, profiles  

All other stores: flexible `id` + `status` + `data_json` + timestamps (full document preserved).

Registry code: `backend/app/db/architecture_registry.py` + `backend/app/db/registry.py`

### Legacy desktop directory (migration source)

Same tree as original doc:

```
C:/malwa-crm/Data_base/
├── customer/     customers.json, customer_ledger_entries.json, …
├── jobs/         jobs.json, inspections.json, estimates.json, …
├── vendors/      …
├── labour/       …
├── supplier/     …
├── inventory/    …
├── accounts/     …
├── settings/     General/, User_Management/, …
├── financial/    payments.json, products.json
└── system/       syncQueue.json, …
```

Import: `python -m scripts.migrate_from_json C:/malwa-crm/Data_base`

### IndexedDB (browser)

**Database**: `malwa_crm_db` (Dexie) — kept for offline cache  
**Do not** treat as multi-PC source of truth on web.

---

## Module Store Map

*(Identical to original architecture — implement against these names.)*

### System
`meta`, `profiles`, `users`, `conflicts`, `offline_operations`, `syncQueue`, `system_logs`, `backup_history`, `sync_status`

### Customer
`customers`, `customer_ledger_entries`, `customer_jobs`, `invoices`, `invoice_items`, `receipts`, `cash_receipts`, `documents`

### Jobs
`jobs`, `inspections`, `estimates`, `estimate_items`, `jobsheets`, `jobsheet_items`, `challan` / `challans`, `challan_items`, `stock_transactions`

### Vendors
`vendors`, `vendor_ledger_entries`, `vendor_services`, `service_orders`, `vendor_orders`, `vendor_invoices`, `vendor_invoice_items`

### Labour
`labour`, `labour_ledger_entries`, `labour_attendance`, `weekly_balances`

### Supplier
`suppliers`, `supplier_ledger_entries`, `supplier_products`

### Inventory
`inventory_categories`, `inventory_items`, `stock_movements`

### Accounts
`accounts`, `vouchers`, `gstledger` / `gst_ledger`, `purchase_challans`, `purchase_challan_items`, `sellchallan` / `sell_challans`, `sell_challan_items`, `journal_entries`, `journal_lines`, `gst_accounts`, `ledger_views`, `purchases`, `purchase_items`

### Settings
`settings`, `branches`, `roles`, `permissions`, `templates`, `taxes`, `hsn_codes`, `audit_logs`, `rate_history`, `rate_list_memory`, `sequences`, `daily_tasks`

### Financial
`payments`, `products`

---

## Web Backend Layer

### Location
`backend/app/`

| Path | Role |
|------|------|
| `main.py` | FastAPI app |
| `api/routes/auth.py` | Login / me / logout (JWT + bcrypt) |
| `api/routes/customers.py` | Customers CRUD (typed) |
| `api/routes/resources.py` | Generic CRUD for **all** architecture stores |
| `api/routes/sync.py` | Push / pull for offline queue |
| `db/architecture_registry.py` | Module ↔ store ↔ file map |
| `db/registry.py` | SQLAlchemy model registry |
| `services/resource_service.py` | Shared list/get/create/update/delete/upsert |

### Zustand stores (frontend)
Same names as original: `customerStore`, `jobsStore`, `vendorStore`, `labourStore`, `supplierStore`, `inventoryStore`, `accountsStore`, `settingsStore`, `authManagementStore` — wired to API when `VITE_USE_API=true`.

### Module helpers
Original helpers (`customerModuleHelpers.js`, …) remain for business rules; persistence gradually moves to `apiEntityStore` + `/api/resources/*`.

---

## Desktop Legacy Layer

Original Electron IPC / file managers **still in repo** for desktop builds:

- `electron/main.cjs`, `preload.cjs`, `ipc-handlers.cjs`
- `unifiedSyncManager`, `writeBehindCacheManager`, `fileDataManager`
- Paths under `C:/malwa-crm/Data_base/`

**Web mode** (`VITE_USE_API=true` or non-Electron): these are skipped / no-op.

---

## Sync & Data Flow (Option B)

```
UI (Zustand)
   ├─ Online  → FastAPI → MySQL
   └─ Offline → Dexie / localStorage queue
                    └─ on reconnect → POST /api/sync/push
                                    → GET  /api/sync/pull?table=…
```

Conflict: server `updated_at` wins if newer (LWW).

---

## Security & Authentication

| Item | Web implementation |
|------|--------------------|
| Passwords | bcrypt on server (`passlib`) |
| Session | JWT Bearer (`Authorization: Bearer …`) |
| Seed admin | `python -m scripts.seed_admin` (no hardcoded web passwords) |
| Permissions | Role in JWT / profile; expand middleware per original RBAC |
| Audit | `audit_logs` store via `/api/resources/audit_logs` |

Original client SHA-256 + hardcoded Super Admin = **desktop legacy only**.

---

## File Structure Map

```
crm.malwatrolley.com/
├── BACKEND_COMPLETE_ARCHITECTURE (1).md   # Original desktop doc (kept)
├── docs/
│   ├── BACKEND_COMPLETE_ARCHITECTURE.md   # THIS file (Option B)
│   ├── ARCHITECTURE_OPTION_B.md
│   ├── WEB_MIGRATION_TODO.md
│   ├── HOSTINGER_DEPLOY.md
│   ├── QA_CHECKLIST.md
│   └── GO_LIVE.md
├── backend/                               # Python FastAPI
│   ├── app/db/architecture_registry.py
│   ├── app/db/registry.py
│   └── scripts/migrate_from_json.py
├── src/                                   # React SPA
│   ├── api/                               # HTTP client
│   ├── utils/webSyncQueue.js
│   └── store/                             # Zustand (architecture modules)
└── electron/                              # Legacy desktop
```

---

## API Reference

### Auth
- `POST /api/auth/login` `{ email, password }`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Customers (typed)
- `GET/POST /api/customers`
- `GET/PUT/DELETE /api/customers/{id}`

### All architecture stores
- `GET /api/resources` — list stores + modules
- `GET /api/resources/{store}`
- `POST /api/resources/{store}`
- `GET/PUT/DELETE /api/resources/{store}/{id}`

Examples: `/api/resources/jobs`, `/api/resources/inspections`, `/api/resources/vendor_ledger_entries`

### Sync
- `POST /api/sync/push` `{ items: [{ queue_id, table, record_id, operation, data, updated_at }] }`
- `GET /api/sync/pull?table=customers&since=ISO`

### Health
- `GET /api/health`

---

## Migration from Desktop

1. Stop writes on desktop (or export copy of `C:/malwa-crm/Data_base`).
2. Configure `backend/.env` → MySQL.
3. `python -m scripts.seed_admin`
4. `python -m scripts.migrate_from_json C:/malwa-crm/Data_base`
5. Verify counts via `/api/resources/{store}`
6. Point SPA `VITE_API_URL` to production API
7. Follow `docs/GO_LIVE.md`

---

## Conclusion

Original architecture’s **module/store map** is preserved.  
Runtime backend for web is **FastAPI + MySQL**, with browser offline queue — not Electron file dual-storage.

**Version**: 5.0 Option B  
**Aligned with**: BACKEND_COMPLETE_ARCHITECTURE (1).md store list  
**Frontend**: React 18 / Vite  
**API**: FastAPI  
**DB**: MySQL `crm_*`

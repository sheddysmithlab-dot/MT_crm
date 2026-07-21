# Phase 11 — QA Checklist (Option B Web CRM)

## Auth
- [ ] Login with seeded admin works
- [ ] Wrong password rejected
- [ ] Logout clears token; `/api/auth/me` returns 401
- [ ] Hardcoded desktop passwords do **not** work when `VITE_USE_API=true`

## Customers
- [ ] List / create / update / delete online
- [ ] Airplane mode: create customer → pending banner shows count
- [ ] Go online → Sync now → record appears on second browser / API

## Jobs / Vendors / Labour / Suppliers
- [ ] List loads from `/api/resources/{name}`
- [ ] Create via UI persists in MySQL (`crm_jobs`, `crm_vendors`, …)

## Inventory / Accounts
- [ ] Categories + items list online
- [ ] Stock movement / voucher create **blocked offline** (online-only rule)
- [ ] Purchases list from API

## Sync
- [ ] `POST /api/sync/push` accepts customers/jobs/vendors batch
- [ ] `GET /api/sync/pull?table=customers` returns rows
- [ ] Offline push of `vouchers` / `stock_movements` rejected

## Permissions (when wired)
- [ ] Employee role cannot open Settings
- [ ] API returns 401 without token

## Browser
- [ ] Chrome + Edge smoke
- [ ] Mobile viewport login + customer list

## Deploy smoke (after Phase 10)
- [ ] https://crm.malwatrolley.com loads SPA
- [ ] https://crm.malwatrolley.com/api/health → database ok
- [ ] https://crm.malwatrolley.com/api/docs reachable (or disabled in prod)

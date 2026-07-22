# Fresh go-live — crm.malwatrolley.com

## 1) Delete old Docker project
Hostinger → Docker → delete old `mt-crm-api` / `malwa_crm_*` completely.

## 2) New Docker (backend + MySQL only)
Compose URL:
```
https://raw.githubusercontent.com/sheddysmithlab-dot/MT_crm/main/docker-compose.yml
```
Project: `mt-crm-api`

Env (NO DATABASE_URL):
```
JWT_SECRET=long-random-secret
CORS_ORIGINS=https://crm.malwatrolley.com,http://200.97.171.119:8015
SEED_ADMIN_EMAIL=admin@malwatrolley.com
SEED_ADMIN_PASSWORD=Malwa#8224
MTCRM_API_PORT=8015
```

Firewall: allow TCP **8015**

Check: `http://200.97.171.119:8015/api/health/live` → build_id `fresh-20260722`

## 3) Frontend (File Manager) — fresh upload
1. Open crm.malwatrolley.com document root
2. Delete old files (index.html, assets/, api-bridge.php, api-backend.txt, old .htaccess)
3. Upload ALL from `deploy/frontend/` (or Desktop zip)
4. Hard refresh Ctrl+Shift+R

Frontend talks **direct** to API: `http://200.97.171.119:8015/api`  
(no PHP bridge)

## 4) Login
`admin@malwatrolley.com` / `Malwa#8224`

## Removed in this fresh build
- Browser auto-migration to `C:/malwa-crm`
- PHP api-bridge dependency
- host.docker.internal MySQL

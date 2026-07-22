# Docker — Hostinger Compose (BACKEND ONLY)

## Paste this URL in Hostinger Compose

```
https://raw.githubusercontent.com/sheddysmithlab-dot/MT_crm/main/docker-compose.yml
```

**Project name:** `mt-crm-api` (unique — other Docker apps untouched)

## What it deploys

| Item | Value |
|------|--------|
| Service | backend only (no frontend) |
| Container | `mt_crm_api` |
| Network | `mt_crm_net` (isolated) |
| Port on VPS | **8010** → container 8000 |

Frontend alag File Manager / `deploy/frontend` se upload karo.  
API: `http://VPS_IP:8010/api/health/live`

## Environment (Hostinger Compose → Environment / Variables)

```
DATABASE_URL=mysql+pymysql://u808821982_Malwa_crm:YOUR_PASSWORD@host.docker.internal:3306/u808821982_Malwa_crm?charset=utf8mb4
JWT_SECRET=long-random-secret-here
CORS_ORIGINS=https://crm.malwatrolley.com
MTCRM_API_PORT=8010
```

Agar MySQL connect na ho:

- `host.docker.internal` ki jagah hPanel ka MySQL **hostname** try karo
- Ya VPS ka private IP
- phpMyAdmin se confirm karo user remote/docker se allow hai

## After deploy

```
http://YOUR_VPS_IP:8010/api/health/live   → {"status":"alive"}
http://YOUR_VPS_IP:8010/api/health        → database ok/error
http://YOUR_VPS_IP:8010/api/docs
```

Seed admin (one time), Hostinger terminal / SSH:

```bash
docker exec -it mt_crm_api python -m scripts.seed_admin
```

## Why previous deploy failed

`malwa_crm_api is unhealthy` — usually:

1. Frontend waited on backend health while API never stayed up
2. `DATABASE_URL` missing → startup crash
3. Healthcheck needed DB before API was ready

New compose: **backend only**, health = `/api/health/live` (no DB required), API starts even if MySQL is down.

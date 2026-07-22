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

### Critical: frontend → API proxy

Built SPA uses `VITE_API_URL=https://crm.malwatrolley.com/api`.  
Docker API listens on **VPS port 8010**. Without Nginx proxy, login returns HTML and fails with `Cannot read properties of undefined (reading 'id')`.

Nginx (same VPS):

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8010/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Quick test in browser: `https://crm.malwatrolley.com/api/health/live` must show JSON `{"status":"alive"}` — not the login page HTML.

### Seed admin (one time)

Hostinger Compose env me bhi set karo:

```
SEED_ADMIN_EMAIL=admin@malwatrolley.com
SEED_ADMIN_PASSWORD=Malwa#8224
```

Phir:

```bash
docker exec -it mt_crm_api python -m scripts.seed_admin
```

Login: `admin@malwatrolley.com` / `Malwa#8224` (sirf seed ke baad).

## Why previous deploy failed

`malwa_crm_api is unhealthy` — usually:

1. Frontend waited on backend health while API never stayed up
2. `DATABASE_URL` missing → startup crash
3. Healthcheck needed DB before API was ready

New compose: **backend only**, health = `/api/health/live` (no DB required), API starts even if MySQL is down.

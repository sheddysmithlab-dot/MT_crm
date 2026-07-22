# Docker deploy on Hostinger VPS

## Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Frontend + API (uses **external** Hostinger MySQL) |
| `docker-compose.mysql.yml` | Frontend + API + **MySQL in Docker** |
| `Dockerfile.frontend` | React build + nginx |
| `backend/Dockerfile` | FastAPI |
| `docker/nginx.conf` | `/` → SPA, `/api` → backend |
| `.env.docker.example` | Env template |

## Option A — Hostinger MySQL already created (hPanel)

```bash
# On VPS
git clone https://github.com/sheddysmithlab-dot/MT_crm.git
cd MT_crm
cp .env.docker.example .env.docker
# Edit DATABASE_URL with real password for u808821982_Malwa_crm
# Import backend/sql/malwa_crm_Data_base.sql in phpMyAdmin first

docker compose --env-file .env.docker up -d --build
docker compose --env-file .env.docker exec backend python -m scripts.seed_admin
```

Open: `http://YOUR_VPS_IP`  
Point DNS `crm.malwatrolley.com` → VPS IP, then add SSL (Certbot / Hostinger).

## Option B — MySQL inside Docker

```bash
cp .env.docker.example .env.docker
# Set MYSQL_PASSWORD + JWT_SECRET
docker compose -f docker-compose.mysql.yml --env-file .env.docker up -d --build
docker compose -f docker-compose.mysql.yml --env-file .env.docker exec backend python -m scripts.seed_admin
```

## Useful commands

```bash
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f backend
docker compose --env-file .env.docker down
```

## Note

Shared Hostinger **without VPS/Docker** cannot run these files.  
Need **VPS** (or Docker-enabled plan) with Docker Engine + Compose installed.

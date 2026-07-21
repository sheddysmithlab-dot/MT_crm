# Malwa CRM — Deploy packages

```
deploy/
└── frontend/     → upload to crm.malwatrolley.com web root

backend/          → API source (upload this folder to VPS)
backend/sql/      → MySQL schema
```

## Build

```powershell
npm run build:deploy:all
```

- Frontend build → `deploy/frontend/`
- Backend package regenerated under `deploy/backend/` locally (gitignored; use `/backend` on GitHub)

## Frontend upload

Upload **contents** of `deploy/frontend/` to subdomain document root (include `.htaccess`).

## Backend upload

Upload the repo `backend/` folder to your VPS, then:

```bash
cp .env.example .env
pip install -r requirements.txt
# import sql/malwa_crm_Data_base.sql in phpMyAdmin
python -m scripts.seed_admin
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

See `docs/HOSTINGER_DEPLOY.md`.

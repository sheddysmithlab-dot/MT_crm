# Malwa CRM (MT_crm)

Online CRM for Malwa Trolley — **web Option B**: React frontend + Python FastAPI + MySQL.

## Repo layout

```
backend/          FastAPI API + SQL schema
src/              React frontend source
public/           Static assets
deploy/
  frontend/       Production SPA (upload to Hostinger web root)
  backend/        API package (upload to VPS)
docs/             Architecture & deploy guides
```

## Database

- Schema: `backend/sql/malwa_crm_Data_base.sql`
- Hostinger: select your DB first, then import (no `CREATE DATABASE`)
- Seed admin: `cd backend && python -m scripts.seed_admin`

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # set DATABASE_URL + JWT_SECRET
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
npm install
cp .env.example .env.local
# VITE_API_URL=http://127.0.0.1:8000/api
# VITE_USE_API=true
npm run dev
```

### Deploy packages

```bash
npm run build:deploy:all
```

Upload `deploy/frontend/` → `crm.malwatrolley.com`  
Upload `deploy/backend/` → VPS + Nginx `/api` proxy

## Docs

- `docs/BACKEND_COMPLETE_ARCHITECTURE.md`
- `docs/HOSTINGER_DEPLOY.md`
- `docs/WEB_MIGRATION_TODO.md`
- `deploy/README.md`
# MT_crm

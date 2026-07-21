# Malwa CRM API (Python FastAPI)

Online backend for Option B: MySQL source of truth + sync endpoints for browser offline queue.

## Quick start

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # then edit DATABASE_URL and JWT_SECRET
```

Create MySQL database `malwa_crm` and user, then:

```bash
python -m scripts.seed_admin
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health: http://127.0.0.1:8000/api/health  
- Docs: http://127.0.0.1:8000/api/docs  

## Main routes

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/health` | no |
| POST | `/api/auth/login` | no |
| GET | `/api/auth/me` | yes |
| POST | `/api/auth/logout` | yes |
| GET/POST/PUT/DELETE | `/api/customers` | yes |
| GET | `/api/resources` | yes — list resource names |
| GET/POST/PUT/DELETE | `/api/resources/{name}` | yes — jobs, vendors, labour, suppliers, inventory_*, purchases, vouchers, products, … |
| POST | `/api/sync/push` | yes |
| GET | `/api/sync/pull?table=customers&since=` | yes |

### Seed / migrate

```bash
python -m scripts.seed_admin
python -m scripts.migrate_from_json path/to/json_export
```

## Deploy (Hostinger VPS sketch)

1. Install Python 3.11+, MySQL, Nginx  
2. Clone repo, `pip install -r requirements.txt`  
3. systemd service running `uvicorn app.main:app --host 127.0.0.1 --port 8000`  
4. Nginx: `/` → frontend `dist`, `/api` → proxy to 8000  
5. SSL via Certbot  

See `docs/WEB_MIGRATION_TODO.md` for full phases.

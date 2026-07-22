#!/bin/sh
set -e

echo "[mt-crm] starting Malwa CRM API..."

if [ -z "$DATABASE_URL" ]; then
  echo "[mt-crm] WARNING: DATABASE_URL is empty — set it in Hostinger Compose environment"
fi

# Try create tables; never block API start if DB is temporarily unreachable
python - <<'PY' || echo "[mt-crm] create_all skipped/failed — API will still start"
from app.db.session import engine, Base
from app.db import models, models_extra, registry  # noqa: F401
try:
    Base.metadata.create_all(bind=engine)
    print("[mt-crm] tables ensured")
except Exception as e:
    print("[mt-crm] create_all error:", e)
PY

# Auto-seed Super Admin (idempotent). Set SEED_ADMIN_PASSWORD in Hostinger env.
python - <<'PY' || echo "[mt-crm] seed_admin skipped/failed — API will still start"
import os
from scripts.seed_admin import main
try:
    main()
except Exception as e:
    print("[mt-crm] seed_admin error:", e)
PY

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1

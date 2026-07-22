#!/bin/sh
set -e

echo "[mt-crm] starting Malwa CRM API..."

MYSQL_PASS="${MYSQL_PASSWORD:-mtcrm_pass_change_me}"
DOCKER_MYSQL_URL="mysql+pymysql://mtcrm:${MYSQL_PASS}@mt_crm_mysql:3306/malwa_crm?charset=utf8mb4"

# Hostinger Compose UI often injects DATABASE_URL=...@host.docker.internal...
# which overrides docker-compose.yml and crashes the API. Force Docker MySQL.
case "${DATABASE_URL:-}" in
  *host.docker.internal*|*127.0.0.1*|*localhost*|"")
    echo "[mt-crm] Overriding DATABASE_URL → Docker service mt_crm_mysql"
    export DATABASE_URL="$DOCKER_MYSQL_URL"
    ;;
esac

if [ "${FORCE_DOCKER_MYSQL:-1}" = "1" ]; then
  echo "[mt-crm] FORCE_DOCKER_MYSQL=1 — using mt_crm_mysql"
  export DATABASE_URL="$DOCKER_MYSQL_URL"
fi

echo "[mt-crm] DATABASE_URL host hint: $(echo "$DATABASE_URL" | sed -E 's#.*@([^:/]+).*#\1#')"

# Wait for MySQL (up to ~90s) so startup does not race
i=0
while [ "$i" -lt 30 ]; do
  if python - <<'PY'
import os, sys
from urllib.parse import urlparse
try:
    import pymysql
    u = urlparse(os.environ["DATABASE_URL"].replace("mysql+pymysql://", "mysql://", 1))
    pymysql.connect(
        host=u.hostname,
        port=u.port or 3306,
        user=u.username,
        password=u.password,
        database=(u.path or "/").lstrip("/") or None,
        connect_timeout=3,
    ).close()
    sys.exit(0)
except Exception as e:
    print("[mt-crm] waiting for MySQL:", e)
    sys.exit(1)
PY
  then
    echo "[mt-crm] MySQL is reachable"
    break
  fi
  i=$((i + 1))
  sleep 3
done

# Try create tables / add missing columns; never block API start
python - <<'PY' || echo "[mt-crm] migrate/create_all skipped/failed — API will still start"
from app.db.session import engine, Base
from app.db import models, models_extra, models_jobflow, registry  # noqa: F401
from scripts.migrate_add_columns import main as migrate_main
try:
    migrate_main()
except Exception as e:
    print("[mt-crm] migrate error:", e)
    try:
        Base.metadata.create_all(bind=engine)
        print("[mt-crm] tables ensured via create_all")
    except Exception as e2:
        print("[mt-crm] create_all error:", e2)
PY

# Auto-seed Super Admin (idempotent)
python - <<'PY' || echo "[mt-crm] seed_admin skipped/failed — API will still start"
from scripts.seed_admin import main
try:
    main()
except Exception as e:
    print("[mt-crm] seed_admin error:", e)
PY

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1

#!/bin/bash
set -euo pipefail
PASS='mtcrm_pass_change_me'

echo "=== current tables ==="
docker exec mt_crm_mysql mysql -umtcrm --password="$PASS" malwa_crm -N -e "SHOW TABLES;" | tee /tmp/mt_tables_before.txt
echo "COUNT_BEFORE=$(wc -l < /tmp/mt_tables_before.txt)"

echo "=== import full schema (IF NOT EXISTS) ==="
docker exec -i mt_crm_mysql mysql -umtcrm --password="$PASS" malwa_crm < /opt/mt-crm/backend/sql/malwa_crm_Data_base.sql

echo "=== sqlalchemy create_all (typed + registry) ==="
docker exec mt_crm_api python - <<'PY'
from app.db.session import engine, Base
from app.db import models, models_extra, registry  # noqa: F401
Base.metadata.create_all(bind=engine)
print("tables in metadata:", len(Base.metadata.tables))
print("ok create_all")
PY

echo "=== tables after ==="
docker exec mt_crm_mysql mysql -umtcrm --password="$PASS" malwa_crm -N -e "SHOW TABLES;" | tee /tmp/mt_tables_after.txt
echo "COUNT_AFTER=$(wc -l < /tmp/mt_tables_after.txt)"

echo "=== sample columns crm_customers ==="
docker exec mt_crm_mysql mysql -umtcrm --password="$PASS" malwa_crm -e "DESCRIBE crm_customers;"

echo "=== sample columns crm_estimates (flexible?) ==="
docker exec mt_crm_mysql mysql -umtcrm --password="$PASS" malwa_crm -e "DESCRIBE crm_estimates;" 2>&1 || true

echo "=== missing vs schema file ==="
grep -oE 'CREATE TABLE IF NOT EXISTS `?[a-zA-Z0-9_]+`?' /opt/mt-crm/backend/sql/malwa_crm_Data_base.sql | sed 's/CREATE TABLE IF NOT EXISTS //;s/`//g' | sort -u > /tmp/schema_tables.txt
sort -u /tmp/mt_tables_after.txt > /tmp/db_tables.txt
echo "SCHEMA=$(wc -l < /tmp/schema_tables.txt) DB=$(wc -l < /tmp/db_tables.txt)"
comm -23 /tmp/schema_tables.txt /tmp/db_tables.txt | head -50

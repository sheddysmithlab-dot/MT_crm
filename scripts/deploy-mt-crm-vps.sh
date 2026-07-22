#!/bin/bash
set -euo pipefail

echo "=== ports in use ==="
ss -tlnp | grep -E ':(80|443|8000|8010|8015|8080)\s' || true

echo "=== cleanup old workshop crm containers only ==="
docker rm -f mt_crm_api mt_crm_mysql malwa_crm_api malwa_crm_web malwa_crm_mysql 2>/dev/null || true
docker network rm mt_crm_net 2>/dev/null || true

mkdir -p /opt/mt-crm
cd /opt/mt-crm
if [ -d .git ]; then
  git fetch origin main
  git reset --hard origin/main
else
  git clone https://github.com/sheddysmithlab-dot/MT_crm.git .
fi
git log -1 --oneline

if command -v ufw >/dev/null 2>&1; then
  ufw allow 8015/tcp || true
fi

export JWT_SECRET="mtcrm-prod-secret-$(hostname)-2026"
export CORS_ORIGINS="https://crm.malwatrolley.com,http://200.97.171.119:8015"
export SEED_ADMIN_EMAIL="admin@malwatrolley.com"
export SEED_ADMIN_PASSWORD="Malwa#8224"
export MTCRM_API_PORT=8015
export FORCE_DOCKER_MYSQL=1

echo "=== docker compose up mt-crm ==="
docker compose -p mt-crm up -d --build

echo "=== waiting for health ==="
for i in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:8015/api/health/live" >/tmp/mt-health.json 2>/dev/null; then
    echo "OK live:"
    cat /tmp/mt-health.json
    echo
    curl -fsS "http://127.0.0.1:8015/api/health" || true
    echo
    break
  fi
  echo "wait $i ..."
  sleep 3
done

echo "=== containers ==="
docker compose -p mt-crm ps
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'

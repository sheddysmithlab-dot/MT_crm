/**
 * Prepare deploy/backend — Hostinger / VPS upload package (no .venv, no secrets).
 */
import {
  cpSync,
  mkdirSync,
  rmSync,
  existsSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'backend');
const out = join(root, 'deploy', 'backend');

const SKIP = new Set(['.venv', '__pycache__', '.env', '.pytest_cache', 'node_modules']);

function copyFiltered(from, to) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    if (SKIP.has(name) || name.endsWith('.pyc')) continue;
    const a = join(from, name);
    const b = join(to, name);
    const st = statSync(a);
    if (st.isDirectory()) {
      if (name === '__pycache__') continue;
      copyFiltered(a, b);
    } else {
      cpSync(a, b);
    }
  }
}

if (!existsSync(src)) {
  console.error('backend/ missing');
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
copyFiltered(src, out);

// Hostinger-oriented .env.example (user fills password)
writeFileSync(
  join(out, '.env.example'),
  `# Copy to .env and fill password from Hostinger hPanel
APP_NAME=Malwa CRM API
APP_ENV=production
DEBUG=false
API_PREFIX=/api

# Hostinger MySQL (from your hPanel)
# Database + User: u808821982_Malwa_crm
DATABASE_URL=mysql+pymysql://u808821982_Malwa_crm:YOUR_DB_PASSWORD@127.0.0.1:3306/u808821982_Malwa_crm?charset=utf8mb4

JWT_SECRET=CHANGE_TO_LONG_RANDOM_SECRET
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

CORS_ORIGINS=https://crm.malwatrolley.com,https://www.malwatrolley.com,http://localhost:5173

SEED_ADMIN_EMAIL=admin@malwatrolley.com
SEED_ADMIN_PASSWORD=ChangeMe822!
SEED_ADMIN_NAME=Malwa Admin
`,
  'utf8'
);

writeFileSync(
  join(out, 'DEPLOY.txt'),
  `Malwa CRM Backend — deploy package
================================

This folder is for Hostinger VPS / any server with Python 3.11+.

Shared Hostinger (PHP only) cannot run FastAPI directly.
Use: VPS, Cloud, or Node/Python-capable plan.

Quick start (VPS / SSH):
1. Upload this entire "backend" folder to server, e.g. /var/www/malwa-crm/backend
2. cp .env.example .env   → set YOUR_DB_PASSWORD + JWT_SECRET
3. python3 -m venv .venv
4. source .venv/bin/activate   (Windows: .venv\\Scripts\\activate)
5. pip install -r requirements.txt
6. Import sql/malwa_crm_Data_base.sql in phpMyAdmin (DB already selected)
7. python -m scripts.seed_admin
8. uvicorn app.main:app --host 127.0.0.1 --port 8000

Nginx: proxy /api → http://127.0.0.1:8000/api
Frontend: deploy/frontend → domain root

See README_DEPLOY.md for full steps.
`,
  'utf8'
);

writeFileSync(
  join(out, 'README_DEPLOY.md'),
  `# Backend deploy (Hostinger)

## Your MySQL (hPanel)

| Field | Value |
|-------|--------|
| Database | \`u808821982_Malwa_crm\` |
| User | \`u808821982_Malwa_crm\` |
| Domain | malwatrolley.com |

## 1. Import tables

phpMyAdmin → select \`u808821982_Malwa_crm\` → Import → \`sql/malwa_crm_Data_base.sql\`

## 2. Server requirements

- Python 3.11+
- Able to run long-running process (VPS / Cloud / systemd)

**Not supported:** plain shared hosting with only PHP + no SSH process manager.

## 3. Install

\`\`\`bash
cd /path/to/backend
cp .env.example .env
# edit .env — password + JWT_SECRET

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m scripts.seed_admin
\`\`\`

## 4. Run

\`\`\`bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
\`\`\`

Or systemd — see \`docs/HOSTINGER_DEPLOY.md\` in the main repo.

## 5. Nginx

\`\`\`nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
\`\`\`

Frontend files go in domain root (\`deploy/frontend\`).
API docs (dev): http://SERVER:8000/api/docs
`,
  'utf8'
);

// Windows helper
writeFileSync(
  join(out, 'start-api.bat'),
  `@echo off
cd /d "%~dp0"
if not exist .venv (
  python -m venv .venv
  call .venv\\Scripts\\activate
  pip install -r requirements.txt
) else (
  call .venv\\Scripts\\activate
)
if not exist .env copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
`,
  'utf8'
);

writeFileSync(
  join(out, 'start-api.sh'),
  `#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
else
  source .venv/bin/activate
fi
[ -f .env ] || cp .env.example .env
exec uvicorn app.main:app --host 127.0.0.1 --port 8000
`,
  'utf8'
);

console.log('Backend deploy folder ready:', out);

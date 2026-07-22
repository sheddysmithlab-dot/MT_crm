/**
 * Copy Vite dist/ → deploy/frontend/ for Hostinger upload.
 */
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, 'deploy', 'frontend');

if (!existsSync(dist)) {
  console.error('dist/ missing. Run: npm run build');
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(dist, out, { recursive: true });

writeFileSync(
  join(out, 'DEPLOY.txt'),
  [
    'Malwa CRM Frontend — FRESH upload to Hostinger File Manager',
    '',
    'Target: crm.malwatrolley.com document root',
    'API (direct): http://200.97.171.119:8015/api',
    '',
    '1. DELETE old files in document root (index, assets, api-bridge*, api-backend*)',
    '2. Upload ALL files from this folder',
    '3. Show hidden files → ensure .htaccess uploaded',
    '4. Hard refresh browser',
    '5. Login: admin@malwatrolley.com / Malwa#8224',
    '',
    'No PHP api-bridge needed — SPA calls Docker API directly.',
    '',
  ].join('\n'),
  'utf8'
);

console.log('Deploy folder ready:', out);

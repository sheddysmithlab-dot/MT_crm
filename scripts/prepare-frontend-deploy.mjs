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
    'Malwa CRM Frontend — upload these files to Hostinger',
    '',
    'Target: crm.malwatrolley.com document root',
    'API expected at: https://crm.malwatrolley.com/api',
    '',
    'Required for API login:',
    '- .htaccess  (routes /api → api-bridge.php)',
    '- api-bridge.php',
    '- api-backend.txt  (default http://127.0.0.1:8010)',
    '',
    'Steps:',
    '1. File Manager → crm.malwatrolley.com document root',
    '2. Upload ALL files (overwrite). Show hidden files for .htaccess',
    '3. Test: https://crm.malwatrolley.com/api/health/live → JSON alive',
    '4. Login: admin@malwatrolley.com / Malwa#8224',
    '',
  ].join('\n'),
  'utf8'
);

console.log('Deploy folder ready:', out);

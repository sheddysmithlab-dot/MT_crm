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
    'Steps:',
    '1. File Manager → open subdomain folder (or public_html)',
    '2. Upload ALL files from this folder (index.html, assets/, .htaccess, …)',
    '3. Ensure .htaccess is uploaded (enable "Show hidden files")',
    '4. Open https://crm.malwatrolley.com',
    '',
  ].join('\n'),
  'utf8'
);

console.log('Deploy folder ready:', out);

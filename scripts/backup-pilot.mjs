import { mkdirSync, chmodSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

if (!process.argv.includes('--maintenance')) throw new Error('Database exports briefly block requests. Run outside class time with: npm run pilot:backup -- --maintenance. The teacher dashboard backup does not require a maintenance export.');
const dir = resolve('.pilot-private');
mkdirSync(dir, { recursive: true, mode: 0o700 });
const file = join(dir, `pilot-database-${new Date().toISOString().replaceAll(':', '-')}.sql`);
if (existsSync(file)) throw new Error('Backup target already exists. Nothing was overwritten.');
const originalMask = process.umask(0o077);
try {
  execFileSync('npx', ['wrangler', 'd1', 'export', 'auralith-classroom-pilot', '--remote', '--output', file], { stdio: 'pipe' });
  chmodSync(file, 0o600);
  console.log(`Private database backup saved: ${file}. Store an independent copy privately; do not publish it.`);
} catch {
  console.error('Backup did not complete. The live database was not changed. Inspect any partial private export before relying on it.');
  process.exitCode = 1;
} finally { process.umask(originalMask); }

#!/usr/bin/env node
/**
 * Fail CI if any E2E probe uses `localhost:8080` — Windows can resolve `localhost`
 * to IPv6 while Vite binds IPv4, causing flaky Cypress vs probe mismatches.
 *
 * Scans package.json and every .mjs file under the scripts directory (recursive).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const BAD = 'localhost:8080';

function walkScripts(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkScripts(p, acc);
    else if (name.endsWith('.mjs')) acc.push(p);
  }
  return acc;
}

const failures = [];

function checkFile(label, path, content) {
  if (content.includes(BAD)) {
    failures.push(`${label}: ${path} contains "${BAD}"`);
  }
}

checkFile(
  'package.json',
  join(root, 'package.json'),
  readFileSync(join(root, 'package.json'), 'utf8')
);

for (const f of walkScripts(join(root, 'scripts'))) {
  if (basename(f) === 'lint-e2e-port.mjs') continue;
  checkFile('script', f, readFileSync(f, 'utf8'));
}

if (failures.length) {
  console.error('[lint-e2e-port] Use 127.0.0.1:8080 for the app probe (see scripts/lib/e2e-port.mjs).\n');
  for (const line of failures) console.error(`  ${line}`);
  process.exit(1);
}

console.log('[lint-e2e-port] OK — no forbidden localhost:8080 in package.json scripts scan');

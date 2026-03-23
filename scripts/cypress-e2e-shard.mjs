#!/usr/bin/env node
/**
 * Run Cypress E2E against a slice of spec files (for CI parallel jobs).
 *
 * Env:
 *   CYPRESS_SHARD        — 1-based shard index (default: 1)
 *   CYPRESS_SHARD_TOTAL  — number of shards (default: 1 = run full suite, no --spec)
 *
 * Delegates to start-server-and-test like npm run e2e:ci.
 */
import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const e2eDir = join(root, 'cypress', 'e2e');

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p, acc);
    } else if (/\.(js|ts)$/.test(name) && !name.endsWith('.d.ts')) {
      acc.push(p);
    }
  }
  return acc;
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

const allSpecs = walk(e2eDir)
  .sort((a, b) => a.localeCompare(b))
  .map((p) => toPosix(relative(root, p)));

const shard = Math.max(1, parseInt(process.env.CYPRESS_SHARD || '1', 10) || 1);
const total = Math.max(
  1,
  parseInt(process.env.CYPRESS_SHARD_TOTAL || '1', 10) || 1
);

let specList = allSpecs;
if (total > 1) {
  const size = Math.ceil(allSpecs.length / total);
  const start = (shard - 1) * size;
  const end = Math.min(start + size, allSpecs.length);
  specList = allSpecs.slice(start, end);
  console.log(
    `[cypress-e2e-shard] shard ${shard}/${total} — ${specList.length} spec file(s) (${start + 1}-${end} of ${allSpecs.length})`
  );
} else {
  console.log(
    `[cypress-e2e-shard] full suite — ${specList.length} spec file(s)`
  );
}

if (specList.length === 0) {
  console.log('[cypress-e2e-shard] nothing to run for this shard; exit 0.');
  process.exit(0);
}

const specArg = specList.join(',');
const cypressCmd = total > 1 ? `cypress run --spec ${specArg}` : 'cypress run';

// One shell string so Windows cmd / PowerShell parse the last argument like npm scripts do.
const fullCmd = `npx start-server-and-test "npm run start:api" http-get://localhost:3001 "npm run dev" http-get://localhost:8080 "${cypressCmd.replace(/"/g, '\\"')}"`;

try {
  execSync(fullCmd, {
    stdio: 'inherit',
    cwd: root,
    shell: true,
    env: process.env,
  });
  process.exit(0);
} catch (e) {
  const code =
    e && typeof e === 'object' && 'status' in e && typeof e.status === 'number'
      ? e.status
      : 1;
  process.exit(code);
}

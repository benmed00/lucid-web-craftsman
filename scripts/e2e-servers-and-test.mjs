#!/usr/bin/env node
/**
 * Mirrors `pnpm run e2e:ci*` / `e2e:checkout` / `e2e:contact` stack in one place so the
 * SPA probe URL stays in sync with `scripts/lib/e2e-port.mjs` (`VITE_DEV_SERVER_PORT`).
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { E2E_PROBE_URL } from './lib/e2e-port.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const cypressArgv = process.argv.slice(2);
if (cypressArgv.length === 0) {
  console.error(
    'Usage: node scripts/e2e-servers-and-test.mjs <cypress args...>\n' +
      'Example: node scripts/e2e-servers-and-test.mjs cypress run --env grep=@smoke'
  );
  process.exit(1);
}

const cypressCmd = cypressArgv.join(' ');
const probeTail = E2E_PROBE_URL.replace(/^https?:\/\//, '');
const fullCmd = `npx start-server-and-test "pnpm run start:api" http-get://localhost:3001 "pnpm run dev:e2e" http-get://${probeTail} "${cypressCmd.replace(/"/g, '\\"')}"`;

try {
  execSync(fullCmd, {
    stdio: 'inherit',
    cwd: root,
    shell: true,
    env: process.env,
  });
} catch {
  try {
    execSync('node scripts/report-e2e-http-failures.mjs', {
      stdio: 'inherit',
      cwd: root,
      env: process.env,
    });
  } catch {
    // Report script is best-effort; exit with Cypress failure either way.
  }
  process.exit(1);
}

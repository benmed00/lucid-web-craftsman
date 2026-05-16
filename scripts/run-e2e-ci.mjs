#!/usr/bin/env node
/**
 * CI-style E2E: mock API (3001) → Vite dev (`pnpm run dev:e2e`) → Cypress.
 * The SPA probe URL matches `vite.config.ts` / `cypress.config.ts` via
 * `scripts/lib/e2e-port.mjs`.
 *
 * When **8080** is taken (e.g. Apache `httpd.exe` on Windows), run with another port:
 *   cross-env VITE_DEV_SERVER_PORT=5173 pnpm run e2e:ci:smoke
 * (PowerShell: `$env:VITE_DEV_SERVER_PORT='5173'; pnpm run e2e:ci:smoke`)
 *
 * Prerequisites: ports free for mock API + chosen Vite port; optional `pnpm run kill` frees 8080.
 *
 * Usage:
 *   node scripts/run-e2e-ci.mjs cypress run --env grep=@smoke
 */

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { E2E_HTTP_GET_PROBE } from './lib/e2e-port.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const testCmd = process.argv.slice(2).join(' ').trim();
if (!testCmd) {
  console.error(
    'run-e2e-ci: missing Cypress command.\nExample: node scripts/run-e2e-ci.mjs cypress run --env grep=@smoke'
  );
  process.exit(1);
}

let sstBin;
try {
  const pkgJson = require.resolve('start-server-and-test/package.json');
  sstBin = path.join(path.dirname(pkgJson), 'src', 'bin', 'start.js');
} catch {
  console.error('run-e2e-ci: start-server-and-test is not installed.');
  process.exit(1);
}

const cliArgs = [
  'pnpm run start:api',
  'http-get://localhost:3001',
  'pnpm run dev:e2e',
  E2E_HTTP_GET_PROBE,
  testCmd,
];

const res = spawnSync(process.execPath, [sstBin, ...cliArgs], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
});

process.exit(res.status ?? 1);

#!/usr/bin/env node
/**
 * **E2E diagnostic:** after Cypress fails, print **mock vs PostgREST vs Edge** hints
 * for each **HTTP 4xx/5xx** recorded during failing tests.
 *
 * ## Data flow
 *
 * 1. Browser: [`networkFailureCapture.ts`](../cypress/support/networkFailureCapture.ts) intercepts **`4xx`/`5xx`**
 *    on failed tests (`support/index.ts` imports it).
 * 2. Node: **`recordHttpFailures`** task + **`after:run`** in [`cypress.config.ts`](../cypress.config.ts) merge batches and write
 *    **`cypress/diagnostics/http-failures.json`** (gitignored).
 * 3. This script reads that JSON and prints **[`classifyApiLayer`](./lib/classify-api-layer.mjs)** output per failing URL.
 *
 * ## When it runs
 *
 * - **`package.json`** `e2e:ci*` entrypoints use **`start-server-and-test`** inline — they **do not**
 *   call this script unless you adopt a wrapper (e.g. `e2e-servers-and-test.mjs`) that invokes it **on Cypress exit ≠ 0**.
 * - You can always run it **manually** after a local failure once `http-failures.json` exists:
 *   `node scripts/report-e2e-http-failures.mjs`
 *
 * Exits **0** even on missing file / empty errors (stderr only — best-effort for CI logs).
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PLATFORM_ANCHOR,
  classifyApiLayer,
} from './lib/classify-api-layer.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'cypress', 'diagnostics', 'http-failures.json');

console.error(
  '\n[diag] E2E run failed — HTTP layer hints (automated capture):\n'
);

try {
  const raw = await readFile(reportPath, 'utf8');
  const data = JSON.parse(raw);
  const errors = data.httpErrors ?? [];
  const failedTests = data.failedTests ?? 0;

  if (failedTests === 0) {
    console.error('[diag] Report exists but totalFailed was 0 — ignoring.');
    process.exit(0);
  }

  if (errors.length === 0) {
    console.error(
      `  No HTTP 4xx/5xx were recorded during failing tests (${failedTests} failed).\n` +
        '  The failure may be DOM, timeout, assertion, or a request that did not complete.\n' +
        `  See: ${PLATFORM_ANCHOR}\n`
    );
    process.exit(0);
  }

  /** @type {Map<string, number>} */
  const byUrl = new Map();
  for (const row of errors) {
    const u = row.url;
    if (!u) continue;
    const prev = byUrl.get(u) ?? row.status ?? 0;
    byUrl.set(u, row.status ?? prev);
  }

  for (const [url, status] of byUrl) {
    const { label, detail } = classifyApiLayer(url);
    console.error(`  ${status}  ${url}`);
    console.error(`      → ${label}: ${detail}\n`);
  }

  console.error(`  Full list: ${reportPath}`);
  console.error(`  Guide: ${PLATFORM_ANCHOR}\n`);
} catch (e) {
  if (/** @type {NodeJS.ErrnoException} */ (e).code === 'ENOENT') {
    console.error(
      `  No diagnostic file at ${reportPath}.\n` +
        '  (Cypress may have failed before tests ran, or the diagnostic hook did not write.)\n' +
        `  See: ${PLATFORM_ANCHOR}\n`
    );
    process.exit(0);
  }
  console.error('[diag] Could not read diagnostic file:', e);
  process.exit(0);
}

process.exit(0);

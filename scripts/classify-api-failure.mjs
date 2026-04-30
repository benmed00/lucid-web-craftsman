#!/usr/bin/env node
/**
 * **CLI helper:** classify a pasted URL or path → which API layer this app uses.
 *
 * Wraps **[`./lib/classify-api-layer.mjs`](./lib/classify-api-layer.mjs)** (`classifyApiLayer`).
 * No network I/O — only string parsing rules (same as E2E failure reporter).
 *
 * ## Typical use
 *
 * - Debugging: copy the failing URL from DevTools Network or Cypress logs, run this locally.
 * - Piping: `rg 'https:' my-log.txt | head -1 | node scripts/classify-api-failure.mjs`
 *
 * ## Usage
 *
 * ```bash
 * node scripts/classify-api-failure.mjs "https://xxx.supabase.co/rest/v1/products"
 * node scripts/classify-api-failure.mjs "/api/posts"
 * echo "/api/products" | node scripts/classify-api-failure.mjs
 * ```
 *
 * Exits **0** always (informational only).
 */
import { createInterface } from 'node:readline';
import {
  PLATFORM_ANCHOR,
  classifyApiLayer,
} from './lib/classify-api-layer.mjs';

function readOneLine() {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, terminal: false });
    rl.once('line', (line) => {
      rl.close();
      resolve(line);
    });
    rl.once('close', () => resolve(''));
  });
}

const arg = process.argv[2];

if (arg === undefined && process.stdin.isTTY) {
  console.error(
    'Usage: node scripts/classify-api-failure.mjs <url-or-path>\n' +
      '   Or: echo "<url-or-path>" | node scripts/classify-api-failure.mjs'
  );
  console.error(`More: ${PLATFORM_ANCHOR}`);
  process.exit(0);
}

const input = arg ?? (await readOneLine());
const { label, detail } = classifyApiLayer(input);

console.log(`Layer: ${label}`);
console.log(`Note: ${detail}`);
console.log(`See: ${PLATFORM_ANCHOR}`);
process.exit(0);

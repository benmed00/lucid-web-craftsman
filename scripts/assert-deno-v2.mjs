#!/usr/bin/env node
/**
 * Fail fast when Deno is missing or not v2 (pricing snapshot / create-payment scripts).
 */
import { spawnSync } from 'node:child_process';

const r = spawnSync('deno', ['--version'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
if (r.status !== 0 || !r.stdout) {
  console.error(
    '[assert-deno-v2] deno not found on PATH — install Deno v2 (see README / AGENTS.md).'
  );
  process.exit(1);
}
const firstLine = r.stdout.split(/\r?\n/)[0]?.trim() ?? '';
if (!/^deno\s+2\./i.test(firstLine)) {
  console.error(
    `[assert-deno-v2] Expected Deno 2.x, got "${firstLine}". Run: deno upgrade`
  );
  process.exit(1);
}

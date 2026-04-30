#!/usr/bin/env node
/**
 * verify-pricing-snapshot-offline.mjs
 *
 * Confirms that the Deno pricing-snapshot test suite runs:
 *   1. Without reading any environment variable (static `rg` audit + runtime `env -i` run).
 *   2. Without any network access (Deno `--cached-only`, no `--allow-net`).
 *
 * Usage:
 *   node scripts/verify-pricing-snapshot-offline.mjs
 *   npm run verify:pricing-snapshot:offline
 *
 * Exit codes:
 *   0  all checks passed
 *   1  a check failed (see summary)
 *   2  prerequisite missing (deno / rg not on PATH)
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);

// Files exercised by `npm run test:pricing-snapshot:deno` — keep in sync with package.json.
const TEST_FILES = [
  'supabase/functions/_shared/pricing-snapshot_test.ts',
  'supabase/functions/_shared/pricing_snapshot_golden_test.ts',
  'supabase/functions/_shared/pricing_snapshot_extended_test.ts',
  'supabase/functions/_shared/persist-pricing-snapshot_test.ts',
  'supabase/functions/_shared/confirm-order_test.ts',
  'supabase/functions/stripe-webhook/lib/pricing-snapshot_test.ts',
  'supabase/functions/send-order-confirmation/_lib/email-pricing-from-db_test.ts',
];

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};
const tty = process.stdout.isTTY;
const c = (color, s) => (tty ? `${C[color]}${s}${C.reset}` : s);

const results = [];
function record(name, status, detail = '') {
  results.push({ name, status, detail });
  const icon =
    status === 'pass' ? c('green', '✓') : status === 'fail' ? c('red', '✗') : c('yellow', '!');
  console.log(`  ${icon} ${name}${detail ? c('dim', `  — ${detail}`) : ''}`);
}

function which(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
    encoding: 'utf8',
  });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
}

function header(title) {
  console.log(`\n${c('bold', c('cyan', `▌ ${title}`))}`);
}

// ───────────────────────── Step 0: prerequisites ─────────────────────────
header('Prerequisites');

const denoPath = which('deno');
if (!denoPath) {
  record('deno on PATH', 'fail', 'install Deno v2 — see README "Dépannage"');
  process.exit(2);
}
record('deno on PATH', 'pass', denoPath);

const denoVer = spawnSync('deno', ['--version'], { encoding: 'utf8' });
const denoFirstLine = (denoVer.stdout || '').split(/\r?\n/)[0]?.trim() ?? '';
if (!/^deno\s+2\./i.test(denoFirstLine)) {
  record('deno v2.x', 'fail', `got "${denoFirstLine}" — run \`deno upgrade\``);
  process.exit(2);
}
record('deno v2.x', 'pass', denoFirstLine);

const rgPath = which('rg');
if (!rgPath) {
  record('rg (ripgrep) on PATH', 'warn', 'static audit will fall back to grep');
} else {
  record('rg (ripgrep) on PATH', 'pass', rgPath);
}

for (const f of TEST_FILES) {
  if (!existsSync(resolve(REPO_ROOT, f))) {
    record(`fixture present: ${f}`, 'fail', 'file missing — update TEST_FILES');
    process.exit(2);
  }
}
record(`${TEST_FILES.length} test files present`, 'pass');

// ───────────────────────── Step 1: static env-var audit (rg) ─────────────────────────
header('Static audit — no env-var reads in test files');

const ENV_PATTERNS = [
  String.raw`Deno\.env\.(get|toObject|has|set|delete)\b`,
  String.raw`process\.env\b`,
];
const combined = ENV_PATTERNS.join('|');

let auditCmd;
let auditArgs;
if (rgPath) {
  auditCmd = 'rg';
  auditArgs = ['-n', '--no-heading', '-e', combined, ...TEST_FILES];
} else {
  // Portable fallback: grep -E across the listed files.
  auditCmd = 'grep';
  auditArgs = ['-nE', combined, ...TEST_FILES];
}

const audit = spawnSync(auditCmd, auditArgs, { cwd: REPO_ROOT, encoding: 'utf8' });
// Both rg and grep: exit 0 = matches found (BAD), exit 1 = no match (GOOD), >1 = error.
if (audit.status === 0) {
  console.log(c('dim', audit.stdout.trimEnd()));
  record(
    'no Deno.env / process.env in test files',
    'fail',
    'matches above — tests would depend on env vars',
  );
} else if (audit.status === 1) {
  record('no Deno.env / process.env in test files', 'pass', `0 matches across ${TEST_FILES.length} files`);
} else {
  record('static audit ran cleanly', 'fail', `exit ${audit.status}: ${audit.stderr.trim()}`);
}

// ───────────────────────── Step 2: runtime — env-stripped Deno run ─────────────────────────
header('Runtime — `env -i` + `--cached-only` (no env, no network)');

// Build the deno test command identical to `test:pricing-snapshot:deno` minus
// `--allow-env` (we want to prove it isn't needed) plus `--cached-only` (no net).
const denoArgs = [
  'test',
  '--cached-only',
  '--allow-read=.',
  '--no-check',
  '--config',
  'supabase/functions/deno.json',
  ...TEST_FILES,
];

let runner;
let runnerArgs;
if (process.platform === 'win32') {
  // No `env -i` on Windows — use a minimal env object directly.
  runner = 'deno';
  runnerArgs = denoArgs;
  console.log(
    c('yellow', '  ! `env -i` unavailable on Windows; spawning deno with a minimal env instead.'),
  );
} else {
  runner = 'env';
  runnerArgs = ['-i', `PATH=${process.env.PATH ?? ''}`, `HOME=${process.env.HOME ?? ''}`, 'deno', ...denoArgs];
}

console.log(c('dim', `  $ ${runner} ${runnerArgs.join(' ')}`));
const t0 = Date.now();
const run = spawnSync(runner, runnerArgs, {
  cwd: REPO_ROOT,
  encoding: 'utf8',
  // Empty env on POSIX is enforced by `env -i`; on Windows we mimic it here.
  env: process.platform === 'win32' ? { PATH: process.env.PATH ?? '', HOMEPATH: process.env.HOMEPATH ?? '' } : undefined,
});
const elapsedMs = Date.now() - t0;

const stdout = run.stdout ?? '';
const stderr = run.stderr ?? '';
// Show full output so failures are debuggable.
if (stdout) process.stdout.write(stdout);
if (stderr) process.stderr.write(stderr);

// Parse the Deno summary line, e.g. "ok | 26 passed | 0 failed (842ms)".
const summary = stdout.match(/^(ok|FAILED)\s*\|\s*(\d+)\s+passed\s*\|\s*(\d+)\s+failed[^\n]*$/m);

if (run.status === 0 && summary && summary[1] === 'ok' && summary[3] === '0') {
  record(
    'deno test (no --allow-env, no --allow-net, --cached-only)',
    'pass',
    `${summary[2]} passed in ${elapsedMs} ms`,
  );
} else if (/Specifier not found in cache/i.test(stderr) || /Cached only/i.test(stderr)) {
  record(
    'deno test offline',
    'fail',
    'cache not warmed — run once online: see README "Préparer le cache Deno"',
  );
} else if (/PermissionDenied: Requires (env|net) access/i.test(stderr)) {
  record(
    'deno test offline',
    'fail',
    'a test tried to read env/network — fix the test, do NOT add --allow-env/--allow-net here',
  );
} else {
  record(
    'deno test offline',
    'fail',
    `exit ${run.status}; see output above (elapsed ${elapsedMs} ms)`,
  );
}

// ───────────────────────── Final summary ─────────────────────────
header('Summary');

const pass = results.filter((r) => r.status === 'pass').length;
const fail = results.filter((r) => r.status === 'fail').length;
const warn = results.filter((r) => r.status === 'warn').length;

console.log(`  ${c('green', `${pass} passed`)}  ·  ${c('red', `${fail} failed`)}  ·  ${c('yellow', `${warn} warnings`)}`);

if (fail === 0) {
  console.log(
    `\n${c('green', c('bold', '✓ pricing-snapshot suite is provably offline & env-free'))}`,
  );
  console.log(
    c(
      'dim',
      '  No env vars read · no network access · safe to run in air-gapped CI / on a plane.',
    ),
  );
  process.exit(0);
} else {
  console.log(`\n${c('red', c('bold', '✗ verification failed — see failures above'))}`);
  process.exit(1);
}

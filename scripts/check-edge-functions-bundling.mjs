#!/usr/bin/env node
/**
 * Pre-deploy bundling check for Supabase Edge Functions.
 *
 * Fails fast (non-zero exit) when:
 *   1. A function imports from a sibling function's directory (Supabase
 *      bundles each function in isolation — these imports resolve locally
 *      with `deno check` but break the hosted bundler).
 *      Only `_shared/` and the function's own subdirs are allowed via `../`.
 *   2. `deno check` on the function's `index.ts` reports any error
 *      (missing modules, type errors, etc.).
 *
 * Usage:
 *   node scripts/check-edge-functions-bundling.mjs            # check all
 *   node scripts/check-edge-functions-bundling.mjs fn1 fn2    # subset
 *
 * Requires: Deno v2 on PATH (same as `npm run verify:create-payment`).
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const functionsRoot = path.join(root, 'supabase', 'functions');

const SKIP = new Set(['_shared', 'tests', 'node_modules']);
const ALLOWED_PARENT_DIRS = new Set(['_shared']);

function listFunctions(filter) {
  const names = [];
  for (const name of fs.readdirSync(functionsRoot)) {
    if (SKIP.has(name) || name.startsWith('.')) continue;
    const dir = path.join(functionsRoot, name);
    let st;
    try {
      st = fs.statSync(dir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    if (!fs.existsSync(path.join(dir, 'index.ts'))) continue;
    if (filter && filter.length && !filter.includes(name)) continue;
    names.push(name);
  }
  return names.sort((a, b) => a.localeCompare(b));
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const IMPORT_RE =
  /(?:import|export)\s+(?:[^'"`;]+?\s+from\s+)?['"`]([^'"`]+)['"`]/g;

function findCrossFunctionImports(fnName) {
  const fnDir = path.join(functionsRoot, fnName);
  const violations = [];
  for (const file of walk(fnDir)) {
    const src = fs.readFileSync(file, 'utf8');
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(src)) !== null) {
      const spec = m[1];
      if (!spec.startsWith('.')) continue;
      const resolved = path.resolve(path.dirname(file), spec);
      const rel = path.relative(functionsRoot, resolved);
      if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
      const topDir = rel.split(path.sep)[0];
      if (topDir === fnName) continue;
      if (ALLOWED_PARENT_DIRS.has(topDir)) continue;
      violations.push({
        file: path.relative(root, file),
        spec,
        resolvedTo: rel,
      });
    }
  }
  return violations;
}

function denoCheck(fnName) {
  const entry = path.join(functionsRoot, fnName, 'index.ts');
  const result = spawnSync('deno', ['check', '--quiet', entry], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.error) {
    return {
      ok: false,
      output: `deno not available: ${result.error.message}`,
    };
  }
  if (result.status !== 0) {
    return {
      ok: false,
      output: (result.stderr || result.stdout || '').trim(),
    };
  }
  return { ok: true, output: '' };
}

const argv = process.argv.slice(2);
const skipDeno = argv.includes('--no-deno');
const filter = argv.filter((a) => !a.startsWith('--'));
const functions = listFunctions(filter);

if (functions.length === 0) {
  console.error('No functions found under', functionsRoot);
  process.exit(1);
}

console.error(
  `Pre-deploy bundling check: ${functions.length} function(s)${
    skipDeno ? ' (skipping deno check)' : ''
  }\n`
);

let failed = 0;
for (const fn of functions) {
  const violations = findCrossFunctionImports(fn);
  let denoResult = { ok: true, output: '' };
  if (!skipDeno) denoResult = denoCheck(fn);

  if (violations.length === 0 && denoResult.ok) {
    console.error(`  ✓ ${fn}`);
    continue;
  }

  failed++;
  console.error(`  ✗ ${fn}`);
  for (const v of violations) {
    console.error(
      `      cross-function import: ${v.spec}  (in ${v.file}) → ${v.resolvedTo}`
    );
  }
  if (!denoResult.ok) {
    const head = denoResult.output.split('\n').slice(0, 8).join('\n      ');
    console.error(`      deno check failed:\n      ${head}`);
  }
}

if (failed > 0) {
  console.error(
    `\n${failed} function(s) failed bundling check. Move shared code to supabase/functions/_shared/.`
  );
  process.exit(1);
}

console.error('\nAll functions passed bundling check.');

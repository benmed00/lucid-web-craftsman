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
 *   node scripts/check-edge-functions-bundling.mjs \
 *     --report-json reports/bundling.json \
 *     --report-html reports/bundling.html                     # write artifacts
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

function lineColForOffset(src, offset) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < src.length; i++) {
    if (src[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}

function resolveImportTarget(absPath) {
  // Mirror Deno's resolution for relative specifiers: try the path as-is,
  // then with .ts/.tsx/.js/.mjs/.mts extensions, then index.ts inside a dir.
  if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) return absPath;
  const exts = ['.ts', '.tsx', '.js', '.mjs', '.mts'];
  for (const ext of exts) {
    if (fs.existsSync(absPath + ext)) return absPath + ext;
  }
  if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
    for (const ext of exts) {
      const idx = path.join(absPath, 'index' + ext);
      if (fs.existsSync(idx)) return idx;
    }
  }
  return null;
}

function findCrossFunctionImports(fnName) {
  const fnDir = path.join(functionsRoot, fnName);
  const violations = [];
  const missing = [];
  for (const file of walk(fnDir)) {
    const src = fs.readFileSync(file, 'utf8');
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(src)) !== null) {
      const spec = m[1];
      if (!spec.startsWith('.')) continue;
      const resolved = path.resolve(path.dirname(file), spec);
      const { line, col } = lineColForOffset(src, m.index);
      const importerRel = path.relative(root, file);

      // Detect imports whose resolved target does not exist on disk.
      const target = resolveImportTarget(resolved);
      if (!target) {
        missing.push({
          file: importerRel,
          spec,
          line,
          col,
          expectedPath: path.relative(root, resolved),
        });
        continue;
      }

      const rel = path.relative(functionsRoot, resolved);
      if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
      const topDir = rel.split(path.sep)[0];
      if (topDir === fnName) continue;
      if (ALLOWED_PARENT_DIRS.has(topDir)) continue;
      violations.push({
        file: importerRel,
        spec,
        line,
        col,
        resolvedTo: rel,
        suggestion: `mv this module to supabase/functions/_shared/ and import from '../_shared/...'`,
      });
    }
  }
  return { violations, missing };
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

function parseDenoErrors(output) {
  // Extract structured info from "Module not found" / "Relative import path"
  // / "Cannot resolve module" deno error lines, e.g.:
  //   error: Module not found "file:///.../foo.ts".
  //       at file:///.../bar.ts:4:32
  const issues = [];
  const lines = output.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const mModule = line.match(
      /(?:Module not found|Cannot resolve module|Relative import path[^"]*"([^"]+)"[^"]*not (?:prefixed|found))/
    );
    if (!mModule && !/error:/i.test(line)) continue;

    const missingMatch =
      line.match(/Module not found\s+"([^"]+)"/i) ||
      line.match(/Cannot resolve module\s+"([^"]+)"/i) ||
      line.match(/"([^"]+)"\s+not (?:prefixed|found)/i);
    const missing = missingMatch ? missingMatch[1] : null;

    // Look ahead for the "at file://..." location line
    let location = null;
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const at = lines[j].match(/at\s+(file:\/\/[^\s:]+):(\d+):(\d+)/);
      if (at) {
        const filePath = fileURLToPath(at[1]);
        location = {
          file: path.relative(root, filePath),
          line: Number(at[2]),
          col: Number(at[3]),
        };
        break;
      }
    }

    issues.push({
      message: line.replace(/^error:\s*/i, '').trim(),
      missing: missing ? toRelative(missing) : null,
      location,
    });
  }
  return issues;
}

function toRelative(maybeFileUrl) {
  if (maybeFileUrl.startsWith('file://')) {
    try {
      return path.relative(root, fileURLToPath(maybeFileUrl));
    } catch {
      return maybeFileUrl;
    }
  }
  return maybeFileUrl;
}

function parseFlagValue(args, name) {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    return args[idx + 1];
  }
  return null;
}

const argv = process.argv.slice(2);
const skipDeno = argv.includes('--no-deno');
const reportJsonPath = parseFlagValue(argv, 'report-json');
const reportHtmlPath = parseFlagValue(argv, 'report-html');
const reportCompactJsonPath = parseFlagValue(argv, 'report-compact-json');
const emitCompactStdout = argv.includes('--compact-json');
const filter = argv.filter(
  (a, i, arr) =>
    !a.startsWith('--') &&
    !(
      i > 0 &&
      /^--(report-json|report-html|report-compact-json)$/.test(arr[i - 1])
    )
);
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

const report = {
  generatedAt: new Date().toISOString(),
  root,
  functionsChecked: functions.length,
  skipDeno,
  functions: [],
};

let failed = 0;
for (const fn of functions) {
  const { violations, missing } = findCrossFunctionImports(fn);
  let denoResult = { ok: true, output: '' };
  if (!skipDeno) denoResult = denoCheck(fn);
  const denoIssues = denoResult.ok ? [] : parseDenoErrors(denoResult.output);
  const fnFailed =
    violations.length > 0 || missing.length > 0 || !denoResult.ok;

  report.functions.push({
    name: fn,
    status: fnFailed ? 'failed' : 'passed',
    crossFunctionImports: violations,
    missingImports: missing,
    denoCheck: {
      ok: denoResult.ok,
      issues: denoIssues,
      rawOutput: denoResult.ok ? '' : denoResult.output,
    },
  });

  if (!fnFailed) {
    console.error(`  ✓ ${fn}`);
    continue;
  }

  failed++;
  console.error(`  ✗ ${fn}`);

  for (const v of violations) {
    console.error(`      cross-function import`);
    console.error(`        importer:   ${v.file}:${v.line}:${v.col}`);
    console.error(`        specifier:  ${v.spec}`);
    console.error(`        resolves:   supabase/functions/${v.resolvedTo}`);
    console.error(`        fix:        ${v.suggestion}`);
  }

  for (const miss of missing) {
    console.error(`      missing import target`);
    console.error(`        importer:   ${miss.file}:${miss.line}:${miss.col}`);
    console.error(`        specifier:  ${miss.spec}`);
    console.error(`        expected:   ${miss.expectedPath} (not on disk)`);
  }

  if (!denoResult.ok) {
    if (denoIssues.length > 0) {
      for (const iss of denoIssues) {
        console.error(`      deno check error: ${iss.message}`);
        if (iss.missing) {
          console.error(`        missing module: ${iss.missing}`);
        }
        if (iss.location) {
          console.error(
            `        imported from:  ${iss.location.file}:${iss.location.line}:${iss.location.col}`
          );
        }
      }
    } else {
      const head = denoResult.output.split('\n').slice(0, 8).join('\n      ');
      console.error(`      deno check failed:\n      ${head}`);
    }
  }
}

report.failedCount = failed;
report.passedCount = functions.length - failed;

function htmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml(rep) {
  const rows = rep.functions
    .map((f) => {
      const issues = [];
      for (const v of f.crossFunctionImports) {
        issues.push(
          `<li><strong>cross-function import</strong> <code>${htmlEscape(
            v.spec
          )}</code><br/>importer: <code>${htmlEscape(f.name)} → ${htmlEscape(
            v.file
          )}:${v.line}:${v.col}</code><br/>resolves: <code>supabase/functions/${htmlEscape(
            v.resolvedTo
          )}</code><br/>fix: ${htmlEscape(v.suggestion)}</li>`
        );
      }
      for (const m of f.missingImports) {
        issues.push(
          `<li><strong>missing import target</strong> <code>${htmlEscape(
            m.spec
          )}</code><br/>importer: <code>${htmlEscape(m.file)}:${m.line}:${
            m.col
          }</code><br/>expected: <code>${htmlEscape(m.expectedPath)}</code> (not on disk)</li>`
        );
      }
      for (const iss of f.denoCheck.issues) {
        issues.push(
          `<li><strong>deno check</strong>: ${htmlEscape(iss.message)}${
            iss.missing
              ? `<br/>missing module: <code>${htmlEscape(iss.missing)}</code>`
              : ''
          }${
            iss.location
              ? `<br/>imported from: <code>${htmlEscape(iss.location.file)}:${iss.location.line}:${iss.location.col}</code>`
              : ''
          }</li>`
        );
      }
      const status =
        f.status === 'passed'
          ? '<span style="color:#0a0">✓ passed</span>'
          : '<span style="color:#c00">✗ failed</span>';
      return `<tr><td><code>${htmlEscape(f.name)}</code></td><td>${status}</td><td><ul>${
        issues.join('') || '<li>—</li>'
      }</ul></td></tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Edge Functions bundling report</title>
<style>
  body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:24px;color:#222}
  h1{margin:0 0 8px}
  .meta{color:#666;margin-bottom:16px;font-size:14px}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #ddd;padding:8px;vertical-align:top;text-align:left;font-size:14px}
  th{background:#f6f6f6}
  code{background:#f3f3f3;padding:1px 4px;border-radius:3px;font-size:12px}
  ul{margin:0;padding-left:18px}
  li{margin-bottom:6px}
</style></head><body>
<h1>Edge Functions bundling report</h1>
<div class="meta">
  Generated: ${htmlEscape(rep.generatedAt)} ·
  Functions checked: ${rep.functionsChecked} ·
  <span style="color:#0a0">passed: ${rep.passedCount}</span> ·
  <span style="color:#c00">failed: ${rep.failedCount}</span>${
    rep.skipDeno ? ' · <em>deno check skipped</em>' : ''
  }
</div>
<table><thead><tr><th>Function</th><th>Status</th><th>Findings</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;
}

/**
 * Flatten the structured report into normalized error objects for CI:
 *   { function, type, importer, spec, expectedPath, suggestion, message }
 * - `importer` is `<file>:<line>:<col>` when location is known, else null.
 * - One entry per finding (cross-function import, missing import, deno issue).
 */
function buildCompactErrors(rep) {
  const out = [];
  for (const f of rep.functions) {
    for (const v of f.crossFunctionImports) {
      out.push({
        function: f.name,
        type: 'cross-function-import',
        importer: `${v.file}:${v.line}:${v.col}`,
        spec: v.spec,
        expectedPath: `supabase/functions/${v.resolvedTo}`,
        suggestion: v.suggestion,
        message: `Cross-function import "${v.spec}" resolves to sibling function`,
      });
    }
    for (const m of f.missingImports) {
      out.push({
        function: f.name,
        type: 'missing-import',
        importer: `${m.file}:${m.line}:${m.col}`,
        spec: m.spec,
        expectedPath: m.expectedPath,
        suggestion: `create the missing module or fix the specifier`,
        message: `Missing import target "${m.spec}" (expected ${m.expectedPath})`,
      });
    }
    for (const iss of f.denoCheck.issues) {
      out.push({
        function: f.name,
        type: 'deno-check',
        importer: iss.location
          ? `${iss.location.file}:${iss.location.line}:${iss.location.col}`
          : null,
        spec: iss.missing || null,
        expectedPath: iss.missing || null,
        suggestion: iss.missing
          ? `ensure ${iss.missing} exists or update the import specifier`
          : `resolve deno check error and re-run`,
        message: iss.message,
      });
    }
  }
  return out;
}

if (reportJsonPath) {
  const abs = path.isAbsolute(reportJsonPath)
    ? reportJsonPath
    : path.resolve(root, reportJsonPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(report, null, 2));
  console.error(`\nJSON report: ${path.relative(root, abs)}`);
}

if (reportHtmlPath) {
  const abs = path.isAbsolute(reportHtmlPath)
    ? reportHtmlPath
    : path.resolve(root, reportHtmlPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, renderHtml(report));
  console.error(`HTML report: ${path.relative(root, abs)}`);
}

if (reportCompactJsonPath) {
  const abs = path.isAbsolute(reportCompactJsonPath)
    ? reportCompactJsonPath
    : path.resolve(root, reportCompactJsonPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(buildCompactErrors(report), null, 2));
  console.error(`Compact JSON report: ${path.relative(root, abs)}`);
}

if (emitCompactStdout) {
  // Print compact errors to stdout so CI can pipe directly (e.g. `| jq`).
  process.stdout.write(JSON.stringify(buildCompactErrors(report), null, 2) + '\n');
}

if (failed > 0) {
  console.error(
    `\n${failed} function(s) failed bundling check. Move shared code to supabase/functions/_shared/.`
  );
  process.exit(1);
}

console.error('\nAll functions passed bundling check.');


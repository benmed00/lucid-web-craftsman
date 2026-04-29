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
 *     --report-html reports/bundling.html \
 *     --report-compact-json reports/bundling-errors.json   # flat error list
 *   node scripts/check-edge-functions-bundling.mjs --compact-json   # stdout
 *   node scripts/check-edge-functions-bundling.mjs \
 *     --baseline reports/bundling-baseline.json    # exit 1 only on NEW
 *                                                  # findings vs baseline
 *   node scripts/check-edge-functions-bundling.mjs \
 *     --filter-status failed --filter-name stripe  # narrow report artifacts
 *                                                  # to failing functions whose
 *                                                  # name contains "stripe"
 *
 * Notes:
 *   - Unless --no-deno: runs node scripts/assert-deno-v2.mjs once, then
 *     deno check --config supabase/functions/deno.json (same import map as
 *     other repo Deno scripts).
 *   - Static import()/export ... from and string-literal import('...') with
 *     relative specifiers are scanned; dynamic import() with non-literal
 *     specifiers is not analyzed.
 *   - Report filters (--filter-*) do not change baseline comparison; baseline
 *     always uses the full run (buildCompactErrors on the unfiltered report).
 *   - Deno diagnostics: there is no stable `deno check --json` for structured
 *     diagnostics; `parseDenoErrors()` is regex-based heuristics only. The
 *     authoritative stderr is always `denoCheck.rawOutput` on each function row
 *     (`--report-json`) and duplicated in HTML when parsing yields no issues.
 *
 * Requires: Deno v2 on PATH when not using --no-deno (same as verify:create-payment).
 */
// @ts-check
/// <reference types="node" />
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Shared typings for CLI output, structured reports (`--report-json`), baseline diff, and HTML.
 * Consumers: `buildCompactErrors`, HTML render path, `@ts-check`.
 * @typedef {'passed' | 'failed'} ReportStatus
 * @typedef {{ file: string; spec: string; line: number; col: number; resolvedTo: string; suggestion: string }} CrossFunctionViolation
 * @typedef {{ file: string; spec: string; line: number; col: number; expectedPath: string }} MissingImport
 * @typedef {{ ok: boolean; output: string }} DenoCheckOutcome
 * @typedef {{ file: string; line: number; col: number } | null} IssueLocation
 * @typedef {{ message: string; missing: string | null; location: IssueLocation }} DenoIssue
 * @typedef {{
 *   name: string;
 *   status: ReportStatus;
 *   crossFunctionImports: CrossFunctionViolation[];
 *   missingImports: MissingImport[];
 *   denoCheck: {
 *     ok: boolean;
 *     issues: DenoIssue[];
 *     rawOutput: string;
 *   };
 * }} FunctionReportRow
 * @typedef {{
 *   generatedAt: string;
 *   root: string;
 *   functionsChecked: number;
 *   skipDeno: boolean;
 *   functions: FunctionReportRow[];
 *   failedCount?: number;
 *   passedCount?: number;
 * }} BundlingReport
 * @typedef {{
 *   function: string;
 *   type: string;
 *   importer: string | null;
 *   spec: string | null;
 *   expectedPath: string | null;
 *   suggestion: string;
 *   message: string;
 * }} CompactError
 * @typedef {BundlingReport & {
 *   appliedFilters?: { status: string; name: string | null };
 * }} FilteredBundlingReport
 */

/** @type {string} */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** @type {string} */
const root = path.join(__dirname, '..');
/** @type {string} */
const functionsRoot = path.join(root, 'supabase', 'functions');
/** @type {string} */
const denoConfigPath = path.join(functionsRoot, 'deno.json');

/** @type {Set<string>} */
const SKIP = new Set(['_shared', 'tests', 'node_modules']);
/** @type {Set<string>} */
const ALLOWED_PARENT_DIRS = new Set(['_shared']);

/** Max directory depth relative to each function folder (guards symlink/deep trees). */
const MAX_WALK_DEPTH = 48;

/** Extensions tried for resolving relative imports and matched by {@link walk}. */
const SOURCE_EXTS = ['.ts', '.tsx', '.jsx', '.js', '.mjs', '.cjs', '.mts'];

/**
 * Directory names under `supabase/functions` that contain `index.ts`, excluding skips.
 * Optional `filter` limits to listed names (positional CLI args).
 * @param {string[] | undefined} filter
 * @returns {string[]}
 */
function listFunctions(filter) {
  /** @type {string[]} */
  const names = [];
  /** @type {string} */
  let name;
  for (name of fs.readdirSync(functionsRoot)) {
    if (SKIP.has(name) || name.startsWith('.')) continue;
    /** @type {string} */
    const dir = path.join(functionsRoot, name);
    /** @type {import('fs').Stats | undefined} */
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

/**
 * Recursive scan of `dir`: eligible source extensions (`SOURCE_EXTS`), skips `.` dirs,
 * `node_modules`, symlinks (avoids cycles), and stops past {@link MAX_WALK_DEPTH}.
 * @param {string} dir
 * @param {string[]} [out]
 * @param {number} [depth]
 * @returns {string[]}
 */
function walk(dir, out = [], depth = 0) {
  if (depth > MAX_WALK_DEPTH) return out;
  /** @type {string} */
  let name;
  for (name of fs.readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    /** @type {string} */
    const full = path.join(dir, name);
    /** @type {import('fs').Stats | undefined} */
    let st;
    try {
      st = fs.lstatSync(full);
    } catch {
      continue;
    }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) walk(full, out, depth + 1);
    else if (st.isFile() && /\.(ts|tsx|jsx|mts|js|mjs|cjs)$/i.test(name))
      out.push(full);
  }
  return out;
}

/** @type {RegExp} */
const IMPORT_RE =
  /(?:import|export)\s+(?:[^'"`;]+?\s+from\s+)?['"`]([^'"`]+)['"`]/g;
/** Relative string literal inside import('...') only (not computed specifiers).
 * @type {RegExp}
 */
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*(['"])(\.\.?[^'"]+)\1\s*\)/g;

/**
 * Converts a UTF-16 code unit offset in `src` to 1-based `{ line, col }` (matches editor-style positions).
 * @param {string} src
 * @param {number} offset
 * @returns {{ line: number; col: number }}
 */
function lineColForOffset(src, offset) {
  /** @type {number} */
  let line = 1;
  /** @type {number} */
  let col = 1;
  /** @type {number} */
  let i;
  for (i = 0; i < offset && i < src.length; i++) {
    if (src[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}

/**
 * Minimal filesystem resolver for a relative specifier: exact path, +extension, or `index.*` inside a directory.
 * Not a full Deno resolver — approximates common Edge Function layouts.
 * @param {string} absPath
 * @returns {string | null}
 */
function resolveImportTarget(absPath) {
  // Mirror Deno's resolution for relative specifiers: try the path as-is,
  // then +extension, then index.* inside a directory (`SOURCE_EXTS`).
  if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) return absPath;
  /** @type {readonly string[]} */
  const exts = SOURCE_EXTS;
  /** @type {string} */
  let ext;
  for (ext of exts) {
    if (fs.existsSync(absPath + ext)) return absPath + ext;
  }
  if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
    for (ext of exts) {
      /** @type {string} */
      const idx = path.join(absPath, 'index' + ext);
      if (fs.existsSync(idx)) return idx;
    }
  }
  return null;
}

/**
 * Classifies one relative `./`/`../` specifier: missing file on disk, cross-function sibling import, or allowed.
 * Mutates `violations`, `missing`, and `seen` (dedupe key = file:line:spec).
 * @param {string} fnName
 * @param {string} file
 * @param {string} src
 * @param {string} spec
 * @param {number} matchIndex
 * @param {CrossFunctionViolation[]} violations
 * @param {MissingImport[]} missing
 * @param {Set<string>} seen
 * @returns {void}
 */
function recordRelativeImport(fnName, file, src, spec, matchIndex, violations, missing, seen) {
  if (!spec.startsWith('.')) return;
  /** @type {string} */
  const resolved = path.resolve(path.dirname(file), spec);
  const { line, col } = lineColForOffset(src, matchIndex);
  /** @type {string} */
  const importerRel = path.relative(root, file);
  /** @type {string} */
  const dedupeKey = `${importerRel}:${line}:${spec}`;
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);

  /** @type {string | null} */
  const target = resolveImportTarget(resolved);
  if (!target) {
    missing.push({
      file: importerRel,
      spec,
      line,
      col,
      expectedPath: path.relative(root, resolved),
    });
    return;
  }

  /** @type {string} */
  const rel = path.relative(functionsRoot, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return;
  /** @type {string} */
  const topDir = rel.split(path.sep)[0];
  if (topDir === fnName) return;
  if (ALLOWED_PARENT_DIRS.has(topDir)) return;
  violations.push({
    file: importerRel,
    spec,
    line,
    col,
    resolvedTo: rel,
    suggestion: `mv this module to supabase/functions/_shared/ and import from '../_shared/...'`,
  });
}

/**
 * Scans static `import`/`export … from` and string `import('./x')` in all sources under one function folder.
 * @param {string} fnName
 * @returns {{ violations: CrossFunctionViolation[]; missing: MissingImport[] }}
 */
function findCrossFunctionImports(fnName) {
  /** @type {string} */
  const fnDir = path.join(functionsRoot, fnName);
  /** @type {CrossFunctionViolation[]} */
  const violations = [];
  /** @type {MissingImport[]} */
  const missing = [];
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string} */
  let file;
  for (file of walk(fnDir)) {
    /** @type {string} */
    const src = fs.readFileSync(file, 'utf8');
    /** @type {RegExpExecArray | null} */
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(src)) !== null) {
      recordRelativeImport(
        fnName,
        file,
        src,
        m[1],
        m.index,
        violations,
        missing,
        seen
      );
    }
    DYNAMIC_IMPORT_RE.lastIndex = 0;
    while ((m = DYNAMIC_IMPORT_RE.exec(src)) !== null) {
      recordRelativeImport(
        fnName,
        file,
        src,
        m[2],
        m.index,
        violations,
        missing,
        seen
      );
    }
  }
  return { violations, missing };
}

/**
 * Runs `deno check --config supabase/functions/deno.json` on `supabase/functions/<fn>/index.ts`.
 * @param {string} fnName
 * @returns {DenoCheckOutcome}
 */
function denoCheck(fnName) {
  /** @type {string} */
  const entry = path.join(functionsRoot, fnName, 'index.ts');
  /** @type {import('node:child_process').SpawnSyncReturns<string>} */
  const result = spawnSync(
    'deno',
    ['check', '--quiet', '--config', denoConfigPath, entry],
    {
      cwd: root,
      encoding: 'utf8',
    }
  );
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

/**
 * Best-effort parse of Deno stderr: module resolution-ish lines + generic `error:` lines.
 * Deduped by message + missing + location bucket. Deno ships no `--json` for `deno check`
 * diagnostics — **`denoCheck.rawOutput` is authoritative** when this heuristic misses patterns.
 * @param {string} output
 * @returns {DenoIssue[]}
 */
function parseDenoErrors(output) {
  // Extract structured info from "Module not found" / "Relative import path"
  // / "Cannot resolve module" deno error lines, e.g.:
  //   error: Module not found "file:///.../foo.ts".
  //       at file:///.../bar.ts:4:32
  /** @type {DenoIssue[]} */
  const issues = [];
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string[]} */
  const lines = output.split('\n');
  /** @type {number} */
  let i;
  for (i = 0; i < lines.length; i++) {
    /** @type {string} */
    const line = lines[i];
    /** @type {RegExpMatchArray | null} */
    const mModule = line.match(
      /(?:Module not found|Cannot resolve module|Relative import path[^"]*"([^"]+)"[^"]*not (?:prefixed|found))/
    );
    if (!mModule && !/error:/i.test(line)) continue;

    /** @type {RegExpMatchArray | null} */
    const missingMatch =
      line.match(/Module not found\s+"([^"]+)"/i) ||
      line.match(/Cannot resolve module\s+"([^"]+)"/i) ||
      line.match(/"([^"]+)"\s+not (?:prefixed|found)/i);
    /** @type {string | null} */
    const missingRaw = missingMatch ? missingMatch[1] : null;

    // Look ahead for the "at file://..." location line
    /** @type {IssueLocation} */
    let location = null;
    /** @type {number} */
    let j;
    for (j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      /** @type {RegExpMatchArray | null} */
      const at = lines[j].match(/at\s+(file:\/\/[^\s:]+):(\d+):(\d+)/);
      if (at) {
        /** @type {string} */
        const filePath = fileURLToPath(at[1]);
        location = {
          file: path.relative(root, filePath),
          line: Number(at[2]),
          col: Number(at[3]),
        };
        break;
      }
    }

    /** @type {DenoIssue} */
    const issue = {
      message: line.replace(/^error:\s*/i, '').trim(),
      missing: missingRaw ? toRelative(missingRaw) : null,
      location,
    };
    /** @type {string} */
    const locKey = location
      ? `${location.file}:${location.line}:${location.col}`
      : '';
    /** @type {string} */
    const dedupeKey = [issue.message, issue.missing || '', locKey].join('\0');
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    issues.push(issue);
  }
  return issues;
}

/**
 * Truncate long stderr for consoles and embedded report fields.
 * @param {string} text
 * @param {number} maxChars
 * @returns {string}
 */
function truncateUtf(text, maxChars) {
  if (text.length <= maxChars) return text;
  /** @type {number} */
  const omit = text.length - maxChars + 40;
  return `${text.slice(0, maxChars - 40)}\n… (${omit} characters omitted)`;
}

/**
 * Normalizes Deno diagnostic paths: `file:///...` → repo-relative path; leaves bare specifiers unchanged.
 * @param {string} maybeFileUrl
 * @returns {string}
 */
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

/**
 * Parses `--flag value` or `--flag=value` from `argv` (used for report paths and filters).
 * @param {string[]} args
 * @param {string} name
 * @returns {string | null}
 */
function parseFlagValue(args, name) {
  /** @type {string | undefined} */
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  /** @type {number} */
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    return args[idx + 1];
  }
  return null;
}

/** @type {string[]} */
const argv = process.argv.slice(2);
/** @type {boolean} */
const skipDeno = argv.includes('--no-deno');
/** @type {string | null} */
const reportJsonPath = parseFlagValue(argv, 'report-json');
/** @type {string | null} */
const reportHtmlPath = parseFlagValue(argv, 'report-html');
/** @type {string | null} */
const reportCompactJsonPath = parseFlagValue(argv, 'report-compact-json');
/** @type {boolean} */
const emitCompactStdout = argv.includes('--compact-json');
/** @type {string | null} */
const baselinePath = parseFlagValue(argv, 'baseline');
// Report filtering (does not affect which functions are CHECKED — only which
// appear in generated artifacts and the compact errors output).
/** @type {string | null} */
const filterStatusRaw = parseFlagValue(argv, 'filter-status'); // passed|failed|all
/** @type {string} */
const filterStatus = (filterStatusRaw || 'all').toLowerCase();
if (!['all', 'passed', 'failed'].includes(filterStatus)) {
  console.error(`Invalid --filter-status: ${filterStatusRaw} (use passed|failed|all)`);
  process.exit(2);
}
/** @type {string | null} */
const filterName = parseFlagValue(argv, 'filter-name'); // substring
/** @type {string[]} */
const filter = argv.filter(
  (a, i, arr) =>
    !a.startsWith('--') &&
    !(
      i > 0 &&
      /^--(report-json|report-html|report-compact-json|baseline|filter-status|filter-name)$/.test(
        arr[i - 1]
      )
    )
);
/** @type {string[]} */
const functions = listFunctions(filter);

if (functions.length === 0) {
  console.error('No functions found under', functionsRoot);
  process.exit(1);
}

if (!skipDeno) {
  /** @type {string} */
  const assertScript = path.join(__dirname, 'assert-deno-v2.mjs');
  /** @type {import('node:child_process').SpawnSyncReturns<string>} */
  const asserted = spawnSync(process.execPath, [assertScript], {
    cwd: root,
    encoding: 'utf8',
  });
  if (asserted.error) {
    console.error(asserted.error.message);
    process.exit(1);
  }
  if (asserted.status !== 0 && asserted.status !== null) {
    process.exit(asserted.status);
  }
}

console.error(
  `Pre-deploy bundling check: ${functions.length} function(s)${
    skipDeno ? ' (skipping deno check)' : ''
  }\n`
);

/** @type {BundlingReport} */
const report = {
  generatedAt: new Date().toISOString(),
  root,
  functionsChecked: functions.length,
  skipDeno,
  /** @type {FunctionReportRow[]} */
  functions: [],
};

/** @type {number} */
let failed = 0;
/** @type {string} */
let fn;
for (fn of functions) {
  const { violations, missing } = findCrossFunctionImports(fn);
  /** @type {DenoCheckOutcome} */
  let denoResult = { ok: true, output: '' };
  if (!skipDeno) denoResult = denoCheck(fn);
  /** @type {DenoIssue[]} */
  const denoIssues = denoResult.ok ? [] : parseDenoErrors(denoResult.output);
  /** @type {boolean} */
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
      console.error(`      deno check stderr (heuristic parser found nothing; authoritative text):`);
      /** @type {string} */
      const dumped = truncateUtf(denoResult.output, 32000).split('\n').join('\n      ');
      console.error(`      ${dumped}`);
    }
  }
}

report.failedCount = failed;
report.passedCount = functions.length - failed;

/**
 * HTML entity escape for injected user/repo paths inside the HTML report.
 * @param {unknown} s
 * @returns {string}
 */
function htmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Coerces `value` to a finite positive integer, or returns `fallback` (used for stable line/col in editor links).
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function toPositiveInt(value, fallback) {
  // Accept numbers and numeric strings; reject NaN, Infinity, <=0, non-integers.
  /** @type {number} */
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  /** @type {number} */
  const i = Math.floor(n);
  return i > 0 ? i : fallback;
}

/**
 * Renders clickable `vscode://file/...` plus `file://` fallback so HTML report rows open at the offending line/col.
 * @param {FilteredBundlingReport | BundlingReport} rep
 * @param {unknown} relFile
 * @param {unknown} line
 * @param {unknown} col
 * @returns {string}
 */
function renderImporterLink(rep, relFile, line, col) {
  // Build a clickable link that opens the importer file at the failing
  // line/column directly in VS Code / Cursor. Most editors register the
  // `vscode://file/...` handler; we also expose a `file://` fallback so the
  // link still resolves in plain browsers.
  //
  // This function is defensive: importer location can be missing entirely
  // (e.g. deno errors without an `at file://...` line) or carry unexpected
  // values (null, undefined, NaN, negative, strings like "?"). In those
  // cases we degrade gracefully instead of emitting a broken `<a href="">`.
  /** @type {string | null} */
  const safeFile =
    typeof relFile === 'string' && relFile.trim().length > 0
      ? relFile.trim()
      : null;

  if (!safeFile) {
    return '<span class="muted" title="Importer location unavailable"><code>(unknown location)</code></span>';
  }

  /** @type {number} */
  const lineNum = toPositiveInt(line, 1);
  /** @type {number} */
  const colNum = toPositiveInt(col, 1);
  /** @type {boolean} */
  const hadLine = toPositiveInt(line, 0) > 0;
  /** @type {boolean} */
  const hadCol = toPositiveInt(col, 0) > 0;

  /** @type {string | undefined} */
  let abs;
  try {
    abs = path.resolve(rep.root || '.', safeFile);
  } catch {
    // path.resolve can throw on exotic inputs; fall back to a plain label.
    return `<code>${htmlEscape(safeFile)}</code>`;
  }

  // encodeURI keeps `/` and `:` intact while escaping spaces, accents, etc.
  /** @type {string} */
  const encodedAbs = encodeURI(abs).replace(/#/g, '%23').replace(/\?/g, '%3F');
  /** @type {string} */
  const vscodeHref = `vscode://file/${encodedAbs}:${lineNum}:${colNum}`;
  /** @type {string} */
  const fileHref = `file://${encodedAbs}#L${lineNum}`;
  /** @type {string} */
  const label = hadLine
    ? `${safeFile}:${lineNum}${hadCol ? `:${colNum}` : ''}`
    : safeFile;
  /** @type {string} */
  const titleSuffix = hadLine
    ? ` at line ${lineNum}${hadCol ? `, column ${colNum}` : ''}`
    : ' (line/column unknown — opening at top of file)';
  return `<a href="${htmlEscape(vscodeHref)}" title="Open in VS Code / Cursor${titleSuffix}"><code>${htmlEscape(
    label
  )}</code></a> <a class="alt" href="${htmlEscape(fileHref)}" title="Open file in browser">↗</a>`;
}

/**
 * Full standalone HTML document: table of findings, client-side status/name filters for large reports.
 * @param {FilteredBundlingReport} rep
 * @returns {string}
 */
function renderHtml(rep) {
  /** @type {string} */
  const rows = rep.functions
    .map((f) => {
      /** @type {string[]} */
      const issues = [];
      for (const v of f.crossFunctionImports) {
        issues.push(
          `<li><strong>cross-function import</strong> <code>${htmlEscape(
            v.spec
          )}</code><br/>importer: ${renderImporterLink(
            rep,
            v.file,
            v.line,
            v.col
          )}<br/>resolves: <code>supabase/functions/${htmlEscape(
            v.resolvedTo
          )}</code><br/>fix: ${htmlEscape(v.suggestion)}</li>`
        );
      }
      for (const m of f.missingImports) {
        issues.push(
          `<li><strong>missing import target</strong> <code>${htmlEscape(
            m.spec
          )}</code><br/>importer: ${renderImporterLink(
            rep,
            m.file,
            m.line,
            m.col
          )}<br/>expected: <code>${htmlEscape(m.expectedPath)}</code> (not on disk)</li>`
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
              ? `<br/>imported from: ${renderImporterLink(
                  rep,
                  iss.location.file,
                  iss.location.line,
                  iss.location.col
                )}`
              : ''
          }</li>`
        );
      }
      if (
        !f.denoCheck.ok &&
        f.denoCheck.rawOutput &&
        f.denoCheck.issues.length === 0
      ) {
        issues.push(
          `<li><strong>deno check (stderr — unparsed)</strong><span class="muted"> Heuristic <code>parseDenoErrors</code> matched no lines; see full <code>denoCheck.rawOutput</code> in JSON.</span><pre class="denoRaw">${htmlEscape(
            truncateUtf(f.denoCheck.rawOutput, 200000)
          )}</pre></li>`
        );
      }
      /** @type {string} */
      const status =
        f.status === 'passed'
          ? '<span style="color:#0a0">✓ passed</span>'
          : '<span style="color:#c00">✗ failed</span>';
      return `<tr data-status="${htmlEscape(f.status)}" data-name="${htmlEscape(
        f.name.toLowerCase()
      )}"><td><code>${htmlEscape(f.name)}</code></td><td>${status}</td><td><ul>${
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
  a{color:#0366d6;text-decoration:none}
  a:hover{text-decoration:underline}
  a.alt{color:#888;font-size:11px;margin-left:4px}
  .muted{color:#888;font-style:italic}
  .filters{display:flex;gap:12px;align-items:center;margin:12px 0 16px;flex-wrap:wrap}
  .filters label{font-size:13px;color:#444}
  .filters select,.filters input{padding:6px 8px;font-size:13px;border:1px solid #ccc;border-radius:4px;font-family:inherit}
  .filters input{min-width:220px}
  .filters .count{color:#666;font-size:13px;margin-left:auto}
  tr.hidden{display:none}
  pre.denoRaw{white-space:pre-wrap;word-break:break-word;font-size:11px;overflow:auto;max-height:60vh;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:4px;padding:8px;margin-top:6px}
</style></head><body>
<h1>Edge Functions bundling report</h1>
<div class="meta">
  Generated: ${htmlEscape(rep.generatedAt)} ·
  Functions checked: ${rep.functionsChecked} ·
  <span style="color:#0a0">passed: ${rep.passedCount}</span> ·
  <span style="color:#c00">failed: ${rep.failedCount}</span>${
    rep.skipDeno ? ' · <em>deno check skipped</em>' : ''
  }${
    rep.appliedFilters &&
    (rep.appliedFilters.status !== 'all' || rep.appliedFilters.name)
      ? ` · <em>CLI filters: status=${htmlEscape(
          rep.appliedFilters.status
        )}${
          rep.appliedFilters.name
            ? `, name~="${htmlEscape(rep.appliedFilters.name)}"`
            : ''
        }</em>`
      : ''
  }
</div>
<div class="filters">
  <label>Status:
    <select id="f-status">
      <option value="all">All</option>
      <option value="passed">Passed</option>
      <option value="failed">Failed</option>
    </select>
  </label>
  <label>Name contains:
    <input id="f-name" type="search" placeholder="e.g. stripe" />
  </label>
  <span class="count" id="f-count"></span>
</div>
<table><thead><tr><th>Function</th><th>Status</th><th>Findings</th></tr></thead>
<tbody id="f-tbody">${rows}</tbody></table>
<script>
(function(){
  var tbody=document.getElementById('f-tbody');
  var rows=Array.prototype.slice.call(tbody.querySelectorAll('tr'));
  var sel=document.getElementById('f-status');
  var inp=document.getElementById('f-name');
  var count=document.getElementById('f-count');
  function apply(){
    var s=sel.value, n=inp.value.trim().toLowerCase();
    var visible=0;
    rows.forEach(function(r){
      var ok=(s==='all'||r.dataset.status===s) && (!n||r.dataset.name.indexOf(n)!==-1);
      r.classList.toggle('hidden', !ok);
      if(ok) visible++;
    });
    count.textContent=visible+' / '+rows.length+' shown';
  }
  sel.addEventListener('change', apply);
  inp.addEventListener('input', apply);
  apply();
})();
</script>
</body></html>`;
}

/**
 * Flatten the structured report into normalized error objects for CI:
 *   { function, type, importer, spec, expectedPath, suggestion, message }
 * - `importer` is `<file>:<line>:<col>` when location is known, else null.
 * - One entry per finding (cross-function import, missing import, structured deno issue,
 *   or one synthetic **`deno-check`** row when **`deno check` failed but `parseDenoErrors`** returned nothing).
 * @param {FilteredBundlingReport | BundlingReport} rep
 * @returns {CompactError[]}
 */
function buildCompactErrors(rep) {
  /** @type {CompactError[]} */
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
    if (
      !f.denoCheck.ok &&
      f.denoCheck.rawOutput.trim().length > 0 &&
      f.denoCheck.issues.length === 0
    ) {
      out.push({
        function: f.name,
        type: 'deno-check',
        importer: null,
        spec: null,
        expectedPath: null,
        suggestion:
          'See full bundling JSON `denoCheck.rawOutput`; stderr did not match parseDenoErrors heuristics.',
        message: truncateUtf(
          `deno check stderr (no heuristic match):\n${f.denoCheck.rawOutput}`,
          65536
        ),
      });
    }
  }
  return out;
}

/**
 * Apply CLI report filters (--filter-status, --filter-name) to the report.
 * Returns a shallow-cloned report whose `functions[]` is filtered. Counts and
 * an `appliedFilters` block are recomputed so downstream consumers see the
 * filtered totals instead of the unfiltered ones.
 * @param {BundlingReport} rep
 * @returns {FilteredBundlingReport}
 */
function applyReportFilters(rep) {
  /** @type {string | null} */
  const nameNeedle = filterName ? filterName.toLowerCase() : null;
  /** @type {FunctionReportRow[]} */
  const filtered = rep.functions.filter((f) => {
    if (filterStatus !== 'all' && f.status !== filterStatus) return false;
    if (nameNeedle && !f.name.toLowerCase().includes(nameNeedle)) return false;
    return true;
  });
  return {
    ...rep,
    appliedFilters: { status: filterStatus, name: filterName || null },
    functions: filtered,
    functionsChecked: filtered.length,
    passedCount: filtered.filter((f) => f.status === 'passed').length,
    failedCount: filtered.filter((f) => f.status === 'failed').length,
  };
}

/** @type {FilteredBundlingReport} */
const filteredReport = applyReportFilters(report);
/** @type {boolean} */
const hasFilters = filterStatus !== 'all' || !!filterName;
if (hasFilters) {
  console.error(
    `\nReport filters: status=${filterStatus}${
      filterName ? `, name~="${filterName}"` : ''
    } → ${filteredReport.functions.length}/${report.functions.length} function(s) in artifacts.`
  );
}

if (reportJsonPath) {
  /** @type {string} */
  const absJson = path.isAbsolute(reportJsonPath)
    ? reportJsonPath
    : path.resolve(root, reportJsonPath);
  fs.mkdirSync(path.dirname(absJson), { recursive: true });
  fs.writeFileSync(absJson, JSON.stringify(filteredReport, null, 2));
  console.error(`\nJSON report: ${path.relative(root, absJson)}`);
}

if (reportHtmlPath) {
  /** @type {string} */
  const absHtml = path.isAbsolute(reportHtmlPath)
    ? reportHtmlPath
    : path.resolve(root, reportHtmlPath);
  fs.mkdirSync(path.dirname(absHtml), { recursive: true });
  fs.writeFileSync(absHtml, renderHtml(filteredReport));
  console.error(`HTML report: ${path.relative(root, absHtml)}`);
}

if (reportCompactJsonPath) {
  /** @type {string} */
  const absCompact = path.isAbsolute(reportCompactJsonPath)
    ? reportCompactJsonPath
    : path.resolve(root, reportCompactJsonPath);
  fs.mkdirSync(path.dirname(absCompact), { recursive: true });
  fs.writeFileSync(
    absCompact,
    JSON.stringify(buildCompactErrors(filteredReport), null, 2)
  );
  console.error(`Compact JSON report: ${path.relative(root, absCompact)}`);
}

if (emitCompactStdout) {
  // Print compact errors to stdout so CI can pipe directly (e.g. `| jq`).
  process.stdout.write(
    JSON.stringify(buildCompactErrors(filteredReport), null, 2) + '\n'
  );
}

/**
 * Build a stable signature for baseline diffing: ordering-insensitive equality on structural fields (not timestamps).
 * @param {CompactError} e
 * @returns {string}
 */
function findingKey(e) {
  return [e.function, e.type, e.spec || '', e.importer || '', e.expectedPath || '']
    .join('|');
}

if (baselinePath) {
  /** @type {string} */
  const absBaseline = path.isAbsolute(baselinePath)
    ? baselinePath
    : path.resolve(root, baselinePath);
  if (!fs.existsSync(absBaseline)) {
    console.error(
      `\nBaseline not found at ${path.relative(root, absBaseline)} — treating all current findings as new.`
    );
  }
  /** @type {CompactError[]} */
  const current = buildCompactErrors(report);
  /** @type {CompactError[]} */
  let baseline = [];
  if (fs.existsSync(absBaseline)) {
    try {
      /** @type {unknown} */
      const parsed = JSON.parse(fs.readFileSync(absBaseline, 'utf8'));
      // Accept either a compact errors array or a full report object.
      baseline = Array.isArray(parsed)
        ? /** @type {CompactError[]} */ (parsed)
        : buildCompactErrors(/** @type {BundlingReport} */ (parsed));
    } catch (e) {
      /** @type {unknown} */
      const err = e;
      console.error(
        `\nFailed to parse baseline JSON: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      process.exit(2);
    }
  }
  /** @type {Set<string>} */
  const baselineKeys = new Set(baseline.map(findingKey));
  /** @type {Set<string>} */
  const currentKeys = new Set(current.map(findingKey));
  /** @type {CompactError[]} */
  const newFindings = current.filter((e) => !baselineKeys.has(findingKey(e)));
  /** @type {CompactError[]} */
  const fixedFindings = baseline.filter((e) => !currentKeys.has(findingKey(e)));

  console.error(
    `\nBaseline diff: ${current.length} current, ${baseline.length} baseline, ${newFindings.length} new, ${fixedFindings.length} fixed.`
  );
  if (fixedFindings.length > 0) {
    console.error(
      `  ✓ ${fixedFindings.length} previously-known finding(s) no longer present — consider refreshing the baseline.`
    );
  }
  if (newFindings.length > 0) {
    console.error(`\n${newFindings.length} NEW finding(s) vs baseline:`);
    for (const e of newFindings) {
      console.error(`  ✗ [${e.type}] ${e.function} — ${e.message}`);
      if (e.importer) console.error(`      at ${e.importer}`);
    }
    process.exit(1);
  }
  console.error(
    failed > 0
      ? `\nNo regressions vs baseline (existing ${failed} function failure(s) ignored). Exit 0.`
      : `\nAll functions passed bundling check.`
  );
  process.exit(0);
}

if (failed > 0) {
  console.error(
    `\n${failed} function(s) failed bundling check. Move shared code to supabase/functions/_shared/.`
  );
  process.exit(1);
}

console.error('\nAll functions passed bundling check.');


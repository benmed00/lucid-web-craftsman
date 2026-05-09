/**
 * Audit: metrics under one or more roots (default: src).
 *
 * Run:
 *   node scripts/audit-src-metrics.mjs
 *   node scripts/audit-src-metrics.mjs src cypress supabase/functions
 *
 * Metrics: let/const/interface/type, LOC by subfolder, largest files,
 * top import sources, TS debt (any, @ts-*), TODO/FIXME/HACK, console.log (non-test).
 */
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();

function walkTs(dir, acc = []) {
  if (!fs.existsSync(dir)) {
    return acc;
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist" || ent.name === "build") {
        continue;
      }
      walkTs(p, acc);
    } else if (/\.(ts|tsx)$/.test(ent.name)) {
      acc.push(p);
    }
  }
  return acc;
}

function relPosix(filePath) {
  return path.relative(cwd, filePath).split(path.sep).join("/");
}

/** First folder under root for LOC grouping, e.g. src/components; loose files → src/(root) */
function locBucket(rel) {
  const parts = rel.split("/").filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "(root)";
  const second = parts[1];
  if (second.includes(".")) {
    return `${parts[0]}/(root)`;
  }
  return `${parts[0]}/${second}`;
}

function isTestFile(rel) {
  return /\.(test|spec)\.(tsx?|jsx?)$/.test(rel) || /\.integration\.test\./.test(rel);
}

const args = process.argv.slice(2);
const roots = (args.length ? args : ["src"]).map((r) => path.join(cwd, r));

const files = [];
const seen = new Set();
for (const root of roots) {
  for (const f of walkTs(root)) {
    if (!seen.has(f)) {
      seen.add(f);
      files.push(f);
    }
  }
}

const reLet = /\blet\b/g;
const reConst = /\bconst\b/g;
const reIface = /^\s*(export\s+)?interface\s+\w+/gm;
const reType = /^\s*(export\s+)?type\s+[A-Za-z_$][\w$]*\s*=/gm;
const reAny = /\bany\b/g;
const reTodo = /\b(TODO|FIXME|HACK)\b/gi;
const reFrom = /from\s+["']([^"']+)["']/g;
const reConsoleLog = /\bconsole\.log\s*\(/g;

let lets = 0;
let consts = 0;
let iface = 0;
let types = 0;
let anyOccurrences = 0;
let tsIgnoreOccurrences = 0;
let tsExpectErrorOccurrences = 0;
let tsNocheckFiles = 0;
let todoMarkers = 0;
let consoleLogOccurrences = 0;

let locTotal = 0;
let locNonBlank = 0;
/** @type {Record<string, { files: number, linesNonBlank: number }>} */
const byBucket = {};

/** @type {Map<string, number>} */
const importCounts = new Map();

/** @type {{ rel: string, lines: number }[]} */
const fileLineStats = [];

for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  const rel = relPosix(f);
  const lines = text.split(/\r?\n/);
  const nLines = lines.length;
  const nNonBlank = lines.reduce((acc, line) => acc + (line.trim().length > 0 ? 1 : 0), 0);

  locTotal += nLines;
  locNonBlank += nNonBlank;

  const bucket = locBucket(rel);
  if (!byBucket[bucket]) {
    byBucket[bucket] = { files: 0, linesNonBlank: 0 };
  }
  byBucket[bucket].files += 1;
  byBucket[bucket].linesNonBlank += nNonBlank;

  fileLineStats.push({ rel, lines: nLines });

  lets += (text.match(reLet) ?? []).length;
  consts += (text.match(reConst) ?? []).length;

  reIface.lastIndex = 0;
  while (reIface.exec(text) !== null) iface++;

  reType.lastIndex = 0;
  while (reType.exec(text) !== null) types++;

  anyOccurrences += (text.match(reAny) ?? []).length;
  tsIgnoreOccurrences += (text.match(/@ts-ignore\b/g) ?? []).length;
  tsExpectErrorOccurrences += (text.match(/@ts-expect-error\b/g) ?? []).length;
  if (/@ts-nocheck\b/.test(text)) tsNocheckFiles += 1;

  todoMarkers += (text.match(reTodo) ?? []).length;

  if (!isTestFile(rel)) {
    consoleLogOccurrences += (text.match(reConsoleLog) ?? []).length;
  }

  reFrom.lastIndex = 0;
  let im;
  while ((im = reFrom.exec(text)) !== null) {
    const src = im[1];
    importCounts.set(src, (importCounts.get(src) ?? 0) + 1);
  }
}

fileLineStats.sort((a, b) => b.lines - a.lines);

const topImportSources = [...importCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25)
  .map(([spec, count]) => ({ count, spec }));

const locBySubfolder = Object.entries(byBucket)
  .map(([key, v]) => ({
    bucket: key,
    files: v.files,
    linesNonBlank: v.linesNonBlank,
  }))
  .sort((a, b) => b.linesNonBlank - a.linesNonBlank);

console.log(
  JSON.stringify(
    {
      cwd,
      roots,
      filesTsTsx: files.length,
      letOccurrences: lets,
      constOccurrences: consts,
      interfaceDeclarationLines: iface,
      typeAliasDeclarationLines: types,
      typescriptDebt: {
        anyOccurrences,
        tsIgnoreOccurrences,
        tsExpectErrorOccurrences,
        filesWithTsNocheck: tsNocheckFiles,
      },
      markersTodoFixmeHack: todoMarkers,
      consoleLogOccurrencesExcludingTestFiles: consoleLogOccurrences,
      linesOfCode: {
        totalLines: locTotal,
        nonBlankLines: locNonBlank,
      },
      locBySubfolderTop: locBySubfolder.slice(0, 30),
      largestFilesByLineCount: fileLineStats.slice(0, 20),
      topImportSources,
    },
    null,
    2,
  ),
);

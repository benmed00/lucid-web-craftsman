/**
 * Generates platform catalog: .github/project/catalog.json, PROJECT_CATALOG.md,
 * reports/project-dashboard.html
 * Usage: pnpm run project:catalog
 */

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROJECT_DIR = path.join(ROOT, '.github', 'project');
const CATALOG_JSON = path.join(PROJECT_DIR, 'catalog.json');
const CATALOG_MD = path.join(PROJECT_DIR, 'PROJECT_CATALOG.md');
const DASHBOARD_HTML = path.join(ROOT, 'reports', 'project-dashboard.html');

const RUNBOOK_DOCS = [
  'AGENTS.md',
  'cypress/README.md',
  'backend/README.md',
  'scripts/README.md',
  'supabase/README.md',
  'supabase/functions/README.md',
  'src/services/README.md',
  'openapi/README.md',
  'postman/README.md',
];

const PATH_CHURN_PREFIXES = ['src/', 'supabase/functions/', 'cypress/', 'docs/', 'scripts/'];

const PLATFORM_AREAS = [
  { id: 'storefront', label: 'Storefront', layer: 'spa' },
  { id: 'checkout-payments', label: 'Checkout & payments', layer: 'spa' },
  { id: 'edge', label: 'Edge functions', layer: 'edge' },
  { id: 'admin', label: 'Admin', layer: 'spa' },
  { id: 'infra-ci', label: 'Infra & CI', layer: 'ci' },
  { id: 'docs-security', label: 'Docs & security', layer: 'docs' },
];

const GENERIC_SUBJECTS = /^(changes|wip|update|\.\.\.)$/i;
const CONVENTIONAL_SUBJECT = /^(feat|fix|docs|chore|test|ci|refactor|perf|style|build)(\(.+\))?:/i;

function git(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }).trim();
  } catch {
    return '';
  }
}

/** Stable per commit SHA — avoids catalog.json drift on every `project:catalog` run. */
function catalogGeneratedAt() {
  return git('git log -1 --format=%cI HEAD') || new Date().toISOString();
}

function walk(dir, pred) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      out.push(...walk(p, pred));
    } else if (pred(p, ent.name)) out.push(p);
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function categorizeScript(name, command) {
  const n = name.toLowerCase();
  const c = command.toLowerCase();
  if (n.startsWith('e2e') || c.includes('cypress')) return 'e2e';
  if (n.includes('deno') || c.includes('deno ')) return 'deno';
  if (n.startsWith('deploy') || n.includes('deploy')) return 'deploy';
  if (n.startsWith('verify') || n === 'validate') return 'ci-gate';
  if (n.includes('openapi') || n.includes('postman') || n === 'api:artifacts') return 'api-artifacts';
  if (n.startsWith('supabase')) return 'supabase';
  if (n.startsWith('test') || n === 'coverage') return 'test';
  if (n.startsWith('check:') || n.includes('bundling')) return 'ci-gate';
  if (n.startsWith('lint') || n.startsWith('format') || n === 'type:check') return 'ci-gate';
  if (n === 'dev' || n === 'dev:e2e' || n === 'preview' || n === 'serve' || n === 'start:api')
    return 'dev';
  if (n.startsWith('build') || n === 'predeploy' || n === 'deploy') return 'build';
  return 'other';
}

function inferArea(scriptName, category) {
  if (category === 'e2e') return 'storefront';
  if (category === 'deno' || scriptName.includes('edge') || scriptName.includes('payment'))
    return 'edge';
  if (category === 'api-artifacts') return 'edge';
  if (category === 'supabase') return 'edge';
  if (scriptName.includes('admin')) return 'admin';
  if (scriptName.includes('checkout') || scriptName.includes('pricing')) return 'checkout-payments';
  if (category === 'ci-gate' || category === 'test') return 'infra-ci';
  if (scriptName.includes('format') || scriptName.includes('lint')) return 'infra-ci';
  return 'storefront';
}

function parseWorkflows() {
  workflows.length = 0;
  const dir = path.join(ROOT, '.github', 'workflows');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  const scriptToCi = new Map();

  for (const file of files.sort()) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const name = nameMatch ? nameMatch[1].trim() : file;

    const onBlock = content.match(/^on:\s*\n([\s\S]*?)(?=^[a-z]|\njobs:)/m);
    const triggers = [];
    if (onBlock) {
      if (/push:/m.test(onBlock[1])) triggers.push('push');
      if (/pull_request:/m.test(onBlock[1])) triggers.push('pull_request');
      if (/schedule:/m.test(onBlock[1])) triggers.push('schedule');
      if (/workflow_dispatch:/m.test(onBlock[1])) triggers.push('workflow_dispatch');
    }

    const jobs = [];
    const jobRe = /^  (\w[\w-]*):\s*$/gm;
    let jm;
    while ((jm = jobRe.exec(content)) !== null) {
      if (jm[1] === 'runs-on' || jm[1] === 'steps' || jm[1] === 'strategy') continue;
      jobs.push(jm[1]);
    }

    const pnpmRuns = [...content.matchAll(/pnpm run ([\w:@/-]+)/g)].map((m) => m[1]);
    const uniqueRuns = [...new Set(pnpmRuns)];
    for (const s of uniqueRuns) {
      const existing = scriptToCi.get(s) || [];
      existing.push({ workflow: file, job: jobs[0] || 'ci', workflowName: name });
      scriptToCi.set(s, existing);
    }

    let ciCoverage = 'manual-only';
    if (file === 'ci.yml') ciCoverage = 'ci.yml';
    else if (file === 'e2e.yml') ciCoverage = 'e2e-smoke';
    else if (file === 'deno-create-payment.yml') ciCoverage = 'deno-workflow';

    workflows.push({
      id: `workflow:${file}`,
      file: `.github/workflows/${file}`,
      name,
      triggers: [...new Set(triggers)],
      jobs: [...new Set(jobs)].filter((j) => !['runs-on', 'steps', 'uses', 'with', 'env'].includes(j)),
      pnpmCommands: uniqueRuns.sort(),
      ciCoverage,
      verification: uniqueRuns[0] ? `pnpm run ${uniqueRuns[0]}` : null,
      area: file.includes('e2e') ? 'storefront' : file.includes('deno') ? 'edge' : 'infra-ci',
      layer: 'ci',
    });
  }

  return scriptToCi;
}

const workflows = [];

function collectGit() {
  const total = parseInt(git('git rev-list --count HEAD') || '0', 10);
  const monthlyRaw = git(
    "git log --since='18 months ago' --format='%ad' --date=format:'%Y-%m'"
  );
  const monthlyMap = new Map();
  for (const line of monthlyRaw.split('\n').filter(Boolean)) {
    monthlyMap.set(line, (monthlyMap.get(line) || 0) + 1);
  }
  const monthly = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  const authorsRaw = git('git shortlog -sn --all');
  const authors = authorsRaw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const m = line.trim().match(/^(\d+)\s+(.+)$/);
      return m ? { name: m[2], count: parseInt(m[1], 10) } : null;
    })
    .filter(Boolean)
    .slice(0, 15);

  const subjects = git('git log --format=%s');
  let genericCount = 0;
  let conventionalCount = 0;
  let otherCount = 0;
  for (const s of subjects.split('\n').filter(Boolean)) {
    const sub = s.replace(/^(feat|fix|docs|chore|test|ci|refactor|perf|style|build)(\([^)]+\))?:\s*/i, '').trim();
    if (GENERIC_SUBJECTS.test(sub) || GENERIC_SUBJECTS.test(s.trim())) genericCount++;
    else if (CONVENTIONAL_SUBJECT.test(s)) conventionalCount++;
    else otherCount++;
  }
  const totalSubjects = genericCount + conventionalCount + otherCount || 1;

  const pathChurn = PATH_CHURN_PREFIXES.map((prefix) => {
    const last = git(`git log -1 --format=%ad --date=short -- ${prefix}`);
    return { prefix, lastCommitDate: last || 'unknown' };
  });

  return {
    totalCommits: total,
    monthly,
    authors,
    subjectQuality: {
      genericCount,
      conventionalCount,
      otherCount,
      genericPercent: Math.round((genericCount / totalSubjects) * 1000) / 10,
      conventionalPercent: Math.round((conventionalCount / totalSubjects) * 1000) / 10,
    },
    pathChurn,
  };
}

function collectScripts(scriptToCi) {
  const pkg = readJson(path.join(ROOT, 'package.json'));
  const validateCmd = pkg.scripts.validate || '';
  const inValidate = (name) => validateCmd.includes(name);

  return Object.keys(pkg.scripts)
    .sort()
    .map((name) => {
      const command = pkg.scripts[name];
      const category = categorizeScript(name, command);
      const ci = scriptToCi.get(name) || [];
      const ciCoverage =
        ci.length > 0
          ? ci[0].workflow === 'ci.yml'
            ? 'ci.yml'
            : ci[0].workflow === 'e2e.yml'
              ? 'e2e-smoke'
              : ci[0].workflow === 'deno-create-payment.yml'
                ? 'deno-workflow'
                : 'manual-only'
          : 'none';
      return {
        id: `script:${name}`,
        name,
        command: `pnpm run ${name}`,
        rawCommand: command,
        category,
        area: inferArea(name, category),
        layer: category === 'deno' ? 'edge' : category === 'e2e' ? 'spa' : category === 'ci-gate' ? 'ci' : 'spa',
        ciMappings: ci,
        ciCoverage,
        inValidate: inValidate(name),
        docLinks: ['AGENTS.md', 'scripts/README.md'],
        verification: `pnpm run ${name}`,
        health: ciCoverage === 'none' && category === 'ci-gate' ? 'drift-risk' : 'healthy',
      };
    });
}

function collectTests() {
  const vitest = walk(path.join(ROOT, 'src'), (p, name) =>
    /\.(test|spec)\.(ts|tsx)$/.test(name)
  ).map(rel);

  const cypress = walk(path.join(ROOT, 'cypress', 'e2e'), (_, name) =>
    /\.(js|ts)$/.test(name)
  ).map(rel);

  const deno = walk(path.join(ROOT, 'supabase', 'functions'), (p) => p.endsWith('_test.ts')).map(
    rel
  );

  const tests = [];

  for (const file of vitest.sort()) {
    const excludedFromUnit =
      file.includes('rls-e2e.test.ts') || file.includes('rls-quick-validation.test.ts');
    tests.push({
      id: `test:vitest:${file}`,
      file,
      runner: 'vitest',
      localCommand: `npx vitest run ${file}`,
      ciCommand: excludedFromUnit ? 'excluded from test:unit' : 'pnpm run test:unit',
      inValidate: !excludedFromUnit,
      area: file.includes('checkout') ? 'checkout-payments' : file.includes('rls') ? 'edge' : 'storefront',
      layer: file.includes('edge-functions') ? 'edge' : 'spa',
      ciCoverage: excludedFromUnit ? 'manual-only' : 'ci.yml',
    });
  }

  for (const file of cypress.sort()) {
    tests.push({
      id: `test:cypress:${file}`,
      file,
      runner: 'cypress',
      localCommand: `pnpm run e2e:ci (includes ${path.basename(file)})`,
      ciCommand: 'pnpm run e2e:ci:smoke or e2e:ci:shard',
      inValidate: false,
      area: file.includes('checkout') ? 'checkout-payments' : file.includes('admin') ? 'admin' : 'storefront',
      layer: 'spa',
      ciCoverage: 'e2e-smoke',
    });
  }

  for (const file of deno.sort()) {
    tests.push({
      id: `test:deno:${file}`,
      file,
      runner: 'deno',
      localCommand: 'pnpm run verify:create-payment or test:pricing-snapshot',
      ciCommand: 'deno-create-payment.yml',
      inValidate: false,
      area: 'edge',
      layer: 'edge',
      ciCoverage: 'deno-workflow',
    });
  }

  return tests;
}

function firstHeading(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    const m = text.match(/^#\s+(.+)$/m);
    return m ? m[1].trim() : path.basename(filePath);
  } catch {
    return path.basename(filePath);
  }
}

function collectDocs() {
  const docs = [];
  const docsDir = path.join(ROOT, 'docs');
  for (const file of walk(docsDir, (_, n) => n.endsWith('.md')).sort()) {
    const r = rel(file);
    docs.push({
      id: `doc:${r}`,
      path: r,
      title: firstHeading(file),
      area: r.includes('security') ? 'docs-security' : r.includes('E2E') ? 'storefront' : 'docs-security',
      layer: 'docs',
      ciCoverage: 'none',
      verification: null,
      health: 'healthy',
    });
  }
  for (const r of RUNBOOK_DOCS.sort()) {
    const file = path.join(ROOT, r);
    if (!fs.existsSync(file)) continue;
    docs.push({
      id: `doc:${r}`,
      path: r,
      title: firstHeading(file),
      area: r.includes('cypress') ? 'storefront' : r.includes('supabase') ? 'edge' : 'infra-ci',
      layer: 'docs',
      ciCoverage: 'none',
      verification: null,
      health: 'healthy',
    });
  }
  const seen = new Set();
  return docs.filter((d) => {
    if (seen.has(d.path)) return false;
    seen.add(d.path);
    return true;
  });
}

function collectEdgeFunctions() {
  const fnDir = path.join(ROOT, 'supabase', 'functions');
  let openApiNames = new Set();
  try {
    const spec = readJson(path.join(ROOT, 'openapi', 'supabase-edge-functions.json'));
    openApiNames = new Set((spec.tags || []).map((t) => t.name));
  } catch {
    /* ignore */
  }

  return fs
    .readdirSync(fnDir)
    .filter((name) => {
      if (name.startsWith('_')) return false;
      return fs.existsSync(path.join(fnDir, name, 'index.ts'));
    })
    .sort()
    .map((name) => ({
      id: `edge:${name}`,
      name,
      path: `supabase/functions/${name}/index.ts`,
      inOpenApi: openApiNames.has(name),
      bundlingChecked: true,
      area: 'edge',
      layer: 'edge',
      ciCoverage: 'ci.yml',
      verification: 'pnpm run check:edge-functions:bundling:full',
      deployScript: `supabase functions deploy ${name}`,
      health: 'healthy',
    }));
}

function parseTechDebt() {
  const md = fs.readFileSync(path.join(ROOT, 'docs', 'TECH_DEBT.md'), 'utf8');
  const items = [];
  const tableRe = /^\| `([^`]+)` \| (.+?) \|$/gm;
  let m;
  while ((m = tableRe.exec(md)) !== null) {
    items.push({
      id: `tech-debt:${m[1]}`,
      file: m[1],
      notes: m[2].trim(),
      area: m[1].includes('supabase/functions') ? 'edge' : m[1].includes('rls') ? 'edge' : 'storefront',
      layer: m[1].includes('eslint') ? 'spa' : 'edge',
      health: 'debt',
      ciCoverage: 'none',
      verification: 'pnpm run validate',
    });
  }
  const sections = [
    { id: 'tech-debt:eslint-grandfather', title: 'ESLint grandfathered imports (SPA)', area: 'storefront' },
    { id: 'tech-debt:vitest-rls-skip', title: 'Vitest RLS skips', area: 'edge' },
    { id: 'tech-debt:eslint-any', title: 'ESLint no-explicit-any (SPA)', area: 'storefront' },
    { id: 'tech-debt:deno-ban-ts-comment', title: 'Deno ban-ts-comment carve-out', area: 'edge' },
  ];
  for (const s of sections) {
    if (!items.some((i) => i.id === s.id)) {
      items.push({
        id: s.id,
        file: 'docs/TECH_DEBT.md',
        notes: s.title,
        area: s.area,
        layer: s.area === 'edge' ? 'edge' : 'spa',
        health: 'debt',
        ciCoverage: 'none',
        verification: 'pnpm run validate',
      });
    }
  }
  return items;
}

function buildInventory(catalog) {
  const inventory = [];

  const push = (row) => {
    inventory.push({
      catalogId: row.id,
      title: row.title || row.name || row.path || row.id,
      itemType: row.itemType,
      area: row.area,
      layer: row.layer,
      verification: row.verification || null,
      ciCoverage: row.ciCoverage || 'none',
      docLink: row.docLink || row.path || null,
      health: row.health || 'healthy',
      labels: row.labels || [],
    });
  };

  push({
    id: 'git-metric:hygiene',
    title: 'Git hygiene — conventional commits',
    itemType: 'git-metric',
    area: 'infra-ci',
    layer: 'ci',
    verification: 'commitlint on commit-msg',
    ciCoverage: 'none',
    docLink: 'commitlint.config.mjs',
    health:
      catalog.git.subjectQuality.genericPercent > 20 ? 'drift-risk' : 'healthy',
    labels: ['catalog/workflow', 'area/infra-ci', 'verify/validate'],
  });

  for (const s of catalog.scripts) {
    push({
      ...s,
      itemType: 'script',
      title: `script: ${s.name}`,
      docLink: 'package.json',
      labels: ['catalog/script', `area/${s.area}`],
    });
  }

  for (const t of catalog.tests) {
    push({
      ...t,
      itemType: 'test',
      title: `test: ${t.file}`,
      docLink: t.file,
      verification: t.localCommand,
      labels: ['catalog/test', `area/${t.area}`],
    });
  }

  for (const d of catalog.docs) {
    push({
      ...d,
      itemType: 'doc',
      title: d.title,
      docLink: d.path,
      labels: ['catalog/doc', `area/${d.area}`],
    });
  }

  for (const w of catalog.workflows) {
    push({
      ...w,
      itemType: 'workflow',
      title: w.name,
      docLink: w.file,
      labels: ['catalog/workflow', `area/${w.area}`],
    });
  }

  for (const e of catalog.edgeFunctions) {
    push({
      ...e,
      itemType: 'edge-function',
      title: `edge: ${e.name}`,
      docLink: e.path,
      labels: ['catalog/workflow', 'area/edge', 'layer/edge'],
    });
  }

  for (const td of catalog.techDebt) {
    push({
      ...td,
      itemType: 'tech-debt',
      title: td.notes || td.file,
      docLink: 'docs/TECH_DEBT.md',
      labels: ['catalog/tech-debt', `area/${td.area}`],
    });
  }

  return inventory.sort((a, b) => a.catalogId.localeCompare(b.catalogId));
}

function renderMarkdown(catalog) {
  const lines = [
    '# Platform catalog',
    '',
    `> Auto-generated by \`pnpm run project:catalog\`. Do not hand-edit. Schema: [catalog.schema.json](./catalog.schema.json).`,
    '',
    `Generated: **${catalog.generatedAt}**`,
    '',
    '## Git health',
    '',
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Total commits | ${catalog.git.totalCommits} |`,
    `| Generic subjects (Changes/WIP/…) | ${catalog.git.subjectQuality.genericPercent}% (${catalog.git.subjectQuality.genericCount}) |`,
    `| Conventional subjects | ${catalog.git.subjectQuality.conventionalPercent}% (${catalog.git.subjectQuality.conventionalCount}) |`,
    '',
    '### Commits per month (last 18 months)',
    '',
    '| Month | Count |',
    '| --- | ---: |',
    ...catalog.git.monthly.map((m) => `| ${m.month} | ${m.count} |`),
    '',
    '### Top authors',
    '',
    '| Author | Commits |',
    '| --- | ---: |',
    ...catalog.git.authors.slice(0, 10).map((a) => `| ${a.name} | ${a.count} |`),
    '',
    '### Path churn (last commit)',
    '',
    '| Prefix | Last commit |',
    '| --- | --- |',
    ...catalog.git.pathChurn.map((p) => `| \`${p.prefix}\` | ${p.lastCommitDate} |`),
    '',
    '## Scripts (`package.json`)',
    '',
    '| Script | Category | CI | Validate | Verification |',
    '| --- | --- | --- | --- | --- |',
    ...catalog.scripts.map(
      (s) =>
        `| \`${s.name}\` | ${s.category} | ${s.ciCoverage} | ${s.inValidate ? 'yes' : 'no'} | \`${s.verification}\` |`
    ),
    '',
    '## Test matrix',
    '',
    '| File | Runner | CI | In validate | Local |',
    '| --- | --- | --- | --- | --- |',
    ...catalog.tests.slice(0, 40).map(
      (t) =>
        `| \`${t.file}\` | ${t.runner} | ${t.ciCoverage} | ${t.inValidate ? 'yes' : 'no'} | \`${t.localCommand}\` |`
    ),
    ...(catalog.tests.length > 40
      ? [`| … | | | | _${catalog.tests.length - 40} more in catalog.json_ |`]
      : []),
    '',
    '## Documentation',
    '',
    '| Path | Title | Area |',
    '| --- | --- | --- |',
    ...catalog.docs.map((d) => `| [\`${d.path}\`](../../${d.path}) | ${d.title} | ${d.area} |`),
    '',
    '## Workflows',
    '',
    '| Workflow | Triggers | pnpm commands |',
    '| --- | --- | --- |',
    ...catalog.workflows.map(
      (w) =>
        `| [${w.name}](../../${w.file}) | ${w.triggers.join(', ')} | ${w.pnpmCommands.slice(0, 5).join(', ')}${w.pnpmCommands.length > 5 ? '…' : ''} |`
    ),
    '',
    '## Edge functions',
    '',
    `**${catalog.edgeFunctions.length}** deployable functions. OpenAPI + bundling check in CI.`,
    '',
    '| Function | OpenAPI |',
    '| --- | --- |',
    ...catalog.edgeFunctions.map((e) => `| \`${e.name}\` | ${e.inOpenApi ? 'yes' : 'no'} |`),
    '',
    '## Tech debt',
    '',
    '| Item | Notes |',
    '| --- | --- |',
    ...catalog.techDebt.map((t) => `| \`${t.file || t.id}\` | ${t.notes} |`),
    '',
    '## Platform areas',
    '',
    ...catalog.platformAreas.map((a) => `- **${a.label}** (\`${a.id}\`, layer: ${a.layer})`),
    '',
    '## Dashboard',
    '',
    'Open [reports/project-dashboard.html](../../reports/project-dashboard.html) locally after `pnpm run project:catalog` (also uploaded as a CI artifact).',
    '',
  ];
  return lines.join('\n');
}

function renderDashboard(catalog) {
  const months = catalog.git.monthly.map((m) => m.month);
  const counts = catalog.git.monthly.map((m) => m.count);
  const sq = catalog.git.subjectQuality;

  const scriptsByCategory = {};
  for (const s of catalog.scripts) {
    scriptsByCategory[s.category] = (scriptsByCategory[s.category] || 0) + 1;
  }

  const testsByRunner = {};
  for (const t of catalog.tests) {
    testsByRunner[t.runner] = (testsByRunner[t.runner] || 0) + 1;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lucid Web Craftsman — Platform dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    :root { font-family: system-ui, sans-serif; background: #0f1419; color: #e7ecf3; }
    body { margin: 0; padding: 1.5rem; max-width: 1200px; margin-inline: auto; }
    h1 { font-size: 1.5rem; }
    .meta { color: #8b9cb3; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
    .card { background: #1a2332; border-radius: 8px; padding: 1rem; }
    .card h2 { font-size: 1rem; margin: 0 0 0.75rem; }
    .stat { font-size: 2rem; font-weight: 600; }
    canvas { max-height: 220px; }
    a { color: #6eb5ff; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th, td { text-align: left; padding: 0.35rem 0.5rem; border-bottom: 1px solid #2a3548; }
  </style>
</head>
<body>
  <h1>Lucid Web Craftsman — Platform dashboard</h1>
  <p class="meta">Generated ${catalog.generatedAt} · <a href="../.github/project/PROJECT_CATALOG.md">PROJECT_CATALOG.md</a> · <a href="../.github/project/catalog.json">catalog.json</a></p>
  <div class="grid">
    <div class="card"><h2>Total commits</h2><div class="stat">${catalog.git.totalCommits}</div></div>
    <div class="card"><h2>Scripts</h2><div class="stat">${catalog.scripts.length}</div></div>
    <div class="card"><h2>Tests</h2><div class="stat">${catalog.tests.length}</div></div>
    <div class="card"><h2>Docs indexed</h2><div class="stat">${catalog.docs.length}</div></div>
    <div class="card"><h2>Edge functions</h2><div class="stat">${catalog.edgeFunctions.length}</div></div>
  </div>
  <div class="grid" style="margin-top:1rem">
    <div class="card"><h2>Commits per month</h2><canvas id="monthly"></canvas></div>
    <div class="card"><h2>Commit subject quality</h2><canvas id="subjects"></canvas></div>
    <div class="card"><h2>Scripts by category</h2><canvas id="scripts"></canvas></div>
    <div class="card"><h2>Tests by runner</h2><canvas id="tests"></canvas></div>
  </div>
  <div class="card" style="margin-top:1rem">
    <h2>CI scripts (${catalog.scripts.filter((s) => s.ciCoverage !== 'none').length} in workflows)</h2>
    <table><thead><tr><th>Script</th><th>CI</th><th>Category</th></tr></thead><tbody>
    ${catalog.scripts
      .filter((s) => s.ciCoverage !== 'none')
      .slice(0, 25)
      .map((s) => `<tr><td><code>${s.name}</code></td><td>${s.ciCoverage}</td><td>${s.category}</td></tr>`)
      .join('')}
    </tbody></table>
  </div>
  <script>
    const chartOpts = { plugins: { legend: { labels: { color: '#e7ecf3' } } }, scales: { x: { ticks: { color: '#8b9cb3' } }, y: { ticks: { color: '#8b9cb3' } } } };
    new Chart(document.getElementById('monthly'), { type: 'bar', data: { labels: ${JSON.stringify(months)}, datasets: [{ label: 'Commits', data: ${JSON.stringify(counts)}, backgroundColor: '#3d7dd6' }] }, options: chartOpts });
    new Chart(document.getElementById('subjects'), { type: 'doughnut', data: { labels: ['Generic', 'Conventional', 'Other'], datasets: [{ data: [${sq.genericCount}, ${sq.conventionalCount}, ${sq.otherCount}], backgroundColor: ['#e85d5d','#4caf82','#8b9cb3'] }] }, options: { plugins: { legend: { labels: { color: '#e7ecf3' } } } } });
    new Chart(document.getElementById('scripts'), { type: 'pie', data: { labels: ${JSON.stringify(Object.keys(scriptsByCategory))}, datasets: [{ data: ${JSON.stringify(Object.values(scriptsByCategory))}, backgroundColor: ['#3d7dd6','#9b6bd9','#4caf82','#e8a838','#e85d5d','#5bc0de','#f06292','#8d6e63'] }] }, options: { plugins: { legend: { labels: { color: '#e7ecf3' } } } } });
    new Chart(document.getElementById('tests'), { type: 'pie', data: { labels: ${JSON.stringify(Object.keys(testsByRunner))}, datasets: [{ data: ${JSON.stringify(Object.values(testsByRunner))}, backgroundColor: ['#4caf82','#3d7dd6','#e8a838'] }] }, options: { plugins: { legend: { labels: { color: '#e7ecf3' } } } } });
  </script>
</body>
</html>`;
}

function main() {
  const scriptToCi = parseWorkflows();
  const pkg = readJson(path.join(ROOT, 'package.json'));

  const catalog = {
    generatedAt: catalogGeneratedAt(),
    repository: {
      name: pkg.name,
      url: pkg.repository?.url || 'https://github.com/benmed00/lucid-web-craftsman',
    },
    git: collectGit(),
    scripts: collectScripts(scriptToCi),
    tests: collectTests(),
    docs: collectDocs(),
    workflows,
    edgeFunctions: collectEdgeFunctions(),
    techDebt: parseTechDebt(),
    platformAreas: PLATFORM_AREAS,
    inventory: [],
  };

  catalog.inventory = buildInventory(catalog);

  fs.mkdirSync(PROJECT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(DASHBOARD_HTML), { recursive: true });

  const json = JSON.stringify(catalog, null, 2) + '\n';
  fs.writeFileSync(CATALOG_JSON, json);
  fs.writeFileSync(CATALOG_MD, renderMarkdown(catalog) + '\n');

  fs.writeFileSync(DASHBOARD_HTML, renderDashboard(catalog));

  const prettierTargets = [CATALOG_JSON, CATALOG_MD, path.join(PROJECT_DIR, 'catalog.schema.json')];
  const prettier = spawnSync(
    'pnpm',
    ['exec', 'prettier', '--write', ...prettierTargets],
    { cwd: ROOT, stdio: 'pipe' }
  );
  if (prettier.status !== 0) {
    console.warn('Prettier on catalog outputs failed; run pnpm run format on .github/project/');
  }

  console.log(`Wrote ${rel(CATALOG_JSON)}`);
  console.log(`Wrote ${rel(CATALOG_MD)}`);
  console.log(`Wrote ${rel(DASHBOARD_HTML)}`);
  console.log(
    `Inventory: ${catalog.inventory.length} items (${catalog.scripts.length} scripts, ${catalog.tests.length} tests, ${catalog.docs.length} docs)`
  );
}

main();

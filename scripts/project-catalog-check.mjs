/**
 * Regenerates platform catalog and fails if stable sections of catalog.json would change.
 * Ignores generatedAt, git, and repository (they change every commit / run).
 * Usage: pnpm run project:catalog:check
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SPEC = path.join(ROOT, '.github/project/catalog.json');
const TEMP = path.join(ROOT, '.github/project/catalog.check.tmp.json');

const STABLE_KEYS = [
  'scripts',
  'tests',
  'docs',
  'workflows',
  'edgeFunctions',
  'techDebt',
  'milestones',
  'platformAreas',
  'inventory',
];

function stableSlice(catalog) {
  const out = {};
  for (const key of STABLE_KEYS) {
    if (catalog[key] !== undefined) out[key] = catalog[key];
  }
  return out;
}

const gen = spawnSync(process.execPath, ['scripts/generate-project-catalog.mjs'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: false,
});
if (gen.status !== 0) process.exit(gen.status ?? 1);

const committed = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
const regenerated = JSON.parse(fs.readFileSync(SPEC, 'utf8'));

const a = JSON.stringify(stableSlice(committed));
const b = JSON.stringify(stableSlice(regenerated));

if (a === b) {
  console.log(`${path.relative(ROOT, SPEC)} stable sections are up to date.`);
  process.exit(0);
}

fs.writeFileSync(TEMP, JSON.stringify(stableSlice(regenerated), null, 2) + '\n');
console.error(
  `Drift in ${path.relative(ROOT, SPEC)} (scripts/tests/docs/workflows/inventory): run pnpm run project:catalog and commit.`
);
console.error(`Diff written to ${path.relative(ROOT, TEMP)} for inspection.`);
process.exit(1);

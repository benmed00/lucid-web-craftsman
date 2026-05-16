#!/usr/bin/env node
/**
 * Pushes docs/pr-enterprise/issues/*.md bodies to GitHub issues #36–#44.
 * Usage: pnpm run pr:enterprise:issues:sync
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pairs = [
  [36, '01-ci-runbook.md'],
  [37, '02-eslint-any.md'],
  [38, '03-platform-docs.md'],
  [39, '04-e2e-smoke.md'],
  [40, '05-supabase-edge.md'],
  [41, '06-types-contracts.md'],
  [42, '07-scripts-tooling.md'],
  [43, '08-perf-seo.md'],
  [44, '09-checkout-architecture.md'],
];

for (const [num, file] of pairs) {
  const bodyPath = path.join(root, 'docs/pr-enterprise/issues', file);
  console.log(`Updating #${num} from ${file}…`);
  const r = spawnSync(
    'gh',
    ['issue', 'edit', String(num), '--body-file', bodyPath],
    { stdio: 'inherit', cwd: root }
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log('All issue bodies updated.');

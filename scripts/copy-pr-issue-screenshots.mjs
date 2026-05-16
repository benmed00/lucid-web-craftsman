#!/usr/bin/env node
/**
 * Copies Cypress screenshots from pr_issue_evidence_spec.js into docs for GitHub issue bodies.
 * Usage: node scripts/copy-pr-issue-screenshots.mjs
 */
import { cp, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(
  root,
  'cypress/screenshots/pr_issue_evidence_spec.js/issue-evidence'
);
const destDir = path.join(
  root,
  'docs/pr-enterprise/assets/issues/issue-evidence'
);

if (!existsSync(srcDir)) {
  console.error(
    `No screenshots at ${srcDir}\nRun: pnpm run pr:enterprise:screenshots:capture`
  );
  process.exit(1);
}

await mkdir(destDir, { recursive: true });
const files = (await readdir(srcDir)).filter((f) => f.endsWith('.png'));
for (const f of files) {
  await cp(path.join(srcDir, f), path.join(destDir, f));
  console.log(`copied ${f}`);
}
console.log(`Done → ${destDir} (${files.length} file(s))`);

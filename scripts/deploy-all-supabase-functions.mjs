/**
 * Deploy every Edge Function under supabase/functions that has index.ts.
 * Skips _shared and non-directories. Runs `supabase functions deploy <name>` sequentially.
 *
 * Usage (repo root): pnpm run deploy:functions:all
 * Requires: supabase link, supabase login, network.
 *
 * The pnpm script runs `check:edge-functions:bundling` (cross-function import rules,
 * no Deno) before this file — this script does not duplicate that check.
 */
import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const functionsRoot = path.join(root, 'supabase', 'functions');

const SKIP = new Set(['_shared', 'tests', 'node_modules']);

function listDeployableFunctions() {
  const names = [];
  for (const name of readdirSync(functionsRoot)) {
    if (SKIP.has(name) || name.startsWith('.')) continue;
    const dir = path.join(functionsRoot, name);
    let st;
    try {
      st = statSync(dir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    if (!existsSync(path.join(dir, 'index.ts'))) continue;
    names.push(name);
  }
  return names.sort((a, b) => a.localeCompare(b));
}

const functions = listDeployableFunctions();
if (functions.length === 0) {
  console.error('No functions found under', functionsRoot);
  process.exit(1);
}

console.error(`\nDeploying ${functions.length} function(s) to linked project…`);
for (let i = 0; i < functions.length; i++) {
  const name = functions[i];
  console.error(
    `\n[${i + 1}/${functions.length}] supabase functions deploy ${name}`
  );
  execSync(`supabase functions deploy ${name}`, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
}
console.error('\nAll functions deployed.');

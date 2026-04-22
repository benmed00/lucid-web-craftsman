/**
 * Regenerates OpenAPI and fails if openapi/supabase-edge-functions.json would change.
 * Usage: npm run openapi:edge-functions:check
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SPEC = 'openapi/supabase-edge-functions.json';

const gen = spawnSync(
  process.execPath,
  ['scripts/openapi-edge-functions.mjs'],
  {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  }
);
if (gen.status !== 0) process.exit(gen.status ?? 1);

const diff = spawnSync('git', ['diff', '--exit-code', '--', SPEC], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (diff.status === 0) {
  console.log(`${SPEC} is up to date.`);
  process.exit(0);
}
if (diff.status === 1) {
  console.error(
    `Drift in ${SPEC}: run npm run openapi:edge-functions and commit the result.`
  );
  process.exit(1);
}
console.error('git diff failed (is this a git repo?)');
process.exit(diff.status ?? 1);

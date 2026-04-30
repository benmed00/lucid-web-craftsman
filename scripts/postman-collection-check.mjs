/**
 * Regenerates Postman collection and fails if postman/Lucid-Web-Craftsman.postman_collection.json would change.
 * Usage: pnpm run postman:collection:check
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const COLLECTION = 'postman/Lucid-Web-Craftsman.postman_collection.json';

const gen = spawnSync(
  process.execPath,
  ['scripts/build-postman-collection.mjs'],
  {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  }
);
if (gen.status !== 0) process.exit(gen.status ?? 1);

const diff = spawnSync('git', ['diff', '--exit-code', '--', COLLECTION], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (diff.status === 0) {
  console.log(`${COLLECTION} is up to date.`);
  process.exit(0);
}
if (diff.status === 1) {
  console.error(
    `Drift in ${COLLECTION}: run pnpm run postman:collection and commit the result.`
  );
  process.exit(1);
}
console.error('git diff failed (is this a git repo?)');
process.exit(diff.status ?? 1);

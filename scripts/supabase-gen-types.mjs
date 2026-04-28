/**
 * Regenerate src/integrations/supabase/types.ts from the linked Supabase
 * project, then format it with the repo's Prettier config.
 *
 * Without the Prettier pass the generator emits no semicolons and double
 * quotes, which fails `npm run format:check` on every CI run.
 *
 * Prerequisites (one-time):
 *   - Deno-less: just `npx supabase` works.
 *   - Run `npx --yes supabase@2.90.0 login` (interactive, opens a browser)
 *     and `npx --yes supabase@2.90.0 link --project-ref <ref>` once so
 *     `--linked` resolves to the right project.
 *
 * Usage:
 *   npm run supabase:types:gen
 *
 * Override the schema with SUPABASE_GEN_TYPES_SCHEMA (default: public).
 *
 * @see https://supabase.com/docs/guides/api/rest/generating-types
 */
import { execFileSync, spawnSync } from 'child_process';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const target = path.join(root, 'src', 'integrations', 'supabase', 'types.ts');
const schema = process.env.SUPABASE_GEN_TYPES_SCHEMA || 'public';

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function generate() {
  console.log(`[supabase:types] generating from --linked (schema=${schema})`);
  const args = [
    '--yes',
    'supabase@2.90.0',
    'gen',
    'types',
    'typescript',
    '--linked',
    '--schema',
    schema,
  ];
  try {
    return execFileSync(npxCmd, args, {
      encoding: 'utf8',
      cwd: root,
      stdio: ['ignore', 'pipe', 'inherit'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    console.error(
      '\n[supabase:types] generation failed. Make sure the project is linked:\n' +
        '  npx --yes supabase@2.90.0 login\n' +
        '  npx --yes supabase@2.90.0 link --project-ref <ref>\n'
    );
    process.exit(typeof e?.status === 'number' ? e.status : 1);
  }
}

function format() {
  console.log(`[supabase:types] formatting ${path.relative(root, target)}`);
  const res = spawnSync(npxCmd, ['prettier', '--write', target], {
    cwd: root,
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    console.error('[supabase:types] prettier --write failed');
    process.exit(res.status ?? 1);
  }
}

const out = generate();
if (!out || !out.trim().startsWith('export')) {
  console.error(
    '[supabase:types] generator output looked empty / unexpected; aborting before overwriting types.ts'
  );
  process.exit(1);
}
writeFileSync(target, out, 'utf8');
format();
console.log(`[supabase:types] done -> ${path.relative(root, target)}`);

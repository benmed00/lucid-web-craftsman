/**
 * Diff local supabase/migrations/*.sql version prefixes vs linked
 * supabase_migrations.schema_migrations.
 *
 * Usage (repo root): pnpm run supabase:migration:diff
 *
 * Writes gitignored scripts/.migration-local-only-versions.txt (one version per line).
 * PowerShell batch repair:
 *   $v = Get-Content scripts\.migration-local-only-versions.txt | Where-Object { $_ }
 *   supabase migration repair --status applied @v --yes
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');

function fetchRemoteVersions() {
  const cmd =
    'npx --yes supabase@2.90.0 db query --linked --agent=no -o csv "select version from supabase_migrations.schema_migrations order by version"';
  try {
    const out = execSync(cmd, { encoding: 'utf8', cwd: root });
    return out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((line) => /^\d{14}$/.test(line));
  } catch (e) {
    console.error(
      'Failed to read remote schema_migrations. From repo root: supabase link, supabase login, then retry.\n',
      e instanceof Error ? e.message : e
    );
    process.exit(1);
  }
}

const remoteVersions = fetchRemoteVersions();
const remote = new Set(remoteVersions);
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
const local = new Set();
for (const f of files) {
  const m = f.match(/^(\d{14})_/);
  if (m) local.add(m[1]);
}

const onlyLocal = [...local].filter((v) => !remote.has(v)).sort();
const onlyRemote = [...remote].filter((v) => !local.has(v)).sort();
const maxRemote = [...remote].sort().at(-1);

console.log(JSON.stringify({
  localSqlFileVersions: local.size,
  remoteSchemaMigrationsRows: remote.size,
  localOnlyNotInRemoteHistory: onlyLocal.length,
  remoteOnlyNoLocalFile: onlyRemote.length,
  maxRemoteVersion: maxRemote,
  firstLocalOnly: onlyLocal.slice(0, 5),
  lastLocalOnly: onlyLocal.slice(-5),
  remoteOnlySample: onlyRemote.slice(0, 8),
}, null, 2));

const out = path.join(root, 'scripts', '.migration-local-only-versions.txt');
fs.writeFileSync(out, onlyLocal.join('\n') + '\n', 'utf8');
console.error('Wrote', out, `(${onlyLocal.length} versions)`);

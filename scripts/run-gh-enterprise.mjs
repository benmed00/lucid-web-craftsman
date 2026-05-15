/**
 * Cross-platform runner for enterprise PR GitHub CLI helper scripts in `docs/`.
 *
 * Prerequisites: `gh` on PATH; on Windows, PowerShell 5.1+ (for labels/issues `.ps1`);
 * on macOS/Linux, `bash` (for `.sh` parity with the PowerShell scripts).
 *
 * Examples:
 *   node scripts/run-gh-enterprise.mjs labels
 *   node scripts/run-gh-enterprise.mjs issues --dry
 *   node scripts/run-gh-enterprise.mjs issues --repo owner/repo
 *   GH_REPO=owner/repo node scripts/run-gh-enterprise.mjs issues
 *
 * pnpm (prefix): `pnpm run pr:enterprise -- labels` · `pnpm run pr:enterprise -- issues --dry` · `pnpm run pr:enterprise -- issues --repo owner/repo`
 * pnpm (shortcuts): `pnpm run pr:enterprise:labels`, `pnpm run pr:enterprise:issues`, `pnpm run pr:enterprise:issues:dry`; repo via env: `cross-env GH_REPO=owner/repo pnpm run pr:enterprise:issues`
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const USAGE = `Usage: node scripts/run-gh-enterprise.mjs <labels|issues> [--dry] [--repo|-R owner/repo]

  labels   Create suggested labels (docs/gh-labels-enterprise-pr.*)
  issues   Create the eight tracking issues (docs/gh-issues-enterprise-platform.*)
  --dry    Issues only: list titles only; no gh issue create
  --repo   Optional; same as GH_REPO (non-default gh target)`;

function parseArgs(argv) {
  let dry = false;
  let repoFlag = '';
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry') {
      dry = true;
      continue;
    }
    if ((a === '--repo' || a === '-R') && argv[i + 1]) {
      repoFlag = argv[i + 1];
      i += 1;
      continue;
    }
    if (a.startsWith('-')) {
      console.error(`${USAGE}\n\nunknown flag: ${a}`);
      process.exit(1);
    }
    positional.push(a);
  }
  return { dry, repoFlag, positional };
}

function run(cmd, args, env) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: root,
    env: env ?? process.env,
    shell: false,
  });
  const code = r.status;
  if (code === null) {
    console.error(`failed to spawn: ${cmd}`);
    process.exit(1);
  }
  process.exit(code);
}

function envWithRepo(repo, extra = {}) {
  const env = { ...process.env, ...extra };
  if (repo) env.GH_REPO = repo;
  return env;
}

function appendRepoPs(psArgs, repo) {
  if (!repo) return;
  psArgs.push('-Repo', repo);
}

function main() {
  const argv = process.argv.slice(2);
  const { dry, repoFlag, positional } = parseArgs(argv);
  const sub = positional[0];
  const repo = repoFlag || process.env.GH_REPO || '';

  if (!sub || !['labels', 'issues'].includes(sub)) {
    console.error(USAGE);
    process.exit(1);
  }

  const isWin = process.platform === 'win32';

  if (sub === 'labels') {
    if (isWin) {
      const psArgs = [
        '-ExecutionPolicy',
        'Bypass',
        '-NoProfile',
        '-File',
        path.join(root, 'docs', 'gh-labels-enterprise-pr.ps1'),
      ];
      appendRepoPs(psArgs, repo);
      run('powershell.exe', psArgs);
    }
    run('bash', [path.join(root, 'docs', 'gh-labels-enterprise-pr.sh')], envWithRepo(repo));
  }

  if (isWin) {
    const psArgs = [
      '-ExecutionPolicy',
      'Bypass',
      '-NoProfile',
      '-File',
      path.join(root, 'docs', 'gh-issues-enterprise-platform.ps1'),
    ];
    if (dry) psArgs.push('-DryRun');
    appendRepoPs(psArgs, repo);
    run('powershell.exe', psArgs);
  }

  const extra = dry ? { DRY_RUN: '1' } : {};
  run('bash', [path.join(root, 'docs', 'gh-issues-enterprise-platform.sh')], envWithRepo(repo, extra));
}

main();

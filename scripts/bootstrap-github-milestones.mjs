/**
 * Creates or updates GitHub repository milestones and assigns issues.
 * Source: .github/milestones.yml
 * Usage: node scripts/bootstrap-github-milestones.mjs [--dry-run]
 */

import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { parseMilestonesYaml } from './lib/parse-milestones-yml.mjs';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, '.github', 'milestones.yml');
const dryRun = process.argv.includes('--dry-run');

function detectRepo() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const r = spawnSync('git', ['remote', 'get-url', 'origin'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const m = (r.stdout || '').trim().match(/github\.com[:/](.+?)(?:\.git)?$/);
  return m ? m[1] : 'benmed00/lucid-web-craftsman';
}

function ghApi(args, input) {
  if (dryRun) {
    console.log('[dry-run] gh api', args.join(' '));
    const isList = args[0]?.includes('/milestones') && !args.includes('-X');
    return { stdout: isList ? '[]' : '{}', status: 0 };
  }
  const r = spawnSync('gh', ['api', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    input: input || undefined,
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error(`gh api failed: ${args.join(' ')}`);
  }
  return r;
}

function listMilestones(repo) {
  const r = ghApi([`repos/${repo}/milestones`, '--paginate']);
  return JSON.parse(r.stdout || '[]');
}

function createOrUpdateMilestone(repo, def, existingByTitle) {
  const due = def.due_on ? `${def.due_on}T23:59:59Z` : undefined;
  const existing = existingByTitle.get(def.title);
  const body = {
    title: def.title,
    description: def.description || '',
    state: def.state === 'closed' ? 'closed' : 'open',
    ...(due ? { due_on: due } : {}),
  };

  if (existing) {
    if (dryRun) {
      console.log(`[dry-run] update milestone #${existing.number} ${def.id}`);
      return existing;
    }
    ghApi([
      `repos/${repo}/milestones/${existing.number}`,
      '-X',
      'PATCH',
      '-f',
      `title=${body.title}`,
      '-f',
      `description=${body.description}`,
      '-f',
      `state=${body.state}`,
      ...(due ? ['-f', `due_on=${due}`] : []),
    ]);
    console.log(`Updated milestone #${existing.number} (${def.id})`);
    return existing;
  }

  if (dryRun) {
    console.log(`[dry-run] create milestone ${def.id}: ${def.title}`);
    return { number: 0, title: def.title };
  }
  const args = [
    `repos/${repo}/milestones`,
    '-f',
    `title=${body.title}`,
    '-f',
    `description=${body.description}`,
    '-f',
    `state=${body.state}`,
  ];
  if (due) args.push('-f', `due_on=${due}`);
  const r = ghApi(args);
  const created = JSON.parse(r.stdout);
  console.log(`Created milestone #${created.number} (${def.id})`);
  return created;
}

function assignIssue(repo, issueNumber, milestoneNumber) {
  if (dryRun) {
    console.log(
      `[dry-run] issue #${issueNumber} → milestone #${milestoneNumber}`
    );
    return;
  }
  ghApi([
    `repos/${repo}/issues/${issueNumber}`,
    '-X',
    'PATCH',
    '-f',
    `milestone=${milestoneNumber}`,
  ]);
  console.log(`Assigned issue #${issueNumber} → milestone #${milestoneNumber}`);
}

function main() {
  const gh = spawnSync('gh', ['--version'], { encoding: 'utf8' });
  if (gh.status !== 0) {
    console.error('gh CLI is required.');
    process.exit(1);
  }

  const raw = parseMilestonesYaml(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const milestones = raw.milestones;
  const issueOverrides = raw.issueOverrides;
  const repo = detectRepo();
  console.log(`Repository: ${repo}`);

  const existing = listMilestones(repo);
  const byTitle = new Map(existing.map((m) => [m.title, m]));
  const byId = new Map();

  for (const def of milestones) {
    const m = createOrUpdateMilestone(repo, def, byTitle);
    byId.set(def.id, m);
    byTitle.set(def.title, m);
  }

  for (const def of milestones) {
    const m = byId.get(def.id);
    if (!m?.number) continue;
    for (const num of def.issues || []) {
      try {
        assignIssue(repo, num, m.number);
      } catch (e) {
        console.warn(`Skip issue #${num} (${def.id}): ${e.message}`);
      }
    }
  }

  for (const ov of issueOverrides) {
    const m = byId.get(ov.milestone_id);
    if (!m?.number) continue;
    try {
      assignIssue(repo, ov.issue, m.number);
    } catch (e) {
      console.warn(`Skip override #${ov.issue}: ${e.message}`);
    }
  }

  console.log(dryRun ? 'Dry-run complete.' : 'Milestones synced.');
}

main();

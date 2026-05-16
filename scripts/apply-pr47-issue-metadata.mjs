/**
 * Apply labels and milestones to PR #47 delivery issues (#55–#57, epic #58).
 * Requires: gh CLI, issues:write on benmed00/lucid-web-craftsman
 *
 * Usage: node scripts/apply-pr47-issue-metadata.mjs [--dry-run]
 */

import { spawnSync } from 'child_process';

const dryRun = process.argv.includes('--dry-run');
const REPO = process.env.GITHUB_REPOSITORY || 'benmed00/lucid-web-craftsman';

const ISSUES = [
  {
    number: 58,
    milestone: 1,
    labels: ['ci', 'build', 'type:chore', 'area:ci'],
  },
  {
    number: 55,
    milestone: 1,
    labels: ['ci', 'build', 'type:chore', 'area:ci'],
  },
  {
    number: 56,
    milestone: 1,
    labels: ['ci', 'build', 'type:chore', 'area:ci'],
  },
  {
    number: 57,
    milestone: 2,
    labels: ['testing', 'area:test', 'ci', 'area:frontend'],
  },
];

function ghApi(method, path, body) {
  const args = ['api', '-X', method, `repos/${REPO}/${path}`];
  if (body) args.push('--input', '-');
  if (dryRun) {
    console.log('[dry-run]', method, path, body || '');
    return { status: 0 };
  }
  const r = spawnSync('gh', args, {
    encoding: 'utf8',
    input: body ? JSON.stringify(body) : undefined,
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error(`gh api failed: ${path}`);
  }
  return r;
}

for (const issue of ISSUES) {
  ghApi('PATCH', `issues/${issue.number}`, {
    milestone: issue.milestone,
    labels: issue.labels,
  });
  console.log(`Updated #${issue.number} milestone=${issue.milestone} labels=${issue.labels.join(',')}`);
}

console.log(dryRun ? 'Dry-run complete.' : 'Metadata applied.');

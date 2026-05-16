/**
 * Apply labels, milestones, PR milestone, and close duplicate delivery issues
 * for PR #47 (#55–#58 canonical; #48–#54 duplicates).
 *
 * Requires: gh CLI with issues:write (and pull-requests:write for PR milestone).
 *
 * Usage: node scripts/apply-pr47-issue-metadata.mjs [--dry-run]
 */

import { spawnSync } from 'child_process';

const dryRun = process.argv.includes('--dry-run');
const REPO = process.env.GITHUB_REPOSITORY || 'benmed00/lucid-web-craftsman';
const PR_NUMBER = Number(process.env.PR_NUMBER || '47', 10);

/** Repo milestone numbers (M0=1, M1=2 on benmed00/lucid-web-craftsman). */
const MILESTONE_M0 = Number(process.env.MILESTONE_M0 || '1', 10);
const MILESTONE_M1 = Number(process.env.MILESTONE_M1 || '2', 10);

const ISSUES = [
  {
    number: 58,
    milestone: MILESTONE_M0,
    labels: ['ci', 'build', 'type:chore', 'area:ci'],
  },
  {
    number: 55,
    milestone: MILESTONE_M0,
    labels: ['ci', 'build', 'type:chore', 'area:ci'],
  },
  {
    number: 56,
    milestone: MILESTONE_M0,
    labels: ['ci', 'build', 'type:chore', 'area:ci'],
  },
  {
    number: 57,
    milestone: MILESTONE_M1,
    labels: ['testing', 'area:test', 'ci', 'area:frontend'],
  },
];

const DUPLICATE_ISSUES = [48, 49, 50, 51, 52, 53, 54];
const DUPLICATE_COMMENT =
  'Duplicate delivery issue; canonical tracking is #55–#58 and PR #47. Closed by `apply-pr47-issue-metadata.mjs`.';

function ghApi(method, path, body) {
  const args = ['api', '-X', method, `repos/${REPO}/${path}`];
  if (body) args.push('--input', '-');
  if (dryRun) {
    console.log('[dry-run]', method, path, body ? JSON.stringify(body) : '');
    return { status: 0, stdout: '{}' };
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

function patchIssue(number, body) {
  ghApi('PATCH', `issues/${number}`, body);
}

for (const issue of ISSUES) {
  patchIssue(issue.number, {
    milestone: issue.milestone,
    labels: issue.labels,
  });
  console.log(
    `Updated #${issue.number} milestone=${issue.milestone} labels=${issue.labels.join(',')}`
  );
}

patchIssue(PR_NUMBER, { milestone: MILESTONE_M0 });
console.log(`Set PR #${PR_NUMBER} milestone=${MILESTONE_M0} (M0)`);

for (const num of DUPLICATE_ISSUES) {
  if (dryRun) {
    console.log(`[dry-run] close #${num}`);
    continue;
  }
  const state = spawnSync(
    'gh',
    ['api', `repos/${REPO}/issues/${num}`, '--jq', '.state'],
    { encoding: 'utf8' }
  );
  if (state.stdout?.trim() === 'closed') {
    console.log(`Skip #${num} (already closed)`);
    continue;
  }
  patchIssue(num, { state: 'closed', state_reason: 'not_planned' });
  ghApi('POST', `issues/${num}/comments`, { body: DUPLICATE_COMMENT });
  console.log(`Closed duplicate #${num}`);
}

console.log(dryRun ? 'Dry-run complete.' : 'PR47 metadata applied.');

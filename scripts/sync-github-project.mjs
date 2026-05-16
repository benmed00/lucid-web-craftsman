/**
 * Sync catalog inventory to GitHub issues and Projects v2.
 * Usage: PROJECT_NUMBER=1 node scripts/sync-github-project.mjs [--dry-run] [--close-removed]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, '.github', 'project', 'catalog.json');

const dryRun = process.argv.includes('--dry-run');
const closeRemoved = process.argv.includes('--close-removed');

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const projectNumber = process.env.PROJECT_NUMBER;
const owner = process.env.GITHUB_PROJECT_OWNER || 'benmed00';
function detectRepoFull() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    const remote = execSync('git remote get-url origin', { cwd: ROOT, encoding: 'utf8' }).trim();
    const m = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
    return m ? m[1] : 'benmed00/lucid-web-craftsman';
  } catch {
    return 'benmed00/lucid-web-craftsman';
  }
}

const repoFull = detectRepoFull();

const [repoOwner, repoName] = repoFull.split('/');

async function graphql(query, variables = {}) {
  if (dryRun) {
    if (query.trim().startsWith('mutation')) {
      console.log('[dry-run] GraphQL mutation skipped');
    }
    return {};
  }
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data;
}

function catalogMarker(id) {
  return `<!-- catalog-id: ${id} -->`;
}

async function findIssueByCatalogId(catalogId) {
  const q = `repo:${repoOwner}/${repoName} "${catalogMarker(catalogId)}" in:body`;
  const data = await graphql(
    `query($q: String!) {
      search(query: $q, type: ISSUE, first: 1) {
        nodes { ... on Issue { id number title state } }
      }
    }`,
    { q }
  );
  return data.search?.nodes?.[0] ?? null;
}

async function getProjectId() {
  const data = await graphql(
    `query($owner: String!, $number: Int!) {
      user(login: $owner) {
        projectV2(number: $number) { id title }
      }
    }`,
    { owner, number: parseInt(projectNumber, 10) }
  );
  const project = data.user?.projectV2;
  if (!project) {
    throw new Error(`Project #${projectNumber} not found for user ${owner}`);
  }
  return project.id;
}

async function createIssue(item) {
  const marker = catalogMarker(item.catalogId);
  const body = [
    marker,
    '',
    `| Field | Value |`,
    `| --- | --- |`,
    `| Item type | ${item.itemType} |`,
    `| Area | ${item.area} |`,
    `| Layer | ${item.layer} |`,
    `| Verification | ${item.verification || '—'} |`,
    `| CI coverage | ${item.ciCoverage} |`,
    `| Doc link | ${item.docLink || '—'} |`,
    `| Health | ${item.health} |`,
    '',
    '_Auto-managed by `scripts/sync-github-project.mjs`. Do not edit the catalog-id line._',
  ].join('\n');

  const title = `[catalog] ${item.title}`.slice(0, 256);

  if (dryRun) {
    console.log(`[dry-run] create issue: ${title}`);
    return { id: 'dry-run-issue-id', number: 0 };
  }

  const data = await graphql(
    `mutation($repoId: ID!, $title: String!, $body: String!) {
      createIssue(input: { repositoryId: $repoId, title: $title, body: $body }) {
        issue { id number }
      }
    }`,
    { repoId: await getRepoNodeId(), title, body }
  );
  return data.createIssue.issue;
}

let repoNodeIdCache;
async function getRepoNodeId() {
  if (repoNodeIdCache) return repoNodeIdCache;
  const data = await graphql(
    `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) { id }
    }`,
    { owner: repoOwner, name: repoName }
  );
  repoNodeIdCache = data.repository.id;
  return repoNodeIdCache;
}

async function addIssueToProject(projectId, issueId) {
  if (dryRun) {
    console.log(`[dry-run] add issue to project ${projectId}`);
    return;
  }
  await graphql(
    `mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }`,
    { projectId, contentId: issueId }
  );
}

async function ensureLabels(issueNumber, labels) {
  if (dryRun || !labels?.length) return;
  await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/labels`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({ labels: labels.map((l) => l.replace('area/', 'area/')) }),
    }
  );
}

async function main() {
  if (!dryRun && !token) {
    console.error('Set GITHUB_TOKEN or GH_TOKEN');
    process.exit(1);
  }
  if (!projectNumber && !dryRun) {
    console.error('Set PROJECT_NUMBER');
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const inventory = catalog.inventory || [];
  console.log(`Syncing ${inventory.length} inventory items to ${repoOwner}/${repoName}…`);

  if (dryRun) {
    for (const item of inventory) {
      console.log(`[dry-run] upsert: ${item.catalogId} — ${item.title}`);
    }
    console.log('Dry-run complete.');
    return;
  }

  const projectId = projectNumber ? await getProjectId() : null;
  const seen = new Set();

  for (const item of inventory) {
    seen.add(item.catalogId);

    let issue = await findIssueByCatalogId(item.catalogId);
    if (!issue) {
      issue = await createIssue(item);
      console.log(`Created #${issue.number}: ${item.catalogId}`);
    } else if (issue.state === 'CLOSED') {
      console.log(`Skip closed: ${item.catalogId} (#${issue.number})`);
      continue;
    } else {
      console.log(`Exists: ${item.catalogId} (#${issue.number})`);
    }

    if (issue.number) {
      await ensureLabels(issue.number, item.labels);
    }
    if (projectId && issue.id) {
      try {
        await addIssueToProject(projectId, issue.id);
      } catch (e) {
        if (!String(e.message).includes('already exists')) {
          console.warn(`Project add: ${item.catalogId}: ${e.message}`);
        }
      }
    }
  }

  if (closeRemoved) {
    console.log('--close-removed: not implemented (enable in a follow-up with search pagination)');
  }

  console.log(dryRun ? 'Dry-run complete.' : 'Sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

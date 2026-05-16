/**
 * Parse .github/milestones.yml — shared by catalog generator and bootstrap script.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = path.join(
  __dirname,
  '..',
  '..',
  '.github',
  'milestones.yml'
);

const MILESTONE_AREA = {
  M0: 'infra-ci',
  M1: 'infra-ci',
  M2: 'checkout-payments',
  M3: 'storefront',
  M4: 'docs-security',
  M5: 'storefront',
  M6: 'storefront',
  M7: 'edge',
  M8: 'docs-security',
  'M-retro-cp': 'edge',
  'M-retro-03': 'admin',
};

export function parseMilestonesYaml(text) {
  const milestones = [];
  const issueOverrides = [];
  let section = null;
  let current = null;

  for (const line of text.split('\n')) {
    if (line.trim() === 'milestones:') {
      section = 'milestones';
      continue;
    }
    if (line.trim() === 'issue_overrides:') {
      section = 'overrides';
      current = null;
      continue;
    }
    if (section === 'milestones') {
      if (line.match(/^\s+- id:/)) {
        if (current) milestones.push(current);
        current = {
          id: line.split(':').slice(1).join(':').trim().replace(/['"]/g, ''),
        };
      } else if (current && line.match(/^\s+title:/)) {
        current.title = line
          .split(':')
          .slice(1)
          .join(':')
          .trim()
          .replace(/^['"]|['"]$/g, '');
      } else if (current && line.match(/^\s+description:/)) {
        current.description = line
          .replace(/^\s+description:\s*>?-?\s*/, '')
          .trim();
      } else if (current && line.match(/^\s+due_on:/)) {
        current.due_on = line
          .split(':')
          .slice(1)
          .join(':')
          .trim()
          .replace(/['"]/g, '');
      } else if (current && line.match(/^\s+state:/)) {
        current.state = line
          .split(':')
          .slice(1)
          .join(':')
          .trim()
          .replace(/['"]/g, '');
      } else if (current && line.match(/^\s+issues:/)) {
        const m = line.match(/\[(.*)\]/);
        current.issues = m
          ? m[1]
              .split(',')
              .map((n) => parseInt(n.trim(), 10))
              .filter(Boolean)
          : [];
      }
    } else if (section === 'overrides') {
      if (line.match(/^\s+- issue:/)) {
        issueOverrides.push({
          issue: parseInt(line.split(':')[1].trim(), 10),
          milestone_id: null,
        });
      } else if (issueOverrides.length && line.match(/^\s+milestone_id:/)) {
        issueOverrides[issueOverrides.length - 1].milestone_id = line
          .split(':')[1]
          .trim()
          .replace(/['"]/g, '');
      }
    }
  }
  if (current) milestones.push(current);
  return { milestones, issueOverrides };
}

export function loadMilestones(configPath = DEFAULT_PATH) {
  const { milestones, issueOverrides } = parseMilestonesYaml(
    fs.readFileSync(configPath, 'utf8')
  );
  return milestones.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description || '',
    dueOn: m.due_on,
    state: m.state || 'open',
    issues: m.issues || [],
    area: MILESTONE_AREA[m.id] || 'infra-ci',
    targetDate: m.due_on,
    status: m.state === 'closed' ? 'done' : 'open',
  }));
}

export function loadIssueOverrides(configPath = DEFAULT_PATH) {
  return parseMilestonesYaml(fs.readFileSync(configPath, 'utf8'))
    .issueOverrides;
}

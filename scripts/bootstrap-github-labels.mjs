/**
 * Creates or updates GitHub labels from .github/labels.yml via gh CLI.
 * Usage: node scripts/bootstrap-github-labels.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

function parseLabelsYaml(text) {
  const labels = [];
  let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('- name:')) {
      if (current) labels.push(current);
      current = { name: line.replace('- name:', '').trim() };
    } else if (current && line.trim().startsWith('color:')) {
      current.color = line.split(':')[1].trim().replace(/['"]/g, '');
    } else if (current && line.trim().startsWith('description:')) {
      current.description = line.replace(/^\s*description:\s*/, '').trim();
    }
  }
  if (current) labels.push(current);
  return labels;
}

function main() {
  const yamlPath = path.join(ROOT, '.github', 'labels.yml');
  const labels = parseLabelsYaml(fs.readFileSync(yamlPath, 'utf8'));

  const gh = spawnSync('gh', ['--version'], { encoding: 'utf8' });
  if (gh.status !== 0) {
    console.error('gh CLI is required. Install: https://cli.github.com/');
    process.exit(1);
  }

  for (const label of labels) {
    const args = [
      'label',
      'create',
      label.name,
      '--color',
      label.color.replace('#', ''),
      '--description',
      label.description || '',
      '--force',
    ];
    if (dryRun) {
      console.log('[dry-run]', 'gh', args.join(' '));
      continue;
    }
    const r = spawnSync('gh', args, { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) {
      console.error(`Failed to create label ${label.name}`);
      process.exit(r.status ?? 1);
    }
  }
  console.log(`${dryRun ? 'Would sync' : 'Synced'} ${labels.length} labels.`);
}

main();

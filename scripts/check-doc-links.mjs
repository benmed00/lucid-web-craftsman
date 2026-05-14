#!/usr/bin/env node
/**
 * Validates intra-repo links and anchors in the rules / business-logic docs.
 *
 * For every relative markdown link `[text](target)` and `[text](target#anchor)`:
 *   - Resolves `target` against the file containing the link.
 *   - Asserts the resolved path exists in the working tree.
 *   - When `#anchor` is present, asserts the anchor exists in the target file
 *     as either an `<a id="anchor">` tag or a heading whose GitHub-style slug
 *     matches the anchor.
 *
 * For fragment-only links (`[text](#anchor)`) the anchor is checked in the same
 * file. External (`http(s)://`, `mailto:`, `tel:`, `javascript:`) schemes are
 * skipped. Fenced and inline code is stripped before scanning so that example
 * snippets cannot create false positives.
 *
 * Usage:
 *   node scripts/check-doc-links.mjs               # default docs
 *   node scripts/check-doc-links.mjs path1.md ...  # custom files
 *
 * Exit codes:
 *   0 — all links resolved
 *   1 — at least one broken link or anchor; report printed on stderr
 *
 * Wired into `pnpm run docs:check-links` and the root CI workflow.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const DEFAULT_TARGETS = [
  'docs/RULES_REGISTRY.md',
  'docs/BUSINESS_LOGIC_AND_EDGE_CASES.md',
];

const EXTERNAL_SCHEMES = /^([a-z][a-z0-9+.-]*:)?\/\//i;
const SKIP_SCHEMES = /^(https?:|mailto:|tel:|javascript:|data:|ftp:)/i;

/**
 * Strip fenced code blocks and inline backtick spans so links inside examples
 * do not get scanned. We deliberately keep the byte length stable (replace with
 * spaces) so line numbers remain accurate when reporting.
 */
function stripCode(input) {
  let out = '';
  let i = 0;
  while (i < input.length) {
    if (input.startsWith('```', i)) {
      const close = input.indexOf('```', i + 3);
      const end = close === -1 ? input.length : close + 3;
      const chunk = input.slice(i, end);
      out += chunk.replace(/[^\n]/g, ' ');
      i = end;
      continue;
    }
    if (input[i] === '`') {
      // inline code span — match as many leading backticks as present
      let ticks = 0;
      while (input[i + ticks] === '`') ticks += 1;
      const fence = '`'.repeat(ticks);
      const close = input.indexOf(fence, i + ticks);
      const end = close === -1 ? i + ticks : close + ticks;
      const chunk = input.slice(i, end);
      out += chunk.replace(/[^\n]/g, ' ');
      i = end;
      continue;
    }
    out += input[i];
    i += 1;
  }
  return out;
}

/**
 * GitHub-flavored heading slug. Mirrors the gjtorikian/html-pipeline rule used
 * by GitHub Markdown rendering: lowercase, strip combining marks, drop any
 * character that is not a word char (alphanumeric/underscore), hyphen, or
 * space, then replace each space with a hyphen. Multiple consecutive hyphens
 * are NOT collapsed (so `a / b` -> `a--b`, matching GitHub).
 */
function slugifyHeading(text) {
  let s = text.toLowerCase();
  s = s.replace(/[\u0300-\u036f]/g, ''); // strip combining marks
  s = s.replace(/[^\w\- ]+/g, '');
  s = s.replace(/ /g, '-');
  return s;
}

function collectAnchors(content) {
  // Anchors are collected from RAW content so heading text retains the inline
  // backticks GitHub feeds to its slug algorithm. Fenced code blocks are
  // skipped to avoid `## example` inside examples being treated as headings.
  const anchors = new Set();
  for (const m of content.matchAll(/<a\s+(?:id|name)\s*=\s*"([^"]+)"/gi)) {
    anchors.add(m[1]);
  }
  let inFence = false;
  for (const line of content.split(/\r?\n/)) {
    if (/^\s{0,3}```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      const slug = slugifyHeading(m[2]);
      if (slug) anchors.add(slug);
    }
  }
  return anchors;
}

function lineOf(content, index) {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i += 1) {
    if (content[i] === '\n') line += 1;
  }
  return line;
}

const LINK_RE = /(!?)\[((?:[^\]\\]|\\.)*)\]\(\s*<?([^()\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;

function collectLinks(filePath, content) {
  const stripped = stripCode(content);
  const links = [];
  for (const m of stripped.matchAll(LINK_RE)) {
    const isImage = m[1] === '!';
    const target = m[3];
    if (!target) continue;
    if (SKIP_SCHEMES.test(target)) continue;
    if (EXTERNAL_SCHEMES.test(target)) continue;
    if (target.startsWith('#')) {
      links.push({
        kind: 'fragment',
        target,
        anchor: target.slice(1),
        line: lineOf(content, m.index ?? 0),
        isImage,
      });
      continue;
    }
    const hashIdx = target.indexOf('#');
    let pathPart = target;
    let anchor = null;
    if (hashIdx !== -1) {
      pathPart = target.slice(0, hashIdx);
      anchor = target.slice(hashIdx + 1);
    }
    if (!pathPart) continue;
    links.push({
      kind: 'path',
      target,
      pathPart,
      anchor,
      line: lineOf(content, m.index ?? 0),
      isImage,
    });
  }
  return links;
}

function readFileIfExists(absPath) {
  try {
    return fs.readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
}

const anchorCache = new Map();
function getAnchorsForFile(absPath) {
  if (anchorCache.has(absPath)) return anchorCache.get(absPath);
  const content = readFileIfExists(absPath);
  const anchors = content ? collectAnchors(content) : null;
  anchorCache.set(absPath, anchors);
  return anchors;
}

function checkFile(relFile) {
  const absFile = path.resolve(REPO_ROOT, relFile);
  const content = readFileIfExists(absFile);
  if (content === null) {
    return [
      {
        file: relFile,
        line: 0,
        target: relFile,
        reason: 'target file is missing',
      },
    ];
  }
  const ownAnchors = collectAnchors(content);
  anchorCache.set(absFile, ownAnchors);
  const links = collectLinks(absFile, content);
  const errors = [];
  const dir = path.dirname(absFile);
  for (const link of links) {
    if (link.kind === 'fragment') {
      if (!ownAnchors.has(link.anchor)) {
        errors.push({
          file: relFile,
          line: link.line,
          target: link.target,
          reason: `fragment anchor "#${link.anchor}" not found in same file`,
        });
      }
      continue;
    }
    const resolved = path.resolve(dir, link.pathPart);
    let stat = null;
    try {
      stat = fs.statSync(resolved);
    } catch {
      stat = null;
    }
    if (!stat) {
      errors.push({
        file: relFile,
        line: link.line,
        target: link.target,
        reason: `path does not exist: ${path.relative(REPO_ROOT, resolved)}`,
      });
      continue;
    }
    if (link.anchor !== null && link.anchor !== '') {
      if (stat.isDirectory()) {
        errors.push({
          file: relFile,
          line: link.line,
          target: link.target,
          reason: 'cannot resolve anchor on a directory target',
        });
        continue;
      }
      const targetAnchors = getAnchorsForFile(resolved);
      if (!targetAnchors) {
        errors.push({
          file: relFile,
          line: link.line,
          target: link.target,
          reason: `cannot read target for anchor lookup: ${path.relative(REPO_ROOT, resolved)}`,
        });
        continue;
      }
      if (!targetAnchors.has(link.anchor)) {
        errors.push({
          file: relFile,
          line: link.line,
          target: link.target,
          reason: `anchor "#${link.anchor}" not found in ${path.relative(REPO_ROOT, resolved)}`,
        });
      }
    }
  }
  return errors;
}

function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args : DEFAULT_TARGETS;
  let totalLinks = 0;
  const allErrors = [];
  for (const t of targets) {
    const absFile = path.resolve(REPO_ROOT, t);
    const content = readFileIfExists(absFile);
    if (content === null) {
      allErrors.push({
        file: t,
        line: 0,
        target: t,
        reason: 'doc file is missing',
      });
      continue;
    }
    totalLinks += collectLinks(absFile, content).length;
    allErrors.push(...checkFile(t));
  }
  if (allErrors.length === 0) {
    const count = targets.length;
    const word = count === 1 ? 'file' : 'files';
    process.stdout.write(
      `docs:check-links ok — ${totalLinks} link(s) across ${count} ${word}\n`
    );
    process.exit(0);
  }
  process.stderr.write(
    `docs:check-links found ${allErrors.length} issue(s):\n`
  );
  for (const e of allErrors) {
    process.stderr.write(
      `  ${e.file}:${e.line}  [${e.target}]  ${e.reason}\n`
    );
  }
  process.exit(1);
}

main();

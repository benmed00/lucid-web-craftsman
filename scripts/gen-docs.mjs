#!/usr/bin/env node
/**
 * Generates the auto-managed blocks in docs/BUSINESS_LOGIC_AND_EDGE_CASES.md
 * from their TypeScript sources of truth. Three blocks are managed:
 *
 *   <!-- BEGIN auto:business-rules-defaults -->
 *     <- from src/hooks/useBusinessRules.ts (`DEFAULT_BUSINESS_RULES`)
 *   <!-- BEGIN auto:create-payment-constants -->
 *     <- from supabase/functions/create-payment/constants.ts
 *   <!-- BEGIN auto:checkout-validation-constraints -->
 *     <- from src/utils/checkoutValidation.ts (regex constants + min/max)
 *
 * Usage:
 *   pnpm run docs:gen           # rewrites the managed blocks in place
 *   pnpm run docs:gen:check     # exits non-zero if any block would change
 *
 * Implementation note: we parse the source TS via the TypeScript compiler API
 * so the values cannot drift from the running code. Only literals + small
 * arithmetic (`5 * 60 * 1000`) are supported on the value side; this matches
 * what the targeted constants actually use today.
 *
 * After regenerating blocks, the markdown file is run through Prettier (same
 * as `pnpm run format`) so `docs:gen:check` stays aligned with `format:check`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import prettier from 'prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const TARGET_DOC = path.join(
  REPO_ROOT,
  'docs',
  'BUSINESS_LOGIC_AND_EDGE_CASES.md'
);

function readSource(relPath) {
  const abs = path.join(REPO_ROOT, relPath);
  const text = fs.readFileSync(abs, 'utf8');
  return {
    abs,
    rel: relPath,
    text,
    sf: ts.createSourceFile(abs, text, ts.ScriptTarget.ES2020, true),
  };
}

/**
 * Reduce a small expression to a primitive JS value.
 * Supports: numeric, string, true/false/null, prefix `-`, multiplicative
 * arithmetic, and object/array literals composed of the above.
 */
function reduceLiteral(node) {
  if (!node) return undefined;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(node)) {
    const operand = reduceLiteral(node.operand);
    if (node.operator === ts.SyntaxKind.MinusToken) return -Number(operand);
    if (node.operator === ts.SyntaxKind.PlusToken) return Number(operand);
    return undefined;
  }
  if (ts.isBinaryExpression(node)) {
    const left = Number(reduceLiteral(node.left));
    const right = Number(reduceLiteral(node.right));
    if (Number.isNaN(left) || Number.isNaN(right)) return undefined;
    switch (node.operatorToken.kind) {
      case ts.SyntaxKind.AsteriskToken:
        return left * right;
      case ts.SyntaxKind.SlashToken:
        return left / right;
      case ts.SyntaxKind.PlusToken:
        return left + right;
      case ts.SyntaxKind.MinusToken:
        return left - right;
      default:
        return undefined;
    }
  }
  if (ts.isParenthesizedExpression(node)) return reduceLiteral(node.expression);
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
    return reduceLiteral(node.expression);
  }
  if (ts.isObjectLiteralExpression(node)) {
    const out = {};
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key = ts.isIdentifier(prop.name)
        ? prop.name.text
        : ts.isStringLiteral(prop.name)
          ? prop.name.text
          : undefined;
      if (!key) continue;
      out[key] = reduceLiteral(prop.initializer);
    }
    return out;
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((e) => reduceLiteral(e));
  }
  return undefined;
}

/** Find `export const NAME = …` and return the initializer expression node. */
function findExportedConst(sf, name) {
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    const isExport = stmt.modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword
    );
    if (!isExport) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (
        ts.isIdentifier(decl.name) &&
        decl.name.text === name &&
        decl.initializer
      ) {
        return decl.initializer;
      }
    }
  }
  return undefined;
}

/** Find a local (non-exported) `const NAME = …` declaration. */
function findLocalConst(sf, name) {
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (
        ts.isIdentifier(decl.name) &&
        decl.name.text === name &&
        decl.initializer
      ) {
        return decl.initializer;
      }
    }
  }
  return undefined;
}

// =============================================================================
// Block 1 — BusinessRules defaults
// =============================================================================

function generateBusinessRulesDefaults() {
  const { rel, sf } = readSource('src/hooks/useBusinessRules.ts');
  const expr = findExportedConst(sf, 'DEFAULT_BUSINESS_RULES');
  if (!expr) throw new Error(`DEFAULT_BUSINESS_RULES not found in ${rel}`);
  const value = reduceLiteral(expr);
  if (!value || typeof value !== 'object') {
    throw new Error(`Could not reduce DEFAULT_BUSINESS_RULES literal`);
  }
  const json = JSON.stringify(value, null, 2);
  const lines = [
    '',
    `Generated from [\`${rel}\`](../${rel}) — do not edit between the markers. Run \`pnpm run docs:gen\` to refresh.`,
    '',
    '```json',
    json,
    '```',
    '',
  ];
  return lines.join('\n');
}

// =============================================================================
// Block 2 — create-payment constants
// =============================================================================

const CREATE_PAYMENT_CONSTANTS = [
  'CHECKOUT_VALIDATION_ERROR_PREFIX',
  'MAX_CART_ITEMS',
  'STRIPE_MINIMUM_CENTS',
  'SHIPPING_COST_CENTS',
  'RATE_LIMIT_WINDOW_MS',
  'MAX_PAYMENT_ATTEMPTS',
];

function formatConstantValue(value) {
  if (typeof value === 'string') return `\`'${value.replace(/'/g, "\\'")}'\``;
  if (typeof value === 'number') return `\`${value}\``;
  return `\`${String(value)}\``;
}

function generateCreatePaymentConstants() {
  const { rel, sf } = readSource(
    'supabase/functions/create-payment/constants.ts'
  );
  const rows = [];
  for (const name of CREATE_PAYMENT_CONSTANTS) {
    const expr = findExportedConst(sf, name);
    if (!expr) {
      throw new Error(`${name} not found in ${rel}`);
    }
    const value = reduceLiteral(expr);
    if (value === undefined) {
      throw new Error(`Could not reduce ${name} in ${rel}`);
    }
    rows.push(`| \`${name}\` | ${formatConstantValue(value)} |`);
  }
  const lines = [
    '',
    `Generated from [\`${rel}\`](../${rel}) — do not edit between the markers. Run \`pnpm run docs:gen\` to refresh.`,
    '',
    '| Constant | Value |',
    '| --- | --- |',
    ...rows,
    '',
  ];
  return lines.join('\n');
}

// =============================================================================
// Block 3 — checkoutValidation field constraints
// =============================================================================

/**
 * Pull `min(N, ...)` / `max(N, ...)` calls from a Zod-style chain so we can
 * surface the raw numeric bounds of each field schema. Returns `{ min, max }`
 * where each is the first numeric arg encountered (further chained constraints
 * are rarer in this codebase and noted in the prose table).
 */
function readZodBoundsFromInitializer(initializer) {
  let min;
  let max;
  let node = initializer;
  while (
    node &&
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression)
  ) {
    const method = node.expression.name.text;
    const firstArg = node.arguments[0];
    if (method === 'min' && firstArg && ts.isNumericLiteral(firstArg)) {
      min ??= Number(firstArg.text);
    } else if (method === 'max' && firstArg && ts.isNumericLiteral(firstArg)) {
      max ??= Number(firstArg.text);
    }
    node = node.expression.expression;
  }
  return { min, max };
}

function regexSourceOf(node) {
  if (node && ts.isRegularExpressionLiteral(node)) return node.text;
  return undefined;
}

function generateCheckoutValidationConstraints() {
  const { rel, sf } = readSource('src/utils/checkoutValidation.ts');
  const NAME_REGEX = regexSourceOf(findLocalConst(sf, 'NAME_REGEX'));
  const PHONE_REGEX = regexSourceOf(findLocalConst(sf, 'PHONE_REGEX'));
  const postalCodeNode = findLocalConst(sf, 'POSTAL_CODE_REGEX');
  const postalCodeMap = {};
  if (postalCodeNode && ts.isObjectLiteralExpression(postalCodeNode)) {
    for (const prop of postalCodeNode.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key = ts.isIdentifier(prop.name)
        ? prop.name.text
        : ts.isStringLiteral(prop.name)
          ? prop.name.text
          : undefined;
      if (!key) continue;
      const src = regexSourceOf(prop.initializer);
      if (src) postalCodeMap[key] = src;
    }
  }
  const targetSchemas = [
    'nameSchema',
    'emailSchema',
    'phoneSchema',
    'addressSchema',
    'addressComplementSchema',
    'citySchema',
  ];
  const bounds = {};
  for (const s of targetSchemas) {
    const init = findLocalConst(sf, s);
    if (!init) continue;
    bounds[s] = readZodBoundsFromInitializer(init);
  }
  const fieldRows = [
    `| firstName / lastName | ${bounds.nameSchema?.min ?? '—'} | ${bounds.nameSchema?.max ?? '—'} | \`${NAME_REGEX ?? '—'}\` |`,
    `| email | ${bounds.emailSchema?.min ?? '—'} | ${bounds.emailSchema?.max ?? '—'} | RFC + reject \`..\` |`,
    `| phone (optional) | — | ${bounds.phoneSchema?.max ?? 20} | \`${PHONE_REGEX ?? '—'}\` |`,
    `| address | ${bounds.addressSchema?.min ?? '—'} | ${bounds.addressSchema?.max ?? '—'} | — |`,
    `| addressComplement (optional) | — | ${bounds.addressComplementSchema?.max ?? '—'} | — |`,
    `| city | ${bounds.citySchema?.min ?? '—'} | ${bounds.citySchema?.max ?? '—'} | letters + accents + \` -'.\` |`,
  ];
  const postalRows = Object.entries(postalCodeMap).map(
    ([country, regex]) => `| ${country} | \`${regex}\` |`
  );
  const lines = [
    '',
    `Generated from [\`${rel}\`](../${rel}) — do not edit between the markers. Run \`pnpm run docs:gen\` to refresh.`,
    '',
    '| Field | Min | Max | Pattern |',
    '| --- | --- | --- | --- |',
    ...fieldRows,
    '',
    'Postal-code regex per country (`POSTAL_CODE_REGEX`):',
    '',
    '| Country | Regex |',
    '| --- | --- |',
    ...postalRows,
    '',
  ];
  return lines.join('\n');
}

// =============================================================================
// Orchestration
// =============================================================================

const BLOCKS = [
  { name: 'business-rules-defaults', generate: generateBusinessRulesDefaults },
  {
    name: 'create-payment-constants',
    generate: generateCreatePaymentConstants,
  },
  {
    name: 'checkout-validation-constraints',
    generate: generateCheckoutValidationConstraints,
  },
];

async function formatMarkdown(doc) {
  return prettier.format(doc, { filepath: TARGET_DOC });
}

function replaceBlock(doc, name, body) {
  const begin = `<!-- BEGIN auto:${name} -->`;
  const end = `<!-- END auto:${name} -->`;
  const startIdx = doc.indexOf(begin);
  const endIdx = doc.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(
      `Markers for "${name}" not found in target doc. Add a pair of:\n  ${begin}\n  ${end}`
    );
  }
  const before = doc.slice(0, startIdx + begin.length);
  const after = doc.slice(endIdx);
  return `${before}${body}${after}`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const mode = args.has('--check') ? 'check' : 'write';
  let doc = fs.readFileSync(TARGET_DOC, 'utf8');
  const original = doc;
  for (const block of BLOCKS) {
    const body = block.generate();
    doc = replaceBlock(doc, block.name, body);
  }
  const formattedDoc = await formatMarkdown(doc);
  const formattedOriginal = await formatMarkdown(original);

  if (mode === 'check') {
    if (formattedDoc !== formattedOriginal) {
      process.stderr.write(
        'docs:gen drift detected. Run `pnpm run docs:gen` to update the auto-managed blocks.\n'
      );
      process.exit(1);
    }
    process.stdout.write(
      `docs:gen ok — ${BLOCKS.length} block(s) already in sync\n`
    );
    return;
  }

  if (formattedDoc !== formattedOriginal) {
    fs.writeFileSync(TARGET_DOC, formattedDoc, 'utf8');
    process.stdout.write(`docs:gen wrote ${BLOCKS.length} block(s)\n`);
  } else {
    process.stdout.write(
      `docs:gen ok — ${BLOCKS.length} block(s) already in sync\n`
    );
  }
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});

/**
 * Generates OpenAPI 3.0 from Supabase Edge Function folders.
 * Reads optional openapi.fragment.json per function for request/response detail.
 *
 * Usage: node scripts/openapi-edge-functions.mjs
 */

import { spawnSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FUNCTIONS_DIR = path.join(ROOT, 'supabase', 'functions');
const OUT_JSON = path.join(ROOT, 'openapi', 'supabase-edge-functions.json');

const SKIP_DIRS = new Set(['_shared', 'node_modules', '.git']);

/** @param {string} p */
function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

/** @param {string} dir */
function listFunctionNames() {
  const names = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true });
  const out = [];
  for (const d of names) {
    if (!d.isDirectory() || SKIP_DIRS.has(d.name)) continue;
    const indexTs = path.join(FUNCTIONS_DIR, d.name, 'index.ts');
    if (fs.existsSync(indexTs)) out.push(d.name);
  }
  return out.sort();
}

/**
 * @param {string} name
 * @param {string} src
 */
function inferFromSource(name, src) {
  const lower = src.toLowerCase();
  const headers = [];

  if (lower.includes('authorization') || lower.includes('bearer'))
    headers.push({
      name: 'Authorization',
      in: 'header',
      required: false,
      schema: { type: 'string' },
      description: 'Bearer JWT or anon key (Supabase client).',
    });
  headers.push({
    name: 'apikey',
    in: 'header',
    required: false,
    schema: { type: 'string' },
    description:
      'Supabase anon (or service) key; required for functions.invoke.',
  });

  if (
    lower.includes('verifycsrftoken') ||
    lower.includes("headers.get('x-csrf-token')") ||
    lower.includes('headers.get("x-csrf-token")')
  )
    headers.push(
      {
        name: 'x-csrf-token',
        in: 'header',
        required: true,
        schema: { type: 'string' },
      },
      {
        name: 'x-csrf-nonce',
        in: 'header',
        required: true,
        schema: { type: 'string' },
      },
      {
        name: 'x-csrf-hash',
        in: 'header',
        required: true,
        schema: { type: 'string' },
      }
    );

  if (lower.includes('x-guest-id'))
    headers.push({
      name: 'x-guest-id',
      in: 'header',
      required: false,
      schema: { type: 'string' },
      description: 'Guest session id for order ownership checks.',
    });

  if (lower.includes('stripe-signature'))
    headers.push({
      name: 'Stripe-Signature',
      in: 'header',
      required: true,
      schema: { type: 'string' },
      description: 'Stripe webhook signature.',
    });

  let method = 'post';
  if (
    /\breq\.method\s*===\s*['"]GET['"]/.test(src) &&
    !/await\s+req\.json\(\)/.test(src)
  )
    method = 'get';
  if (name === 'generate-sitemap') method = 'get';

  return { headers, method };
}

/** @param {string} fnDir */
function loadFragment(fnDir) {
  const fragPath = path.join(fnDir, 'openapi.fragment.json');
  if (!fs.existsSync(fragPath)) return null;
  try {
    return JSON.parse(readText(fragPath));
  } catch (e) {
    console.error('Invalid JSON:', fragPath, e);
    process.exit(1);
  }
}

function defaultResponses() {
  return {
    200: {
      description: 'OK',
      content: {
        'application/json': {
          schema: { type: 'object', additionalProperties: true },
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: { type: 'object', additionalProperties: true },
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: { type: 'object', additionalProperties: true },
        },
      },
    },
    429: {
      description: 'Too many requests',
      content: {
        'application/json': {
          schema: { type: 'object', additionalProperties: true },
        },
      },
    },
    500: {
      description: 'Server error',
      content: {
        'application/json': {
          schema: { type: 'object', additionalProperties: true },
        },
      },
    },
  };
}

/** @param {Record<string, unknown>} base @param {Record<string, unknown>|null} frag */
function mergeOperation(base, frag) {
  if (!frag) return base;
  const out = { ...base, ...frag };
  if (frag.parameters && base.parameters) {
    const seen = new Set(base.parameters.map((p) => `${p.in}:${p.name}`));
    const extra = frag.parameters.filter((p) => !seen.has(`${p.in}:${p.name}`));
    out.parameters = [...base.parameters, ...extra];
  }
  if (frag.responses && base.responses)
    out.responses = { ...base.responses, ...frag.responses };
  return out;
}

function main() {
  const names = listFunctionNames();
  const paths = {};

  for (const name of names) {
    const fnDir = path.join(FUNCTIONS_DIR, name);
    const src = readText(path.join(fnDir, 'index.ts'));
    const { headers, method } = inferFromSource(name, src);
    const fragment = loadFragment(fnDir);

    const methodUpper = method.toUpperCase();
    const baseOp = {
      tags: [name],
      summary: `Supabase Edge Function: ${name}`,
      description: `Invoked as ${methodUpper} https://<project>.supabase.co/functions/v1/${name} (unless overridden). See supabase/functions/${name}/index.ts.`,
      parameters: headers,
      responses: defaultResponses(),
    };

    if (method === 'get') {
      baseOp.description += ' Uses GET; body usually empty.';
    } else if (!fragment?.requestBody) {
      baseOp.requestBody = {
        required: false,
        content: {
          'application/json': {
            schema: { type: 'object', additionalProperties: true },
            description:
              'JSON body per function implementation; add openapi.fragment.json for detail.',
          },
        },
      };
    }
    if (method === 'get' && !fragment?.requestBody) delete baseOp.requestBody;

    const op = mergeOperation(baseOp, fragment);
    const pathKey = `/functions/v1/${name}`;
    if (!paths[pathKey]) paths[pathKey] = {};
    paths[pathKey][method] = op;
  }

  const doc = {
    openapi: '3.0.3',
    info: {
      title: 'Lucid Web Craftsman — Supabase Edge Functions',
      version: '1.0.0',
      description:
        'GENERATED by scripts/openapi-edge-functions.mjs. Do not hand-edit; run pnpm run openapi:edge-functions. Optional per-function detail: supabase/functions/<name>/openapi.fragment.json',
    },
    servers: [
      {
        url: 'https://{project_ref}.supabase.co',
        variables: {
          project_ref: {
            default: 'YOUR_PROJECT_REF',
            description: 'Supabase project reference',
          },
        },
      },
    ],
    tags: names.map((n) => ({
      name: n,
      description: `Edge function \`${n}\``,
    })),
    paths,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  const fmt = spawnSync('npx', ['prettier', '--write', OUT_JSON], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  if (fmt.status !== 0) {
    console.error('prettier --write failed on OpenAPI output');
    process.exit(fmt.status ?? 1);
  }
  console.log(
    `Wrote ${path.relative(ROOT, OUT_JSON)} (${names.length} functions)`
  );
}

main();

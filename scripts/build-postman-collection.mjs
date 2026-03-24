/**
 * Generates postman/Lucid-Web-Craftsman.postman_collection.json
 * Run: node scripts/build-postman-collection.mjs
 */

import { spawnSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(
  ROOT,
  'postman',
  'Lucid-Web-Craftsman.postman_collection.json'
);

/** @param {string[]} lines */
function testScript(lines) {
  return [{ listen: 'test', script: { exec: lines, type: 'text/javascript' } }];
}

function mockItem(name, method, rawUrl, opts = {}) {
  const { body, desc, tests, examples } = opts;
  const item = {
    name,
    request: {
      method,
      header: [
        {
          key: 'X-Request-Id',
          value: '{{$guid}}',
          type: 'text',
          disabled: true,
        },
      ],
      url: rawUrl,
      description: desc || '',
    },
  };
  if (body !== undefined) {
    item.request.body = {
      mode: 'raw',
      raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }
  if (tests?.length) item.event = testScript(tests);
  if (examples?.length) item.response = examples;
  return item;
}

function supabaseItem(name, fn, opts = {}) {
  const {
    body,
    desc,
    tests,
    extraHeaders = [],
    examples,
    method = 'POST',
  } = opts;
  const headers = [
    {
      key: 'Authorization',
      value: 'Bearer {{supabase_anon_key}}',
      type: 'text',
    },
    { key: 'apikey', value: '{{supabase_anon_key}}', type: 'text' },
    ...extraHeaders,
  ];
  if (method !== 'GET')
    headers.push({
      key: 'Content-Type',
      value: 'application/json',
      type: 'text',
    });
  const item = {
    name,
    request: {
      method,
      header: headers,
      url: `{{supabase_url}}/functions/v1/${fn}`,
      description: desc || '',
    },
  };
  if (body !== undefined && method !== 'GET') {
    item.request.body = {
      mode: 'raw',
      raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }
  if (tests?.length) item.event = testScript(tests);
  if (examples?.length) item.response = examples;
  return item;
}

const exJson = (name, code, bodyObj) => ({
  name,
  originalRequest: { method: 'GET', header: [], url: '' },
  status: 'OK',
  code,
  _postman_previewlanguage: 'json',
  header: [{ key: 'Content-Type', value: 'application/json' }],
  body: JSON.stringify(bodyObj, null, 2),
});

function main() {
  const B = '{{mock_api_base}}';

  const mockApi = {
    name: 'Mock API (local)',
    description:
      'Run `npm run start:api` (port 3001). See [backend/server.cjs](backend/server.cjs). Use saved examples for Postman Mock Server.',
    item: [
      mockItem('Root', 'GET', `${B}/`, {
        desc: 'Service banner and endpoint list.',
        tests: [
          'pm.test("200", () => pm.response.to.have.status(200));',
          'const j = pm.response.json();',
          'pm.test("has version", () => pm.expect(j).to.have.property("version"));',
        ],
        examples: [
          exJson('Running', 200, {
            name: 'Mock API Server',
            version: '1.0.0',
            status: 'running',
          }),
        ],
      }),
      mockItem('Health', 'GET', `${B}/health`, {
        tests: [
          'pm.test("200", () => pm.response.to.have.status(200));',
          'pm.test("status ok", () => pm.expect(pm.response.json().status).to.eql("ok"));',
        ],
        examples: [
          exJson('OK', 200, {
            status: 'ok',
            timestamp: '2025-01-01T12:00:00.000Z',
            uptime: 1,
            env: 'development',
          }),
        ],
      }),
      mockItem('Health live', 'GET', `${B}/health/live`, {
        tests: ['pm.test("200", () => pm.response.to.have.status(200));'],
        examples: [exJson('Alive', 200, { status: 'alive' })],
      }),
      mockItem('Health ready', 'GET', `${B}/health/ready`, {
        tests: [
          'pm.test("2xx", () => pm.expect(pm.response.code).to.be.oneOf([200, 503]));',
        ],
      }),
      mockItem('API info', 'GET', `${B}/api/info`, {
        tests: ['pm.test("200", () => pm.response.to.have.status(200));'],
      }),
      mockItem('API metrics', 'GET', `${B}/api/metrics`, {
        tests: ['pm.test("200", () => pm.response.to.have.status(200));'],
      }),
      mockItem('Get cart', 'GET', `${B}/api/cart`, {
        tests: [
          'pm.test("200", () => pm.response.to.have.status(200));',
          'pm.test("items array", () => pm.expect(pm.response.json().items).to.be.an("array"));',
        ],
        examples: [exJson('Empty cart', 200, { items: [] })],
      }),
      mockItem('Set cart', 'POST', `${B}/api/cart`, {
        body: { items: [{ product: { id: 1 }, quantity: 1 }] },
        tests: ['pm.test("200", () => pm.response.to.have.status(200));'],
      }),
      mockItem('List orders', 'GET', `${B}/api/orders?_page=1&_limit=10`, {
        tests: [
          'pm.test("200", () => pm.response.to.have.status(200));',
          'const p = pm.response.json();',
          'pm.test("pagination", () => { pm.expect(p).to.have.keys(["items","page","limit","total","totalPages"]); });',
        ],
        examples: [
          exJson('Page 1', 200, {
            items: [],
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          }),
        ],
      }),
      mockItem('Create order', 'POST', `${B}/api/orders`, {
        body: {
          items: [{ productId: 1, name: 'Test', quantity: 1, price: 10 }],
          customerEmail: 'test@example.com',
        },
        tests: [
          'pm.test("201", () => pm.response.to.have.status(201));',
          'pm.test("id", () => pm.expect(pm.response.json().id).to.exist);',
          'pm.collectionVariables.set("last_mock_order_id", pm.response.json().id);',
        ],
      }),
      mockItem('Create order validation error', 'POST', `${B}/api/orders`, {
        body: { customerEmail: 'x@y.z' },
        tests: [
          'pm.test("400", () => pm.response.to.have.status(400));',
          'pm.test("code", () => pm.expect(pm.response.json().code).to.eql("VALIDATION_ERROR"));',
        ],
      }),
      mockItem('Newsletter subscribe', 'POST', `${B}/api/newsletter`, {
        body: { email: 'hello@example.com' },
        tests: ['pm.test("201", () => pm.response.to.have.status(201));'],
        examples: [
          exJson('Created', 201, {
            message: 'Subscribed successfully',
            id: 'sub_abc',
          }),
        ],
      }),
      mockItem('Newsletter invalid', 'POST', `${B}/api/newsletter`, {
        body: { email: 'not-an-email' },
        tests: ['pm.test("400", () => pm.response.to.have.status(400));'],
      }),
      mockItem('Contact submit', 'POST', `${B}/api/contact`, {
        body: {
          name: 'Test User',
          email: 'a@b.co',
          subject: 'Hi',
          message: 'Hello from Postman',
        },
        tests: ['pm.test("201", () => pm.response.to.have.status(201));'],
        examples: [
          exJson('Created', 201, {
            message: 'Message sent successfully',
            id: 'msg_1',
          }),
        ],
      }),
      mockItem('List products', 'GET', `${B}/api/products?_page=1&_limit=5`, {
        tests: [
          'pm.test("200", () => pm.response.to.have.status(200));',
          'const p = pm.response.json();',
          'pm.test("pagination", () => pm.expect(p.items).to.be.an("array"));',
        ],
      }),
      mockItem('Product by id', 'GET', `${B}/api/products/1`, {
        tests: [
          'pm.test("200", () => pm.response.to.have.status(200));',
          'pm.test("id", () => pm.expect(pm.response.json().id).to.eql(1));',
        ],
      }),
      mockItem('Product 404', 'GET', `${B}/api/products/99999`, {
        tests: ['pm.test("404", () => pm.response.to.have.status(404));'],
      }),
      mockItem('List posts', 'GET', `${B}/api/posts?_page=1&_limit=5`, {
        tests: ['pm.test("200", () => pm.response.to.have.status(200));'],
      }),
      mockItem('Post by id', 'GET', `${B}/api/posts/1`, {
        tests: ['pm.test("200", () => pm.response.to.have.status(200));'],
      }),
    ],
  };

  const adminFns = [
    'check-promo-alerts',
    'create-admin-user',
    'process-scheduled-emails',
    'security-alert-notification',
    'send-abandoned-cart-email',
    'send-cancellation-email',
    'send-delivery-confirmation',
    'send-newsletter-welcome',
    'send-order-confirmation',
    'send-order-notification-improved',
    'send-shipping-notification',
    'send-vip-order-notification',
    'translate-tag',
  ];

  const storefront = {
    name: 'Storefront & checkout',
    item: [
      supabaseItem('order-lookup', 'order-lookup', {
        body: { session_id: '{{stripe_session_id}}' },
        desc: 'READ order by Stripe session id. Optional header `x-guest-id` for guests.',
        extraHeaders: [
          {
            key: 'x-guest-id',
            value: '{{guest_id}}',
            type: 'text',
            disabled: true,
          },
        ],
        tests: [
          'pm.test("200", () => pm.response.to.have.status(200));',
          'pm.test("JSON", () => pm.response.to.be.json);',
          'pm.expect(pm.response.json()).to.have.property("found");',
        ],
      }),
      supabaseItem('verify-payment', 'verify-payment', {
        body: { session_id: '{{stripe_session_id}}' },
        desc: 'READ Stripe session + order state after redirect.',
        extraHeaders: [
          {
            key: 'x-guest-id',
            value: '{{guest_id}}',
            type: 'text',
            disabled: true,
          },
        ],
        tests: [
          'pm.test("2xx", () => pm.expect(pm.response.code).to.be.within(200, 299));',
        ],
      }),
      supabaseItem('stripe-session-display', 'stripe-session-display', {
        body: { session_id: '{{stripe_session_id}}' },
        desc: 'Stripe session snapshot (no DB).',
        tests: ['pm.test("200", () => pm.response.to.have.status(200));'],
      }),
      supabaseItem('order-confirmation-lookup', 'order-confirmation-lookup', {
        body: { token: '{{order_confirmation_token}}' },
        desc: 'Signed token from confirmation email.',
        tests: [
          'pm.test("2xx", () => pm.expect(pm.response.code).to.be.within(200, 299));',
        ],
      }),
      supabaseItem('submit-contact (edge)', 'submit-contact', {
        body: {
          firstName: 'Post',
          lastName: 'Man',
          email: 'pm@example.com',
          phone: '',
          company: '',
          subject: 'API test',
          message: 'Hello',
        },
        desc: 'Production contact function (not mock API).',
        tests: [
          'pm.test("2xx or 429", () => pm.expect([200,429]).to.include(pm.response.code));',
        ],
      }),
      supabaseItem('create-payment', 'create-payment', {
        body: {
          items: [{ product: { id: 1 }, quantity: 1 }],
          customerInfo: {
            email: 'test@example.com',
            firstName: 'T',
            lastName: 'E',
          },
          discount: null,
          guestSession: { guest_id: '{{guest_id}}' },
        },
        desc: 'Requires valid `x-csrf-token`, `x-csrf-nonce`, `x-csrf-hash` from the storefront. Expect 403 without them.',
        extraHeaders: [
          { key: 'x-csrf-token', value: '{{csrf_token}}', type: 'text' },
          { key: 'x-csrf-nonce', value: '{{csrf_nonce}}', type: 'text' },
          { key: 'x-csrf-hash', value: '{{csrf_hash}}', type: 'text' },
          {
            key: 'x-checkout-session-id',
            value: '{{checkout_session_id}}',
            type: 'text',
            disabled: true,
          },
        ],
        tests: [
          'pm.test("responds", () => pm.expect(pm.response.code).to.be.at.least(200));',
          '// 403 without valid CSRF; 422 on bad body; 200 only with full valid flow',
        ],
      }),
      supabaseItem('create-paypal-payment', 'create-paypal-payment', {
        body: {
          items: [{ product: { id: 1 }, quantity: 1 }],
          customerInfo: { email: 'test@example.com' },
          discount: {},
        },
        desc: 'PayPal order creation; server validates cart.',
        tests: [
          'pm.test("has response", () => pm.expect(pm.response.code).to.be.at.least(200));',
        ],
      }),
      supabaseItem('verify-paypal-payment', 'verify-paypal-payment', {
        body: {
          paypal_order_id: '{{paypal_order_id}}',
          order_id: '{{order_id}}',
        },
        desc: 'Requires user JWT or internal auth per function.',
        tests: [
          'pm.test("401 or 200", () => pm.expect([200,401]).to.include(pm.response.code));',
        ],
      }),
    ],
  };

  const webhooks = {
    name: 'Webhooks',
    item: [
      {
        name: 'stripe-webhook',
        request: {
          method: 'POST',
          header: [
            {
              key: 'Stripe-Signature',
              value: '{{stripe_signature}}',
              type: 'text',
            },
            { key: 'Content-Type', value: 'application/json', type: 'text' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                id: 'evt_test',
                type: 'checkout.session.completed',
                data: { object: {} },
              },
              null,
              2
            ),
            options: { raw: { language: 'json' } },
          },
          url: '{{supabase_url}}/functions/v1/stripe-webhook',
          description:
            'Stripe signs the raw body; use Stripe CLI or saved mock examples.',
        },
        event: testScript([
          'pm.test("responds", () => pm.expect(pm.response.code).to.be.at.least(200));',
        ]),
        response: [
          {
            name: 'Mock invalid signature',
            originalRequest: { method: 'POST', header: [], url: '' },
            status: 'Bad Request',
            code: 400,
            _postman_previewlanguage: 'json',
            header: [],
            body: '{"error":"Invalid signature"}',
          },
        ],
      },
      supabaseItem('carrier-webhook', 'carrier-webhook', {
        body: {},
        desc: 'Carrier callback; see function for auth and payload.',
        tests: [
          'pm.test("responds", () => pm.expect(pm.response.code).to.be.at.least(200));',
        ],
      }),
    ],
  };

  const admin = {
    name: 'Admin & scheduled (invoke)',
    description:
      'Most calls need **service role** or **admin JWT** and specific JSON bodies. Fill from admin UI network tab or function source. Default body `{}`.',
    item: [
      supabaseItem('generate-sitemap', 'generate-sitemap', {
        method: 'GET',
        desc: 'Returns sitemap XML; uses GET in OpenAPI generator.',
        tests: [
          'pm.test("2xx", () => pm.expect(pm.response.code).to.be.within(200, 299));',
        ],
      }),
      ...adminFns.map((fn) =>
        supabaseItem(fn, fn, {
          body: {},
          tests: [
            `// ${fn}: adjust Authorization (user JWT vs service role) and body`,
            'pm.test("not network error", () => pm.expect(pm.response.code).to.exist);',
          ],
        })
      ),
    ],
  };

  const supabase = {
    name: 'Supabase Edge Functions',
    description:
      'Set `supabase_url` and `supabase_anon_key`. Use `access_token` (user JWT) where noted. Never commit secrets — use `.local` environment file.',
    item: [storefront, webhooks, admin],
  };

  const collection = {
    info: {
      name: 'Lucid Web Craftsman',
      description:
        'Mock API (dev) + Supabase Edge Functions.\n\n- **OpenAPI:** `openapi/supabase-edge-functions.json` (run `npm run openapi:edge-functions`).\n- **Secrets:** use `postman/Lucid-Web-Craftsman.local.postman_environment.json` (gitignored); copy from `.example`.\n- **Mocks:** enable saved examples on Mock API folder → Create Mock Server in Postman.',
      schema:
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'mock_api_base', value: 'http://localhost:3001' },
      { key: 'vite_base', value: 'http://localhost:8080' },
      { key: 'supabase_url', value: 'https://YOUR_PROJECT.supabase.co' },
      { key: 'supabase_anon_key', value: '' },
      { key: 'access_token', value: '' },
      { key: 'guest_id', value: '' },
      { key: 'stripe_session_id', value: 'cs_test_replace_me' },
      { key: 'order_confirmation_token', value: '' },
      { key: 'csrf_token', value: '' },
      { key: 'csrf_nonce', value: '' },
      { key: 'csrf_hash', value: '' },
      { key: 'checkout_session_id', value: '' },
      { key: 'paypal_order_id', value: '' },
      { key: 'order_id', value: '' },
      { key: 'stripe_signature', value: '' },
    ],
    item: [mockApi, supabase],
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(collection, null, 2) + '\n', 'utf8');
  const fmt = spawnSync('npx', ['prettier', '--write', OUT], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  if (fmt.status !== 0) {
    console.error('prettier --write failed on Postman collection');
    process.exit(fmt.status ?? 1);
  }
  console.log('Wrote', path.relative(ROOT, OUT));
}

main();

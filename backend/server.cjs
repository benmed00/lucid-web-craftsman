/**
 * Enterprise Mock API Server
 * Single-file server with security, observability, and full resource coverage.
 * Compatible with json-server + Express for dev/staging mock APIs.
 */

const jsonServer = require('json-server');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

let helmet, rateLimit;
try {
  helmet = require('helmet');
} catch {
  helmet = () => (_req, _res, next) => next();
}
try {
  rateLimit = require('express-rate-limit');
} catch {
  rateLimit = () => (_req, _res, next) => next();
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  port: parseInt(process.env.PORT || '3001', 10),
  env: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGINS || '*')
    .split(',')
    .map((o) => o.trim()),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  bodyLimit: process.env.BODY_LIMIT || '512kb',
  dbPath: process.env.DB_PATH || path.join(__dirname, 'db.json'),
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
  apiVersion: process.env.API_VERSION || '1.0.0',
};

// ============================================================================
// IN-MEMORY STORES (enterprise resources)
// ============================================================================

let mockCart = { items: [] };
const orders = [];
const newsletterSubscriptions = [];
const contactSubmissions = [];
let requestCount = 0;
const startTime = Date.now();

// ============================================================================
// UTILITIES
// ============================================================================

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);
const generateRequestId = () =>
  `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel =
  CONFIG.env === 'development' ? LOG_LEVELS.debug : LOG_LEVELS.info;

const log = (level, message, meta = {}) => {
  if (LOG_LEVELS[level] < minLevel) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId: meta.requestId,
    ...meta,
  };
  console.log(JSON.stringify(entry));
};

const paginate = (arr, page = 1, limit = 10) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const start = (p - 1) * l;
  const items = arr.slice(start, start + l);
  return {
    items,
    page: p,
    limit: l,
    total: arr.length,
    totalPages: Math.ceil(arr.length / l),
  };
};

const sortArray = (arr, sortBy, order = 'asc') => {
  if (!sortBy || !arr.length) return arr;
  const key = sortBy;
  const dir = String(order).toLowerCase() === 'desc' ? -1 : 1;
  return [...arr].sort((a, b) => {
    let va = a[key];
    let vb = b[key];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return -dir;
    if (va > vb) return dir;
    return 0;
  });
};

const filterBySearch = (arr, q, keys = ['name', 'title', 'description']) => {
  if (!q || !arr.length) return arr;
  const term = String(q).toLowerCase();
  return arr.filter((item) =>
    keys.some((k) => item[k] && String(item[k]).toLowerCase().includes(term))
  );
};

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Tab favicon: “L” on teal (no extra static files). */
const FAVICON_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs><linearGradient id="lc" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:#0d9488"/><stop offset="100%" style="stop-color:#134e4a"/>
  </linearGradient></defs>
  <rect width="32" height="32" rx="7" fill="url(#lc)"/>
  <path fill="#ecfdf5" d="M8 7h5v17h12v4H8V7z" opacity=".95"/>
</svg>`;

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

// --- Security ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  rateLimit({
    windowMs: CONFIG.rateLimitWindowMs,
    max: CONFIG.rateLimitMax,
    message: { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(
  cors({
    origin: CONFIG.corsOrigins[0] === '*' ? true : CONFIG.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  })
);

// --- Body & limits ---
app.use(express.json({ limit: CONFIG.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: CONFIG.bodyLimit }));

// --- Request context & logging ---
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || generateRequestId();
  res.setHeader('X-Request-Id', req.id);
  requestCount++;
  const start = Date.now();
  res.on('finish', () => {
    log('info', `${req.method} ${req.originalUrl} ${res.statusCode}`, {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
});

// --- JSON Server defaults (no duplicate HTTP log lines; we log JSON above) ---
app.use(jsonServer.defaults({ logger: false }));

// --- Timeout ---
app.use((req, res, next) => {
  req.setTimeout(CONFIG.requestTimeoutMs);
  res.setTimeout(CONFIG.requestTimeoutMs);
  next();
});

// --- Swagger UI (npm package; served locally — no CDN) ---
const swaggerUiDir = path.join(__dirname, 'node_modules', 'swagger-ui-dist');
app.use(
  '/swagger-ui',
  express.static(swaggerUiDir, {
    index: false,
    maxAge: CONFIG.env === 'production' ? '1d' : 0,
  })
);

// --- Redoc standalone bundle (three-column OpenAPI docs, Redocly-style) ---
const redocBundlesDir = path.join(__dirname, 'node_modules', 'redoc', 'bundles');
app.use(
  '/redoc',
  express.static(redocBundlesDir, {
    index: false,
    maxAge: CONFIG.env === 'production' ? '1d' : 0,
  })
);

// ============================================================================
// ROOT & INFO ROUTES
// ============================================================================

const buildOpenApiSpec = () => ({
  openapi: '3.0.3',
  info: {
    title: 'Lucid Web Craftsman — Mock API',
    version: CONFIG.apiVersion,
    description:
      'Local json-server + Express mock. Cart, orders, newsletter, and contact are in-memory (orders/cart seeded from db.json on startup).',
  },
  servers: [{ url: '/', description: 'This process' }],
  tags: [
    { name: 'Meta', description: 'Discovery and health' },
    { name: 'Catalog', description: 'Products & posts from db.json' },
    { name: 'Commerce', description: 'Cart & orders' },
    { name: 'Forms', description: 'Newsletter & contact' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Meta'],
        summary: 'Health check',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/meta': {
      get: {
        tags: ['Meta'],
        summary: 'Machine-readable server index',
        responses: { '200': { description: 'JSON index' } },
      },
    },
    '/api/products': {
      get: {
        tags: ['Catalog'],
        summary: 'List products',
        parameters: [
          { name: '_page', in: 'query', schema: { type: 'integer' } },
          { name: '_limit', in: 'query', schema: { type: 'integer' } },
          { name: '_sort', in: 'query', schema: { type: 'string' } },
          { name: '_order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated products' } },
      },
    },
    '/api/posts': {
      get: {
        tags: ['Catalog'],
        summary: 'List posts',
        parameters: [
          { name: '_page', in: 'query', schema: { type: 'integer' } },
          { name: '_limit', in: 'query', schema: { type: 'integer' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated posts' } },
      },
    },
    '/api/cart': {
      get: {
        tags: ['Commerce'],
        summary: 'Get cart',
        responses: { '200': { description: 'Cart object' } },
      },
      post: {
        tags: ['Commerce'],
        summary: 'Replace cart',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: { '200': { description: 'Updated cart' } },
      },
    },
    '/api/orders': {
      get: {
        tags: ['Commerce'],
        summary: 'List orders',
        parameters: [
          { name: '_page', in: 'query', schema: { type: 'integer' } },
          { name: '_limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'Paginated orders' } },
      },
      post: {
        tags: ['Commerce'],
        summary: 'Create order',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: { items: { type: 'array' } },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/newsletter': {
      get: {
        tags: ['Forms'],
        summary: 'List newsletter signups (mock)',
        responses: { '200': { description: 'Paginated list' } },
      },
      post: {
        tags: ['Forms'],
        summary: 'Subscribe',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: { '201': { description: 'Subscribed' } },
      },
    },
    '/api/contact': {
      get: {
        tags: ['Forms'],
        summary: 'List contact submissions (mock)',
        responses: { '200': { description: 'Paginated list' } },
      },
      post: {
        tags: ['Forms'],
        summary: 'Submit contact form',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'message'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  subject: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
  },
  components: {
    schemas: {
      PaginatedMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string', example: 'pending' },
          items: { type: 'array', items: { type: 'object' } },
          total: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          customerEmail: { type: 'string', format: 'email' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
          requestId: { type: 'string' },
          hint: { type: 'string' },
        },
      },
    },
  },
});

const wantsHtml = (req) => {
  if (req.query.view === 'json') return false;
  if (req.query.view === 'html') return true;
  const a = req.headers.accept || '';
  if (!a || a === '*/*') return false;
  if (a.includes('application/json') && !a.includes('text/html')) return false;
  return a.includes('text/html');
};

/** Shared shell: nav + typography for console pages (not full-page Redoc/Swagger). */
const mockUiStyles = () => `<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
:root {
  --bg: #f6f4f0;
  --surface: #ffffff;
  --ink: #0f172a;
  --muted: #64748b;
  --line: #e2e8f0;
  --accent: #0d9488;
  --accent-dim: #115e59;
  --nav-h: 52px;
  --font: "DM Sans", ui-sans-serif, system-ui, sans-serif;
  --serif: "Libre Baskerville", Georgia, serif;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; font-family: var(--font); background: var(--bg); color: var(--ink); line-height: 1.55; min-height: 100vh; }
.topnav {
  position: sticky; top: 0; z-index: 50;
  height: var(--nav-h);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 1.25rem;
  background: linear-gradient(105deg, #0f172a 0%, #134e4a 55%, #0f766e 100%);
  border-bottom: 1px solid rgba(255,255,255,.08);
  box-shadow: 0 4px 24px rgba(15,23,42,.12);
}
.topnav__brand {
  display: flex; align-items: center; gap: .65rem;
  color: #f8fafc; text-decoration: none; font-weight: 600; letter-spacing: -.02em;
}
.topnav__brand img { width: 32px; height: 32px; border-radius: 8px; }
.topnav__links { display: flex; flex-wrap: wrap; gap: .15rem .35rem; align-items: center; }
.topnav__links a {
  color: rgba(248,250,252,.72); text-decoration: none; font-size: .8125rem; font-weight: 500;
  padding: .35rem .65rem; border-radius: 8px; transition: color .15s, background .15s;
}
.topnav__links a:hover { color: #fff; background: rgba(255,255,255,.08); }
.topnav__links a.is-active { color: #fff; background: rgba(255,255,255,.14); }
.shell { max-width: 1120px; margin: 0 auto; padding: 2rem 1.25rem 3.5rem; }
.shell h1 { font-family: var(--serif); font-size: clamp(1.65rem, 3vw, 2.1rem); font-weight: 700; margin: 0 0 .5rem; letter-spacing: -.02em; }
.lede { color: var(--muted); font-size: 1rem; max-width: 56ch; margin: 0 0 1.75rem; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.75rem; }
.card {
  background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
  padding: 1.15rem 1.2rem; transition: box-shadow .2s, border-color .2s;
}
.card:hover { box-shadow: 0 12px 40px rgba(15,23,42,.06); border-color: #cbd5e1; }
.card h3 { margin: 0 0 .35rem; font-size: .7rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); font-weight: 600; }
.card b { font-size: 1.65rem; font-family: var(--serif); color: var(--accent-dim); display: block; }
.panel {
  background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
  padding: 1.35rem 1.5rem; margin-bottom: 1.25rem;
}
.panel h2 { font-family: var(--serif); font-size: 1.2rem; margin: 0 0 1rem; color: var(--accent-dim); }
.btnrow { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1rem; }
.btn {
  display: inline-flex; align-items: center; gap: .35rem;
  padding: .5rem 1rem; border-radius: 10px; font-size: .875rem; font-weight: 600; text-decoration: none;
  background: var(--accent); color: #fff; border: none; cursor: pointer;
}
.btn:hover { filter: brightness(1.05); }
.btn--ghost { background: var(--surface); color: var(--accent-dim); border: 1px solid var(--line); }
table.data { width: 100%; border-collapse: collapse; font-size: .875rem; }
table.data th, table.data td { text-align: left; padding: .55rem .45rem; border-bottom: 1px solid var(--line); vertical-align: top; }
table.data th { font-size: .68rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
pre.code, .code-block {
  font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: .8rem;
  background: #0f172a; color: #e2e8f0; padding: 1rem 1.1rem; border-radius: 12px;
  overflow: auto; max-height: 420px; line-height: 1.45; margin: 0;
}
.muted { color: var(--muted); font-size: .9rem; }
.pill { display: inline-block; padding: .12rem .45rem; border-radius: 999px; font-size: .72rem; font-weight: 700; }
.pill-delivered { background: #d1fae5; color: #065f46; }
.pill-pending { background: #fef3c7; color: #92400e; }
.pill-unknown { background: #f1f5f9; color: #475569; }
ul.tight { margin: 0; padding-left: 1.15rem; }
.kbd { font-family: ui-monospace, monospace; font-size: .78em; background: #f1f5f9; padding: .1rem .35rem; border-radius: 4px; }
.footer-note { margin-top: 2.5rem; font-size: .78rem; color: var(--muted); }
.dl-grid { display: grid; grid-template-columns: 140px 1fr; gap: .5rem 1rem; font-size: .9rem; }
.dl-grid dt { color: var(--muted); font-weight: 500; }
.dl-grid dd { margin: 0; }
</style>`;

const mockUiNav = (active) => {
  const items = [
    ['console', '/', 'Console'],
    ['docs', '/docs', 'API reference'],
    ['swagger', '/docs/swagger', 'Swagger UI'],
    ['health', '/health', 'Health'],
    ['help', '/help', 'Help'],
    ['info', '/info', 'Info'],
  ];
  const links = items
    .map(
      ([key, href, label]) =>
        `<a href="${href}" class="${key === active ? 'is-active' : ''}">${escapeHtml(label)}</a>`
    )
    .join('');
  return `<header class="topnav">
  <a class="topnav__brand" href="/">
    <img src="/favicon.svg" width="32" height="32" alt=""/>
    <span>Lucid · Mock API</span>
  </a>
  <nav class="topnav__links" aria-label="Console">${links}</nav>
</header>`;
};

const mockPageShell = (title, activeNav, innerHtml) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)} — Lucid Mock API</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
  ${mockUiStyles()}
</head>
<body>
  ${mockUiNav(activeNav)}
  <main class="shell">${innerHtml}</main>
</body>
</html>`;

const buildDashboardHtml = () => {
  let db;
  try {
    db = JSON.parse(fs.readFileSync(CONFIG.dbPath, 'utf8'));
  } catch {
    db = {};
  }
  const productCount = (db.products || []).length;
  const postCount = (db.posts || []).length;
  const orderRows = orders
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )
    .slice(0, 12)
    .map((o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      const summary =
        items.length === 0
          ? '—'
          : items
              .map((i) => `${escapeHtml(i.name || i.productId || '?')} × ${i.quantity ?? 1}`)
              .join(', ');
      return `<tr><td><code>${escapeHtml(o.id)}</code></td><td><span class="pill pill-${escapeHtml(o.status || 'unknown')}">${escapeHtml(o.status || '—')}</span></td><td class="muted">${escapeHtml(o.createdAt || '')}</td><td>${summary}</td><td>${o.total != null ? escapeHtml(String(o.total)) : '—'}</td></tr>`;
    })
    .join('');

  const cartItems = mockCart.items || [];
  const cartSummary =
    cartItems.length === 0
      ? '<p class="muted">Cart is empty — add lines in <span class="kbd">db.json</span> under <span class="kbd">cart.items</span> or <span class="kbd">POST /api/cart</span>.</p>'
      : `<ul class="tight">${cartItems
          .map(
            (i) =>
              `<li>${escapeHtml(i.name || i.id || 'item')} × ${escapeHtml(String(i.quantity ?? 1))}</li>`
          )
          .join('')}</ul>`;

  const inner = `
<h1>Console</h1>
<p class="lede">Operational view of the local mock: live counts, cart, and recent orders. API reference uses <strong>Redoc</strong> (three-column layout); classic <strong>Swagger UI</strong> stays available.</p>
<div class="btnrow">
  <a class="btn" href="/docs">OpenAPI reference (Redoc)</a>
  <a class="btn btn--ghost" href="/docs/swagger">Swagger UI</a>
  <a class="btn btn--ghost" href="/openapi.json">openapi.json</a>
  <a class="btn btn--ghost" href="/api/meta">Machine index (JSON)</a>
</div>
<div class="cards">
  <div class="card"><h3>Products (db)</h3><b>${productCount}</b></div>
  <div class="card"><h3>Posts (db)</h3><b>${postCount}</b></div>
  <div class="card"><h3>Orders (memory)</h3><b>${orders.length}</b></div>
  <div class="card"><h3>Cart lines</h3><b>${cartItems.length}</b></div>
  <div class="card"><h3>Newsletter</h3><b>${newsletterSubscriptions.length}</b></div>
  <div class="card"><h3>Contact</h3><b>${contactSubmissions.length}</b></div>
</div>
<div class="panel">
  <h2>Current cart</h2>
  ${cartSummary}
</div>
<div class="panel">
  <h2>Orders</h2>
  ${
    orders.length === 0
      ? '<p class="muted">No orders — seed <span class="kbd">orders</span> in db.json or <span class="kbd">POST /api/orders</span>.</p>'
      : `<table class="data"><thead><tr><th>ID</th><th>Status</th><th>Created</th><th>Items</th><th>Total</th></tr></thead><tbody>${orderRows}</tbody></table>`
  }
</div>
<p class="footer-note">Port <span class="kbd">${CONFIG.port}</span> · API <span class="kbd">${escapeHtml(CONFIG.apiVersion)}</span> · Every response includes <span class="kbd">X-Request-Id</span>.</p>`;
  return mockPageShell('Console', 'console', inner);
};

const buildHealthHtml = () => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const dbOk = fs.existsSync(CONFIG.dbPath);
  const inner = `
<h1>Health</h1>
<p class="lede">Liveness and readiness probes for scripts and load balancers. Browsers see this page; clients that send <span class="kbd">Accept: application/json</span> (e.g. curl) still get JSON from <span class="kbd">GET /health</span>.</p>
<div class="cards">
  <div class="card"><h3>Uptime (this process)</h3><b>${uptime}s</b></div>
  <div class="card"><h3>Requests seen</h3><b>${requestCount}</b></div>
  <div class="card"><h3>db.json</h3><b>${dbOk ? 'OK' : 'Missing'}</b></div>
  <div class="card"><h3>Environment</h3><b style="font-size:1rem;font-family:var(--font)">${escapeHtml(CONFIG.env)}</b></div>
</div>
<div class="panel">
  <h2>Endpoints</h2>
  <dl class="dl-grid">
    <dt>GET /health</dt><dd>Overall status (this page or JSON).</dd>
    <dt>GET /health/live</dt><dd>Process alive.</dd>
    <dt>GET /health/ready</dt><dd>DB file on disk (503 if missing).</dd>
    <dt>GET /api/metrics</dt><dd>Request counter + uptime JSON.</dd>
  </dl>
</div>
<div class="panel">
  <h2>Live JSON</h2>
  <p class="muted" style="margin-top:0">Refreshes every 5s.</p>
  <pre class="code-block" id="health-live">Loading…</pre>
</div>
<script>
(async function () {
  const el = document.getElementById('health-live');
  async function tick() {
    try {
      const [h, m] = await Promise.all([
        fetch('/health?view=json', { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); }),
        fetch('/api/metrics').then(function (r) { return r.json(); })
      ]);
      el.textContent = JSON.stringify({ health: h, metrics: m }, null, 2);
    } catch (e) {
      el.textContent = String(e);
    }
  }
  tick();
  setInterval(tick, 5000);
})();
</script>`;
  return mockPageShell('Health', 'health', inner);
};

const getApiInfoPayload = () => ({
  version: CONFIG.apiVersion,
  dashboard: '/',
  openapi: '/openapi.json',
  redoc: '/docs',
  swaggerUi: '/docs/swagger',
  resources: {
    cart: 'GET/POST /api/cart',
    orders: 'GET/POST /api/orders',
    newsletter: 'GET/POST /api/newsletter',
    contact: 'GET/POST /api/contact',
    products: 'GET /api/products',
    posts: 'GET /api/posts',
  },
  queryParams: {
    products: '_page, _limit, _sort, _order, q',
    posts: '_page, _limit, _sort, _order, q',
    orders: '_page, _limit, _sort, _order',
  },
});

const buildInfoHtml = () => {
  const payload = getApiInfoPayload();
  const inner = `
<h1>API info</h1>
<p class="lede">Same resource map as <span class="kbd">GET /api/info</span>, rendered for reading in the browser. Use the reference docs for request/response shapes.</p>
<div class="btnrow">
  <a class="btn" href="/docs">Redoc reference</a>
  <a class="btn btn--ghost" href="/docs/swagger">Swagger UI</a>
</div>
<div class="panel">
  <h2>/api/info payload</h2>
  <pre class="code-block">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
</div>`;
  return mockPageShell('Info', 'info', inner);
};

const buildHelpHtml = () => {
  const inner = `
<h1>Help</h1>
<p class="lede">Using the Lucid mock API locally: documentation, ports, and common fixes.</p>
<div class="panel">
  <h2>Where to start</h2>
  <ul class="tight">
    <li><strong><a href="/">Console</a></strong> — counts, cart, orders snapshot.</li>
    <li><strong><a href="/docs">API reference (Redoc)</a></strong> — three-column OpenAPI docs (like Redocly).</li>
    <li><strong><a href="/docs/swagger">Swagger UI</a></strong> — try-it style explorer.</li>
    <li><strong><a href="/health">Health</a></strong> — HTML dashboard or JSON for automation.</li>
    <li><strong><a href="/info">Info</a></strong> — resource map; <span class="kbd">GET /api/info</span> for JSON.</li>
  </ul>
</div>
<div class="panel">
  <h2>Port already in use (EADDRINUSE)</h2>
  <p class="muted">Another process is bound to the same port (default <span class="kbd">3001</span>). Stop the old mock server, or run on another port:</p>
  <pre class="code-block"># PowerShell
$env:PORT='3002'; pnpm run start:api

# bash
PORT=3002 pnpm run start:api</pre>
</div>
<div class="panel">
  <h2>Frontend + mock</h2>
  <p class="muted">Vite proxies <span class="kbd">/api</span> to this server. If you change <span class="kbd">PORT</span>, update the dev proxy in <span class="kbd">vite.config.ts</span> accordingly.</p>
</div>
<div class="panel">
  <h2>Data persistence</h2>
  <p class="muted">Products and posts are read from <span class="kbd">backend/db.json</span>. Orders and cart are loaded from that file on startup; new orders and cart updates stay in memory until you restart unless you add your own persistence.</p>
</div>`;
  return mockPageShell('Help', 'help', inner);
};

app.get('/favicon.svg', (_req, res) => {
  res.type('image/svg+xml').status(200).send(FAVICON_SVG);
});

app.get('/favicon.ico', (_req, res) => {
  res.type('image/svg+xml').status(200).send(FAVICON_SVG);
});

app.get('/openapi.json', (_req, res) => {
  res.status(200).json(buildOpenApiSpec());
});

app.get('/docs/swagger', (_req, res) => {
  res.type('html').status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Swagger UI — Lucid Mock API</title>
  <link rel="stylesheet" href="/swagger-ui/swagger-ui.css"/>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/swagger-ui/swagger-ui-bundle.js"></script>
  <script>window.ui = SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', deepLinking: true, docExpansion: 'list' });</script>
</body>
</html>`);
});

app.get('/docs', (_req, res) => {
  res.type('html').status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>API reference — Lucid Mock API</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
  <style>
    body { margin: 0; }
    .redoc-navstrip {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      height: 44px; display: flex; align-items: center; gap: .25rem;
      padding: 0 .75rem;
      background: #1a1a1a; border-bottom: 1px solid #333;
      font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; font-size: 13px;
    }
    .redoc-navstrip a {
      color: #94a3b8; text-decoration: none; padding: .35rem .65rem; border-radius: 6px;
    }
    .redoc-navstrip a:hover { color: #fff; background: rgba(255,255,255,.08); }
    .redoc-navstrip .spacer { flex: 1; }
    .redoc-navstrip span { color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <nav class="redoc-navstrip" aria-label="Documentation">
    <a href="/">Console</a>
    <a href="/docs/swagger">Swagger UI</a>
    <a href="/openapi.json">openapi.json</a>
    <a href="/help">Help</a>
    <span class="spacer"></span>
    <span>Redoc · OpenAPI 3</span>
  </nav>
  <redoc spec-url="/openapi.json" scroll-y-offset="44"></redoc>
  <script src="/redoc/redoc.standalone.js"></script>
</body>
</html>`);
});

app.get('/', (req, res) => {
  const accept = req.headers.accept || '';
  if (accept.includes('application/json') && !accept.includes('text/html')) {
    return res.status(200).json({
      name: 'Mock API Server',
      version: CONFIG.apiVersion,
      status: 'running',
      dashboard: '/',
      openapi: '/openapi.json',
      redoc: '/docs',
      swaggerUi: '/docs/swagger',
      meta: '/api/meta',
      health: '/health',
      help: '/help',
      info: '/info',
      endpoints: [
        '/',
        '/docs',
        '/docs/swagger',
        '/help',
        '/info',
        '/api/meta',
        '/api/cart',
        '/api/orders',
        '/api/newsletter',
        '/api/contact',
        '/api/products',
        '/api/posts',
        '/health',
      ],
    });
  }
  res.type('html').status(200).send(buildDashboardHtml());
});

app.get('/api/meta', (req, res) => {
  res.status(200).json({
    name: 'Mock API Server',
    version: CONFIG.apiVersion,
    status: 'running',
    dashboard: '/',
    openapi: '/openapi.json',
    redoc: '/docs',
    swaggerUi: '/docs/swagger',
    docs: '/api/info',
    help: '/help',
    info: '/info',
    health: '/health',
    endpoints: [
      '/',
      '/docs',
      '/docs/swagger',
      '/help',
      '/info',
      '/api/meta',
      '/api/cart',
      '/api/orders',
      '/api/newsletter',
      '/api/contact',
      '/api/products',
      '/api/posts',
      '/health',
    ],
  });
});

app.get('/api', (_req, res) => {
  res.status(200).json({
    message: 'Mock API root',
    dashboard: '/',
    openapi: '/openapi.json',
    redoc: '/docs',
    swaggerUi: '/docs/swagger',
    hint: 'GET /api/products, /api/posts, /api/orders, …',
  });
});

app.get('/help', (_req, res) => {
  res.type('html').status(200).send(buildHelpHtml());
});

app.get('/info', (_req, res) => {
  res.type('html').status(200).send(buildInfoHtml());
});

app.get('/health', (req, res) => {
  const payload = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    env: CONFIG.env,
  };
  if (wantsHtml(req)) {
    return res.type('html').status(200).send(buildHealthHtml());
  }
  res.status(200).json(payload);
});

app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

app.get('/health/ready', (req, res) => {
  const dbExists = fs.existsSync(CONFIG.dbPath);
  res.status(dbExists ? 200 : 503).json({
    status: dbExists ? 'ready' : 'not_ready',
    db: dbExists ? 'ok' : 'missing',
  });
});

app.get('/api/info', (req, res) => {
  res.status(200).json({
    ...getApiInfoPayload(),
    docsHtml: '/info',
    help: '/help',
  });
});

app.get('/api/helth', (_req, res) => {
  res.redirect(301, '/health');
});

app.get('/api/metrics', (req, res) => {
  res.status(200).json({
    requests: requestCount,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// CART API
// ============================================================================

app.get('/api/cart', (req, res) => {
  res.status(200).json(mockCart);
});

app.post('/api/cart', (req, res) => {
  try {
    const newCart = req.body;
    if (!newCart || typeof newCart !== 'object') {
      return res
        .status(400)
        .json({ error: 'Invalid cart format', code: 'VALIDATION_ERROR' });
    }
    mockCart = newCart;
    res.status(200).json(mockCart);
  } catch (err) {
    log('error', 'POST /api/cart failed', {
      requestId: req.id,
      err: err.message,
    });
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================================
// ORDERS API
// ============================================================================

app.get('/api/orders', (req, res) => {
  try {
    const { _page, _limit, _sort, _order } = req.query;
    let result = [...orders];
    result = sortArray(result, _sort || 'createdAt', _order || 'desc');
    const out = paginate(result, _page, _limit);
    res.status(200).json(out);
  } catch (err) {
    log('error', 'GET /api/orders failed', {
      requestId: req.id,
      err: err.message,
    });
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: req.id,
    });
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.items || !Array.isArray(body.items)) {
      return res.status(400).json({
        error: 'Invalid order: items array required',
        code: 'VALIDATION_ERROR',
      });
    }
    const order = {
      ...body,
      id: generateId(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    orders.push(order);
    res.status(201).json(order);
  } catch (err) {
    log('error', 'POST /api/orders failed', {
      requestId: req.id,
      err: err.message,
    });
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: req.id,
    });
  }
});

// ============================================================================
// NEWSLETTER API
// ============================================================================

app.get('/api/newsletter', (req, res) => {
  try {
    const { _page, _limit } = req.query;
    const result = sortArray(
      [...newsletterSubscriptions],
      'subscribedAt',
      'desc'
    );
    res.status(200).json(paginate(result, _page, _limit));
  } catch (err) {
    log('error', 'GET /api/newsletter failed', {
      requestId: req.id,
      err: err.message,
    });
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: req.id,
    });
  }
});

app.post('/api/newsletter', (req, res) => {
  try {
    const { email } = req.body || {};
    if (
      !email ||
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res
        .status(400)
        .json({ error: 'Valid email required', code: 'VALIDATION_ERROR' });
    }
    const sub = {
      id: generateId(),
      email: email.toLowerCase().trim(),
      subscribedAt: new Date().toISOString(),
    };
    newsletterSubscriptions.push(sub);
    res.status(201).json({ message: 'Subscribed successfully', id: sub.id });
  } catch (err) {
    log('error', 'POST /api/newsletter failed', {
      requestId: req.id,
      err: err.message,
    });
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: req.id,
    });
  }
});

// ============================================================================
// CONTACT API
// ============================================================================

app.get('/api/contact', (req, res) => {
  try {
    const { _page, _limit } = req.query;
    const result = sortArray([...contactSubmissions], 'createdAt', 'desc');
    res.status(200).json(paginate(result, _page, _limit));
  } catch (err) {
    log('error', 'GET /api/contact failed', {
      requestId: req.id,
      err: err.message,
    });
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: req.id,
    });
  }
});

app.post('/api/contact', (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!email || !message) {
      return res.status(400).json({
        error: 'Email and message required',
        code: 'VALIDATION_ERROR',
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res
        .status(400)
        .json({ error: 'Invalid email', code: 'VALIDATION_ERROR' });
    }
    const submission = {
      id: generateId(),
      name: name || '',
      email: email.toLowerCase().trim(),
      subject: subject || '',
      message: String(message).slice(0, 5000),
      createdAt: new Date().toISOString(),
    };
    contactSubmissions.push(submission);
    res
      .status(201)
      .json({ message: 'Message sent successfully', id: submission.id });
  } catch (err) {
    log('error', 'POST /api/contact failed', {
      requestId: req.id,
      err: err.message,
    });
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: req.id,
    });
  }
});

// ============================================================================
// CUSTOM JSON-SERVER ROUTES (products, posts) with pagination & search
// ============================================================================

const loadDb = () => {
  try {
    const raw = fs.readFileSync(CONFIG.dbPath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    log('warn', 'db.json not found or invalid', {
      path: CONFIG.dbPath,
      err: e.message,
    });
    return { products: [], posts: [] };
  }
};

/** Load seed orders + cart from db.json once at startup (in-memory after that). */
const hydrateEnterpriseState = () => {
  try {
    const db = loadDb();
    if (Array.isArray(db.orders) && db.orders.length > 0) {
      orders.length = 0;
      orders.push(...db.orders);
      log('info', 'Hydrated orders from db.json', { count: orders.length });
    }
    if (
      db.cart &&
      typeof db.cart === 'object' &&
      Array.isArray(db.cart.items)
    ) {
      mockCart = {
        items: db.cart.items.map((line) => ({ ...line })),
      };
      log('info', 'Hydrated cart from db.json', { lines: mockCart.items.length });
    }
    if (Array.isArray(db.newsletterSubscriptions) && db.newsletterSubscriptions.length) {
      newsletterSubscriptions.length = 0;
      newsletterSubscriptions.push(
        ...db.newsletterSubscriptions.map((row) => ({ ...row }))
      );
      log('info', 'Hydrated newsletterSubscriptions from db.json', {
        count: newsletterSubscriptions.length,
      });
    }
    if (Array.isArray(db.contactSubmissions) && db.contactSubmissions.length) {
      contactSubmissions.length = 0;
      contactSubmissions.push(
        ...db.contactSubmissions.map((row) => ({ ...row }))
      );
      log('info', 'Hydrated contactSubmissions from db.json', {
        count: contactSubmissions.length,
      });
    }
  } catch (e) {
    log('error', 'hydrateEnterpriseState failed', { err: e.message });
  }
};

app.get('/api/products', (req, res) => {
  try {
    const db = loadDb();
    let items = db.products || [];
    const { q, _sort, _order, _page, _limit } = req.query;
    items = filterBySearch(items, q, [
      'name',
      'title',
      'description',
      'category',
      'artisan',
      'sku',
      'tags',
    ]);
    items = sortArray(items, _sort || 'id', _order || 'asc');
    const out = paginate(items, _page, _limit);
    res.status(200).json(out);
  } catch (err) {
    log('error', 'GET /api/products failed', { requestId: req.id });
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const db = loadDb();
    const items = db.products || [];
    const id = parseInt(req.params.id, 10);
    const item = items.find((p) => p.id === id);
    if (!item)
      return res
        .status(404)
        .json({ error: 'Product not found', code: 'NOT_FOUND' });
    res.status(200).json(item);
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/posts', (req, res) => {
  try {
    const db = loadDb();
    let items = db.posts || [];
    const { q, _sort, _order, _page, _limit } = req.query;
    items = filterBySearch(items, q, [
      'title',
      'excerpt',
      'author',
      'category',
      'slug',
      'tags',
    ]);
    items = sortArray(items, _sort || 'date', _order || 'desc');
    const out = paginate(items, _page, _limit);
    res.status(200).json(out);
  } catch (err) {
    log('error', 'GET /api/posts failed', { requestId: req.id });
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/posts/:id', (req, res) => {
  try {
    const db = loadDb();
    const items = db.posts || [];
    const id = parseInt(req.params.id, 10);
    const item = items.find((p) => p.id === id);
    if (!item)
      return res
        .status(404)
        .json({ error: 'Post not found', code: 'NOT_FOUND' });
    res.status(200).json(item);
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================================
// JSON-SERVER FALLBACK (other db.json routes)
// ============================================================================

const router = jsonServer.router(CONFIG.dbPath);
app.use('/api', router);

// ============================================================================
// 404 & ERROR HANDLER
// ============================================================================

app.use((req, res) => {
  const pathOnly = req.path || req.originalUrl.split('?')[0];
  let hint;
  if (/helth/i.test(pathOnly)) {
    hint = 'Health lives at /health (not under /api).';
  }
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    requestId: req.id,
    hint,
    see: '/api/meta',
  });
});

app.use((err, req, res, next) => {
  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    'body' in err
  ) {
    log('warn', 'Invalid JSON body', {
      requestId: req?.id,
      err: err.message,
    });
    return res.status(400).json({
      error: 'Invalid JSON body',
      code: 'INVALID_JSON',
      requestId: req?.id,
    });
  }
  const status =
    typeof err.status === 'number' && err.status >= 400 && err.status < 600
      ? err.status
      : 500;
  log('error', 'Unexpected error', {
    requestId: req?.id,
    err: err?.message,
    stack: CONFIG.env === 'development' ? err?.stack : undefined,
  });
  res.status(status).json({
    error:
      status >= 500
        ? 'Internal server error'
        : err.message || 'Request error',
    code: status >= 500 ? 'INTERNAL_ERROR' : err.code || 'ERROR',
    requestId: req?.id,
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

let server;

const shutdown = (signal) => {
  log('info', `Received ${signal}, shutting down gracefully`);
  if (server) {
    server.close(() => {
      log('info', 'Server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ============================================================================
// START
// ============================================================================

hydrateEnterpriseState();

server = app.listen(CONFIG.port);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    log('error', `Port ${CONFIG.port} is already in use — another Mock API (or app) is listening`, {
      port: CONFIG.port,
      code: err.code,
      hint: `Stop the process using port ${CONFIG.port}, or start on a different port: PORT=3002 pnpm run start:api (PowerShell: $env:PORT='3002'; pnpm run start:api)`,
    });
    process.exit(1);
    return;
  }
  log('error', 'Server failed to start', {
    port: CONFIG.port,
    code: err.code,
    err: err.message,
  });
  process.exit(1);
});

server.on('listening', () => {
  const base = `http://localhost:${CONFIG.port}`;
  log('info', `Mock API server listening on ${base}`, {
    port: CONFIG.port,
    env: CONFIG.env,
    dashboard: `${base}/`,
    redoc: `${base}/docs`,
    swagger: `${base}/docs/swagger`,
  });
});

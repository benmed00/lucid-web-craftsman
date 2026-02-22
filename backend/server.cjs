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
try { helmet = require('helmet'); } catch { helmet = () => (_req, _res, next) => next(); }
try { rateLimit = require('express-rate-limit'); } catch { rateLimit = () => (_req, _res, next) => next(); }

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  port: parseInt(process.env.PORT || '3001', 10),
  env: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map((o) => o.trim()),
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

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel = CONFIG.env === 'development' ? LOG_LEVELS.debug : LOG_LEVELS.info;

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
  return { items, page: p, limit: l, total: arr.length, totalPages: Math.ceil(arr.length / l) };
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
    origin:
      CONFIG.corsOrigins[0] === '*' ? true : CONFIG.corsOrigins,
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

// --- JSON Server defaults (logger, static, etc.) ---
app.use(jsonServer.defaults());

// --- Timeout ---
app.use((req, res, next) => {
  req.setTimeout(CONFIG.requestTimeoutMs);
  res.setTimeout(CONFIG.requestTimeoutMs);
  next();
});

// ============================================================================
// ROOT & INFO ROUTES
// ============================================================================

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Mock API Server',
    version: CONFIG.apiVersion,
    status: 'running',
    docs: '/api/info',
    health: '/health',
    endpoints: ['/api', '/api/cart', '/api/orders', '/api/newsletter', '/api/contact', '/health'],
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    env: CONFIG.env,
  });
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
    version: CONFIG.apiVersion,
    resources: {
      cart: 'GET/POST /api/cart',
      orders: 'GET/POST /api/orders',
      newsletter: 'POST /api/newsletter',
      contact: 'POST /api/contact',
      products: 'GET /api/products',
      posts: 'GET /api/posts',
    },
    queryParams: {
      products: '_page, _limit, _sort, _order, q',
      posts: '_page, _limit, _sort, _order, q',
    },
  });
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
      return res.status(400).json({ error: 'Invalid cart format', code: 'VALIDATION_ERROR' });
    }
    mockCart = newCart;
    res.status(200).json(mockCart);
  } catch (err) {
    log('error', 'POST /api/cart failed', { requestId: req.id, err: err.message });
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
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
    log('error', 'GET /api/orders failed', { requestId: req.id });
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.items || !Array.isArray(body.items)) {
      return res.status(400).json({ error: 'Invalid order: items array required', code: 'VALIDATION_ERROR' });
    }
    const order = {
      id: generateId(),
      ...body,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    orders.push(order);
    res.status(201).json(order);
  } catch (err) {
    log('error', 'POST /api/orders failed', { requestId: req.id });
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================================
// NEWSLETTER API
// ============================================================================

app.post('/api/newsletter', (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required', code: 'VALIDATION_ERROR' });
    }
    const sub = {
      id: generateId(),
      email: email.toLowerCase().trim(),
      subscribedAt: new Date().toISOString(),
    };
    newsletterSubscriptions.push(sub);
    res.status(201).json({ message: 'Subscribed successfully', id: sub.id });
  } catch (err) {
    log('error', 'POST /api/newsletter failed', { requestId: req.id });
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// ============================================================================
// CONTACT API
// ============================================================================

app.post('/api/contact', (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!email || !message) {
      return res.status(400).json({ error: 'Email and message required', code: 'VALIDATION_ERROR' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email', code: 'VALIDATION_ERROR' });
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
    res.status(201).json({ message: 'Message sent successfully', id: submission.id });
  } catch (err) {
    log('error', 'POST /api/contact failed', { requestId: req.id });
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
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
    log('warn', 'db.json not found or invalid', { path: CONFIG.dbPath });
    return { products: [], posts: [] };
  }
};

app.get('/api/products', (req, res) => {
  try {
    const db = loadDb();
    let items = db.products || [];
    const { q, _sort, _order, _page, _limit } = req.query;
    items = filterBySearch(items, q);
    items = sortArray(items, _sort || 'id', _order || 'asc');
    const out = paginate(items, _page, _limit);
    res.status(200).json(out);
  } catch (err) {
    log('error', 'GET /api/products failed', { requestId: req.id });
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const db = loadDb();
    const items = db.products || [];
    const id = parseInt(req.params.id, 10);
    const item = items.find((p) => p.id === id);
    if (!item) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
    res.status(200).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/posts', (req, res) => {
  try {
    const db = loadDb();
    let items = db.posts || [];
    const { q, _sort, _order, _page, _limit } = req.query;
    items = filterBySearch(items, q, ['title', 'excerpt', 'author', 'category']);
    items = sortArray(items, _sort || 'date', _order || 'desc');
    const out = paginate(items, _page, _limit);
    res.status(200).json(out);
  } catch (err) {
    log('error', 'GET /api/posts failed', { requestId: req.id });
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

app.get('/api/posts/:id', (req, res) => {
  try {
    const db = loadDb();
    const items = db.posts || [];
    const id = parseInt(req.params.id, 10);
    const item = items.find((p) => p.id === id);
    if (!item) return res.status(404).json({ error: 'Post not found', code: 'NOT_FOUND' });
    res.status(200).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
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
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND', path: req.originalUrl });
});

app.use((err, req, res, next) => {
  log('error', 'Unexpected error', { requestId: req?.id, err: err?.message, stack: err?.stack });
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
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

server = app.listen(CONFIG.port, () => {
  log('info', `Mock API server listening on http://localhost:${CONFIG.port}`, {
    port: CONFIG.port,
    env: CONFIG.env,
  });
});

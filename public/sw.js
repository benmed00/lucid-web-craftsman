/**
 * Service Worker — Rif Raw Straw
 *
 * Caching strategy:
 *   - Fingerprinted static assets (JS/CSS/fonts in /assets/) → cache-first
 *   - Images (local + Supabase storage)                      → cache-first
 *   - HTML / navigation requests                             → network-only (NEVER cached)
 *   - Supabase API / Auth / Functions / REST                 → bypassed entirely
 *   - Stripe                                                 → bypassed entirely
 *   - Everything else                                        → network-only
 *
 * CRITICAL: Supabase REST API calls MUST NOT be intercepted.
 * The Supabase client uses a custom fetch wrapper with AbortController
 * timeouts and dynamic headers (x-guest-id). If the SW intercepts these
 * requests and makes its own fetch(), the AbortController signal does NOT
 * propagate — the SW's fetch hangs indefinitely in Chrome, holding a
 * connection slot and causing skeleton loading states that never resolve.
 *
 * Cache versioning:
 *   Bump the version suffix to force all clients to purge old caches
 *   on the next service worker activation.
 */

const STATIC_CACHE_NAME = 'rif-static-v9';
const IMAGE_CACHE_NAME = 'rif-images-v9';

const MAX_CACHE_SIZE = 100; // per bucket

// Trim a cache to MAX_CACHE_SIZE (FIFO)
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    for (let i = 0; i < keys.length - maxItems; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// ── Install ──────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  // Skip waiting so the new SW activates immediately
  event.waitUntil(self.skipWaiting());
});

// ── Activate — purge old caches ──────────────────────────────────────
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE_NAME, IMAGE_CACHE_NAME];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !currentCaches.includes(name))
            .map((name) => {
              console.log('[SW] Purging old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip non-http(s) requests
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // ── BYPASS: ALL Supabase requests (API, Auth, Functions, REST, Storage) ──
  // CRITICAL: Never intercept Supabase calls. The client's AbortController
  // signal does NOT propagate through SW fetch, causing Chrome to hold
  // connections indefinitely and triggering permanent skeleton states.
  if (url.hostname.endsWith('supabase.co')) {
    return; // Let the browser handle these directly
  }

  // ── BYPASS: Stripe ──
  if (
    url.hostname.endsWith('stripe.com') ||
    url.hostname.endsWith('stripe.network')
  ) {
    return;
  }

  // ── BYPASS: browser extensions ──
  if (
    request.url.startsWith('chrome-extension://') ||
    request.url.startsWith('moz-extension://')
  ) {
    return;
  }

  // ── BYPASS: API / auth / function / payment paths on same origin ──
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/functions/') ||
    url.pathname.startsWith('/payment-success') ||
    url.pathname.startsWith('/checkout')
  ) {
    return;
  }

  // ── Static assets with content hashes (JS, CSS, fonts) → cache-first ──
  if (
    request.url.match(/\.(js|css|woff|woff2|ttf|eot)(\?.*)?$/) &&
    request.url.includes('/assets/')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    return;
  }

  // ── Images → cache-first ──
  if (request.url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)(\?.*)?$/)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE_NAME));
    return;
  }

  // ── HTML navigation → network-only (NEVER cache) ──
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => new Response('Offline', { status: 503 }))
    );
    return;
  }

  // ── Everything else → network only ──
});

// ── Cache-first helper ───────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      // Non-blocking trim
      trimCache(cacheName, MAX_CACHE_SIZE);
    }
    return response;
  } catch (error) {
    return new Response('Network error', { status: 503 });
  }
}

// ── Push Notifications ───────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const options = {
    body: event.data
      ? event.data.text()
      : 'Nouvelle notification de Rif Raw Straw',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification('Rif Raw Straw', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
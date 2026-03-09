/**
 * Service Worker — Rif Raw Straw
 *
 * Caching strategy:
 *   - Fingerprinted static assets (JS/CSS/fonts in /assets/) → cache-first
 *   - Images (local + Supabase storage)                      → cache-first
 *   - HTML / navigation requests                             → network-only (NEVER cached)
 *   - Supabase API / Auth / Functions                        → bypassed entirely
 *   - Stripe                                                 → bypassed entirely
 *   - Everything else                                        → network-only
 *
 * Why HTML is never cached:
 *   Caching the HTML shell can serve stale auth state after login/logout or
 *   stale code after deployments. Since the SPA shell is tiny and always
 *   available from the CDN, the cost of a network round-trip is negligible
 *   compared to the risk of state incoherence.
 *
 * Cache versioning:
 *   Bump the version suffix (e.g. v5 → v6) to force all clients to purge
 *   old caches on the next service worker activation.
 */

const STATIC_CACHE_NAME = 'rif-static-v8';
const IMAGE_CACHE_NAME = 'rif-images-v8';
const DATA_CACHE_NAME = 'rif-data-v8';

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
            .map((name) => caches.delete(name))
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

  // ── BYPASS: Supabase API / Auth / Functions (everything except /storage/) ──
  if (
    url.hostname.endsWith('supabase.co') &&
    !url.pathname.startsWith('/storage/')
  ) {
    return; // network-only, no interception
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

  // ── Images → cache strategy depends on type ──
  if (
    request.url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)(\?.*)?$/) ||
    (url.hostname.endsWith('supabase.co') &&
      url.pathname.startsWith('/storage/'))
  ) {
    // Hero images from Supabase storage → network-first (they change when admin updates)
    if (
      url.hostname.endsWith('supabase.co') &&
      url.pathname.includes('/hero-images/')
    ) {
      event.respondWith(networkFirst(request, IMAGE_CACHE_NAME));
    } else {
      event.respondWith(cacheFirst(request, IMAGE_CACHE_NAME));
    }
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

// ── Network-first helper (for content that changes, e.g. hero images) ─
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(cacheName, MAX_CACHE_SIZE);
    }
    return response;
  } catch (error) {
    // Network failed — fall back to cache
    const cached = await cache.match(request);
    if (cached) return cached;
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

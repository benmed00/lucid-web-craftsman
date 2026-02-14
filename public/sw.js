const CACHE_NAME = 'rif-raw-straw-v5';
const STATIC_CACHE_NAME = 'rif-static-v5';
const IMAGE_CACHE_NAME = 'rif-images-v5';

const CACHE_DURATIONS = {
  STATIC_ASSETS: 365 * 24 * 60 * 60 * 1000,
  IMAGES: 30 * 24 * 60 * 60 * 1000,
  HTML_PAGES: 24 * 60 * 60 * 1000
};

const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker - clean old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, STATIC_CACHE_NAME, IMAGE_CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip non-http requests  
  if (!request.url.startsWith('http')) return;
  
  const url = new URL(request.url);
  
  // NEVER cache Supabase API/auth calls - they need fresh auth tokens
  if (request.url.includes('supabase.co') && !request.url.includes('/storage/')) {
    return;
  }
  
  // NEVER cache Stripe requests
  if (request.url.includes('stripe.com') || request.url.includes('stripe.network')) {
    return;
  }
  
  // NEVER cache extension or chrome requests
  if (request.url.startsWith('chrome-extension://') || request.url.startsWith('moz-extension://')) {
    return;
  }

  // Static assets with content hashes (JS, CSS, fonts) → cache-first
  if (request.url.match(/\.(js|css|woff|woff2|ttf|eot)(\?.*)?$/) && request.url.includes('/assets/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    return;
  }
  
  // Images (local + Supabase storage) → cache-first
  if (request.url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)(\?.*)?$/) || 
      (request.url.includes('supabase.co') && request.url.includes('/storage/'))) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE_NAME));
    return;
  }
  
  // HTML navigation → network-first
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }
  
  // Everything else → network only (don't cache unknown requests)
});

// Simple Cache First
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Network error', { status: 503 });
  }
}

// Simple Network First
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return caches.match('/') || new Response('Offline', { status: 503 });
  }
}

// Push Notification
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification de Rif Raw Straw',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification('Rif Raw Straw', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});

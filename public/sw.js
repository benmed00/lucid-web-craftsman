const CACHE_NAME = 'rif-raw-straw-v3';
const STATIC_CACHE_NAME = 'rif-static-v3';
const IMAGE_CACHE_NAME = 'rif-images-v3';

// Enhanced cache durations for SEO optimization
const CACHE_DURATIONS = {
  STATIC_ASSETS: 365 * 24 * 60 * 60 * 1000, // 1 year for JS/CSS (immutable assets)
  IMAGES: 30 * 24 * 60 * 60 * 1000, // 30 days for images  
  API_RESPONSES: 5 * 60 * 1000, // 5 minutes for API
  HTML_PAGES: 24 * 60 * 60 * 1000 // 24 hours for HTML
};

const STATIC_CACHE_URLS = [
  '/',
  '/products',
  '/cart',
  '/manifest.json',
  '/favicon.ico'
];

const API_CACHE_URLS = [
  '/api/products',
  '/api/cart'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch Event - Enhanced caching for SEO performance
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  const url = new URL(request.url);
  const cacheStrategy = getCacheStrategy(request.url);
  
  event.respondWith(
    cacheStrategy.strategy === 'cache-first'
      ? enhancedCacheFirst(request, cacheStrategy.cacheName, cacheStrategy.duration)
      : enhancedNetworkFirst(request, cacheStrategy.cacheName, cacheStrategy.duration)
  );
});

// Determine cache strategy based on resource type
function getCacheStrategy(url) {
  // Static assets (JS, CSS, fonts)
  if (url.match(/\.(js|css|woff|woff2|ttf|eot)$/)) {
    return {
      cacheName: STATIC_CACHE_NAME,
      duration: CACHE_DURATIONS.STATIC_ASSETS,
      strategy: 'cache-first'
    };
  }
  
  // Images (including Supabase storage) - longer cache for better performance
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/) || url.includes('supabase.co/storage')) {
    return {
      cacheName: IMAGE_CACHE_NAME,
      duration: CACHE_DURATIONS.IMAGES,
      strategy: 'cache-first'
    };
  }
  
  // API calls
  if (url.includes('/api/') || url.includes('supabase.co')) {
    return {
      cacheName: CACHE_NAME,
      duration: CACHE_DURATIONS.API_RESPONSES,
      strategy: 'network-first'
    };
  }
  
  // External scripts (Stripe, etc.)
  if (!url.includes(location.origin)) {
    return {
      cacheName: STATIC_CACHE_NAME,
      duration: CACHE_DURATIONS.STATIC_ASSETS,
      strategy: 'cache-first'
    };
  }
  
  // HTML pages
  return {
    cacheName: CACHE_NAME,
    duration: CACHE_DURATIONS.HTML_PAGES,
    strategy: 'network-first'
  };
}

// Check if cached response is still fresh
function isResponseFresh(response, duration) {
  if (!response) return false;
  
  const cachedTime = response.headers.get('sw-cached-time');
  if (!cachedTime) return false;
  
  const age = Date.now() - parseInt(cachedTime);
  return age < duration;
}

// Enhanced Cache First Strategy with TTL
async function enhancedCacheFirst(request, cacheName, duration) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && isResponseFresh(cachedResponse, duration)) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Clone response and add timestamp
      const responseToCache = networkResponse.clone();
      const responseWithTimestamp = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: {
          ...Object.fromEntries(responseToCache.headers.entries()),
          'sw-cached-time': Date.now().toString(),
          'cache-control': `public, max-age=${Math.floor(duration / 1000)}, immutable`
        }
      });
      
      cache.put(request, responseWithTimestamp);
    }
    return networkResponse;
  } catch (error) {
    // Return stale cache if network fails
    return cachedResponse || new Response('Network error', { status: 503 });
  }
}

// Enhanced Network First Strategy with TTL
async function enhancedNetworkFirst(request, cacheName, duration) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Clone response and add timestamp
      const responseToCache = networkResponse.clone();
      const responseWithTimestamp = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: {
          ...Object.fromEntries(responseToCache.headers.entries()),
          'sw-cached-time': Date.now().toString(),
          'cache-control': `public, max-age=${Math.floor(duration / 1000)}, immutable`
        }
      });
      
      cache.put(request, responseWithTimestamp);
    }
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for API requests
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({
          offline: true,
          message: 'Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    
    throw error;
  }
}

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync:', event.tag);
  
  if (event.tag === 'cart-sync') {
    event.waitUntil(syncOfflineCart());
  }
});

// Sync offline cart actions
async function syncOfflineCart() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const offlineActions = await cache.match('/offline-cart-actions');
    
    if (offlineActions) {
      const actions = await offlineActions.json();
      
      for (const action of actions) {
        try {
          await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action)
          });
        } catch (error) {
          console.log('Service Worker: Failed to sync cart action:', error);
        }
      }
      
      // Clear offline actions after sync
      await cache.delete('/offline-cart-actions');
    }
  } catch (error) {
    console.log('Service Worker: Cart sync failed:', error);
  }
}

// Push Notification
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification de Rif Raw Straw',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir les produits',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: 'Fermer'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Rif Raw Straw', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/products')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
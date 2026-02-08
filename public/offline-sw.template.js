// Offline Service Worker (TEMPLATE)
// This file is processed at build time to inject configuration values
// DO NOT edit the generated service worker directly - it is auto-generated
// Edit this template file instead
//
// Handles offline functionality, app shell caching, and dynamic content caching

// Cache configuration
const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// Resources to cache during install (app shell)
const APP_SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  // Next.js static assets will be added by the build script
];

// Maximum cache sizes (to prevent unlimited growth)
const MAX_DYNAMIC_CACHE_SIZE = 50;
const MAX_IMAGE_CACHE_SIZE = 30;

/**
 * Install Event
 * Caches app shell resources for offline availability
 */
self.addEventListener('install', (event) => {
  console.log('[offline-sw] Installing service worker...');

  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => {
        console.log('[offline-sw] Caching app shell');
        return cache.addAll(APP_SHELL_ASSETS);
      })
      .then(() => {
        console.log('[offline-sw] App shell cached successfully');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[offline-sw] Failed to cache app shell:', error);
      })
  );
});

/**
 * Activate Event
 * Cleans up old caches when a new service worker activates
 */
self.addEventListener('activate', (event) => {
  console.log('[offline-sw] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old version caches
            if (
              cacheName !== APP_SHELL_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== IMAGE_CACHE
            ) {
              console.log('[offline-sw] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[offline-sw] Service worker activated');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

/**
 * Fetch Event
 * Implements caching strategies based on request type
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests (except for same-origin API calls)
  if (url.origin !== self.location.origin) {
    // Allow Firebase API calls to pass through
    if (url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com')) {
      return;
    }
    return;
  }

  // Skip Chrome extensions and dev server requests
  if (url.protocol === 'chrome-extension:' || url.hostname === 'localhost' && url.port !== self.location.port) {
    return;
  }

  event.respondWith(handleFetch(request));
});

/**
 * Main fetch handler - routes requests to appropriate cache strategies
 */
async function handleFetch(request) {
  const url = new URL(request.url);

  // Strategy 1: App Shell (Cache First)
  // Navigation requests and app shell assets
  if (request.mode === 'navigate' || APP_SHELL_ASSETS.includes(url.pathname)) {
    return cacheFirst(APP_SHELL_CACHE, request);
  }

  // Strategy 2: Images (Cache First)
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/)) {
    return cacheFirst(IMAGE_CACHE, request, MAX_IMAGE_CACHE_SIZE);
  }

  // Strategy 3: Static Assets (Cache First)
  // JavaScript, CSS, fonts
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/)
  ) {
    return cacheFirst(DYNAMIC_CACHE, request);
  }

  // Strategy 4: API Requests (Network First)
  // Firestore, API calls, dynamic data
  if (
    url.pathname.startsWith('/api/') ||
    request.method !== 'GET'
  ) {
    return networkFirst(DYNAMIC_CACHE, request);
  }

  // Strategy 5: Everything Else (Stale While Revalidate)
  // Default strategy for other requests
  return staleWhileRevalidate(DYNAMIC_CACHE, request);
}

/**
 * Cache First Strategy
 * Check cache first, fall back to network if not found
 */
async function cacheFirst(cacheName, request, maxSize = null) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Limit cache size if specified
      if (maxSize) {
        await limitCacheSize(cacheName, maxSize);
      }
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[offline-sw] Cache first failed:', error);
    return new Response('Network error and no cached version available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Network First Strategy
 * Try network first, fall back to cache on failure
 */
async function networkFirst(cacheName, request) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      await limitCacheSize(cacheName, MAX_DYNAMIC_CACHE_SIZE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[offline-sw] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    return new Response('Network error and no cached version available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Stale While Revalidate Strategy
 * Return cached response immediately while updating in background
 */
async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch from network and update cache in background
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // Network error - ignore since we're returning cached response
    });

  // Return cached response immediately if available
  if (cached) {
    return cached;
  }

  // No cache - wait for network response
  try {
    const networkResponse = await fetchPromise;
    if (networkResponse) {
      return networkResponse;
    }

    return new Response('Network error and no cached version available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  } catch (error) {
    return new Response('Network error and no cached version available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxSize) {
    // Delete oldest entries (FIFO)
    const deleteCount = keys.length - maxSize;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}

/**
 * Message Event Handler
 * Handles messages from the main app (e.g., skip waiting, clear cache)
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[offline-sw] Received SKIP_WAITING message');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[offline-sw] Clearing all caches');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

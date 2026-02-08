/**
 * Service Worker Cache Strategies
 *
 * Reusable caching strategies for offline-first functionality.
 * These functions implement standard PWA cache patterns.
 */

export interface CacheStrategyOptions {
  cacheName: string;
  request: Request;
}

/**
 * Cache First Strategy
 *
 * Checks cache first, falls back to network if not found.
 * Best for: Static assets, images, fonts
 *
 * Flow:
 * 1. Check cache
 * 2. If found, return cached response
 * 3. If not found, fetch from network
 * 4. Cache the network response
 * 5. Return network response
 */
export async function cacheFirst({ cacheName, request }: CacheStrategyOptions): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);

    // Only cache successful responses
    if (networkResponse.ok) {
      // Clone response before caching (response can only be read once)
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed and no cache - return error response
    return new Response('Network error and no cached version available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Network First Strategy
 *
 * Tries network first, falls back to cache on failure.
 * Best for: API requests, dynamic content
 *
 * Flow:
 * 1. Try to fetch from network
 * 2. If successful, cache the response
 * 3. If network fails, check cache
 * 4. Return cached response or error
 */
export async function networkFirst({ cacheName, request }: CacheStrategyOptions): Promise<Response> {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Both network and cache failed
    return new Response('Network error and no cached version available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Stale While Revalidate Strategy
 *
 * Returns cached response immediately while updating cache in background.
 * Best for: Frequently updated content where stale data is acceptable
 *
 * Flow:
 * 1. Check cache
 * 2. If found, return cached response immediately
 * 3. Simultaneously fetch from network in background
 * 4. Update cache with fresh data for next request
 * 5. If no cache, fetch from network and cache
 */
export async function staleWhileRevalidate({ cacheName, request }: CacheStrategyOptions): Promise<Response> {
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
      // or will handle below if no cache exists
    });

  // If we have a cached response, return it immediately
  if (cached) {
    return cached;
  }

  // No cache - wait for network response
  try {
    const networkResponse = await fetchPromise;
    if (networkResponse) {
      return networkResponse;
    }

    // fetchPromise resolved to undefined (network error)
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
 * Cache with Expiration
 *
 * Helper function to check if a cached response is still fresh.
 * Can be used alongside any cache strategy to implement TTL.
 */
export function isCacheExpired(cachedResponse: Response, maxAgeSeconds: number): boolean {
  const cachedDate = cachedResponse.headers.get('date');
  if (!cachedDate) {
    return true;
  }

  const cachedTime = new Date(cachedDate).getTime();
  const now = Date.now();
  const age = (now - cachedTime) / 1000;

  return age > maxAgeSeconds;
}

/**
 * Cache with Network Fallback (with TTL)
 *
 * Cache first, but check expiration. If expired or not found, fetch from network.
 * Useful for data that should be refreshed periodically.
 */
export async function cacheFirstWithExpiration({
  cacheName,
  request,
  maxAgeSeconds = 3600, // 1 hour default
}: CacheStrategyOptions & { maxAgeSeconds?: number }): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Check if cache is fresh
  if (cached && !isCacheExpired(cached, maxAgeSeconds)) {
    return cached;
  }

  // Cache expired or not found - fetch from network
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed - return stale cache if available
    if (cached) {
      return cached;
    }

    return new Response('Network error and no cached version available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

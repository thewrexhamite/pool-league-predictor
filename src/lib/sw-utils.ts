/**
 * Service Worker utilities for cache management and SW lifecycle control
 */

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isControlling: boolean;
  hasUpdate: boolean;
}

export interface CacheStatus {
  cacheNames: string[];
  totalSize: number;
}

/**
 * Check if service workers are supported in the current browser
 */
export function isServiceWorkerSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator;
}

/**
 * Get the current service worker registration
 * Returns null if no service worker is registered
 */
export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get the current service worker status
 */
export async function getServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
  const status: ServiceWorkerStatus = {
    isSupported: isServiceWorkerSupported(),
    isRegistered: false,
    isControlling: false,
    hasUpdate: false,
  };

  if (!status.isSupported) {
    return status;
  }

  try {
    const registration = await getRegistration();
    status.isRegistered = !!registration;
    status.isControlling = !!navigator.serviceWorker.controller;
    status.hasUpdate = !!(registration?.waiting || registration?.installing);
  } catch (error) {
    // Return default status on error
  }

  return status;
}

/**
 * Send skip waiting message to the service worker
 * This activates a waiting service worker immediately
 */
export async function skipWaiting(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await getRegistration();
    if (!registration?.waiting) {
      return false;
    }

    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Clear all caches managed by the service worker
 * Returns true if successful
 */
export async function clearAllCaches(): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Clear a specific cache by name
 * Returns true if the cache was found and deleted
 */
export async function clearCache(cacheName: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return false;
  }

  try {
    return await caches.delete(cacheName);
  } catch (error) {
    return false;
  }
}

/**
 * Send a message to the service worker to clear its caches
 * This triggers the SW's cache clearing logic
 */
export async function requestCacheClear(): Promise<boolean> {
  if (!isServiceWorkerSupported() || !navigator.serviceWorker.controller) {
    return false;
  }

  try {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check for service worker updates
 * Forces the service worker to check for updates from the server
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await getRegistration();
    if (!registration) {
      return false;
    }

    await registration.update();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get information about all caches
 * Returns cache names and approximate total size
 */
export async function getCacheStatus(): Promise<CacheStatus | null> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return null;
  }

  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();

      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return {
      cacheNames,
      totalSize,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Unregister the service worker
 * Returns true if a service worker was unregistered
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await getRegistration();
    if (!registration) {
      return false;
    }

    return await registration.unregister();
  } catch (error) {
    return false;
  }
}

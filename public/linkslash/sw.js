/**
 * LinkSlash Service Worker
 * Provides offline support by caching the app shell.
 */

const CACHE_NAME = 'linkslash-cache-v1';
const BASE = '/linkslash';
const PRECACHE_ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/icon16.png`,
  `${BASE}/icon48.png`,
  `${BASE}/icon96.png`,
  `${BASE}/icon128.png`,
  `${BASE}/icon192.png`,
  `${BASE}/icon512.png`,
  `${BASE}/screenshot1.png`,
  `${BASE}/screenshot2.png`,
  `${BASE}/css/style.css`,
  `${BASE}/js/utils.js`,
  `${BASE}/js/db.js`,
  `${BASE}/js/parser.js`,
  `${BASE}/js/ai.js`,
  `${BASE}/js/ui.js`,
  `${BASE}/js/app.js`,
  `${BASE}/js/config.js`,
];

// Install: precache core app shell
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    }).catch(function(err) {
      console.warn('[LinkSlash SW] Precache failed:', err);
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(name) {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', function(event) {
  var request = event.request;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip browser extensions and external URLs
  var url = new URL(request.url);
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Only handle LinkSlash scope
  if (!url.pathname.startsWith(BASE)) {
    return;
  }

  event.respondWith(
    caches.match(request).then(function(cachedResponse) {
      if (cachedResponse) {
        // Stale-while-revalidate: return cached version, then update in background
        var fetchPromise = fetch(request).then(function(networkResponse) {
          if (networkResponse && networkResponse.ok) {
            var responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        }).catch(function() {
          // Network failed, cached version is already returned
        });

        // For navigations (HTML), prefer network to get latest app
        if (request.mode === 'navigate') {
          return fetchPromise.catch(function() {
            return cachedResponse;
          });
        }

        return cachedResponse;
      }

      // Not in cache: fetch and cache
      return fetch(request).then(function(networkResponse) {
        if (!networkResponse || !networkResponse.ok || networkResponse.type === 'opaque') {
          return networkResponse;
        }
        var responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(request, responseClone);
        });
        return networkResponse;
      }).catch(function(err) {
        console.warn('[LinkSlash SW] Fetch failed:', request.url, err);
        // For navigations, return cached index.html if available
        if (request.mode === 'navigate') {
          return caches.match(`${BASE}/index.html`);
        }
        throw err;
      });
    })
  );
});

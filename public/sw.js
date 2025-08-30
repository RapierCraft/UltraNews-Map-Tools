// Enhanced Service Worker for Hybrid Vector Tile Caching
const CACHE_NAME = 'ultramaps-v2';
const VECTOR_TILE_CACHE = 'ultramaps-vector-v2';
const BUILDINGS_CACHE_NAME = 'osm-buildings-v1';
const STATIC_CACHE = 'ultramaps-static-v1';

// Cache strategies for different types of requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Handle vector-hybrid tile requests with intelligent caching
  if (url.pathname.includes('vector-hybrid') || url.pathname.includes('.mvt')) {
    event.respondWith(handleVectorTileRequest(event.request));
    return;
  }
  
  // Handle regular tile requests with cache-first strategy
  if (url.pathname.includes('/api/v1/tiles/') || url.pathname.includes('/tiles/')) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            return response;
          }
          
          return fetch(event.request).then(fetchResponse => {
            if (fetchResponse.ok) {
              const responseToCache = fetchResponse.clone();
              cache.put(event.request, responseToCache);
            }
            return fetchResponse;
          }).catch(() => {
            // Return empty tile on failure
            return new Response(new ArrayBuffer(0), {
              headers: { 'Content-Type': 'image/png' }
            });
          });
        });
      })
    );
    return;
  }

// Enhanced vector tile caching with compression awareness
async function handleVectorTileRequest(request) {
  const cache = await caches.open(VECTOR_TILE_CACHE);
  
  try {
    // Check cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // Add cache hit header for debugging
      const response = cachedResponse.clone();
      response.headers.set('X-Cache', 'HIT');
      return response;
    }
    
    // Fetch from network with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(request, { 
      signal: controller.signal,
      headers: {
        'Accept-Encoding': 'gzip, deflate'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      // Cache successful responses for 7 days
      const responseToCache = response.clone();
      responseToCache.headers.set('Cache-Control', 'public, max-age=604800');
      await cache.put(request, responseToCache);
      
      // Intelligent cache cleanup based on tile zoom level
      await cleanupVectorCache(cache, request);
      
      // Add cache miss header
      response.headers.set('X-Cache', 'MISS');
      return response;
    }
    
    return response;
  } catch (error) {
    console.warn('Vector tile request failed:', error);
    
    // Try to return cached version even if expired
    const staleResponse = await cache.match(request);
    if (staleResponse) {
      staleResponse.headers.set('X-Cache', 'STALE');
      return staleResponse;
    }
    
    // Return empty protobuf tile
    return new Response(new ArrayBuffer(0), {
      headers: { 
        'Content-Type': 'application/x-protobuf',
        'X-Cache': 'EMPTY'
      }
    });
  }
}
  
  // Handle building data requests with cache-first strategy
  if (url.pathname.includes('/api/v1/buildings/') || url.pathname.includes('/buildings/')) {
    event.respondWith(
      caches.open(BUILDINGS_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            return response;
          }
          
          return fetch(event.request).then(fetchResponse => {
            if (fetchResponse.ok) {
              const responseToCache = fetchResponse.clone();
              cache.put(event.request, responseToCache);
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }
  
  // Handle Cesium asset requests
  if (url.pathname.includes('/cesium/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          return response || fetch(event.request).then(fetchResponse => {
            if (fetchResponse.ok) {
              cache.put(event.request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }
});

// Clean up old caches on activation
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== TILE_CACHE_NAME && cacheName !== BUILDINGS_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Install event
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Periodic cache cleanup
setInterval(() => {
  caches.open(TILE_CACHE_NAME).then(cache => {
    cache.keys().then(keys => {
      // Keep only the 1000 most recent tiles
      if (keys.length > 1000) {
        const keysToDelete = keys.slice(0, keys.length - 1000);
        keysToDelete.forEach(key => cache.delete(key));
        // Silent cleanup
      }
    });
  });
}, 5 * 60 * 1000); // Every 5 minutes
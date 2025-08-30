const CACHE_NAME = 'bookfoldar-v1.0.0';
const STATIC_CACHE = 'bookfoldar-static-v1.0.0';
const DYNAMIC_CACHE = 'bookfoldar-dynamic-v1.0.0';

// Files to cache immediately (critical resources)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/glassmorphism.css',
  '/index.tsx',
  '/App.tsx',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Files to cache on demand (components, hooks, etc.)
const CACHE_ON_DEMAND = [
  '/components/',
  '/hooks/',
  '/types.ts'
];

// Network-first resources (always try network first)
const NETWORK_FIRST = [
  '/api/',
  '.pdf'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('💾 Service Worker: Install event');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.warn('⚠️ Failed to cache some static assets:', error);
          // Continue even if some assets fail to cache
          return Promise.resolve();
        });
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activate event');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName.startsWith('bookfoldar-')) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle different types of requests with appropriate strategies
  if (isStaticAsset(request.url)) {
    // Static assets: Cache first with network fallback
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else if (isNetworkFirst(request.url)) {
    // API calls, PDFs: Network first with cache fallback
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
  } else if (isCameraOrMedia(request.url)) {
    // Camera/media requests: Network only (cannot cache)
    event.respondWith(networkOnlyStrategy(request));
  } else {
    // Everything else: Stale while revalidate
    event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE));
  }
});

// Cache first strategy - for static assets
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('💾 Serving from cache:', request.url);
      return cachedResponse;
    }
    
    console.log('🌐 Fetching from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('❌ Cache first strategy failed:', error);
    return new Response('Offline - Resource unavailable', { 
      status: 503,
      statusText: 'Service Unavailable' 
    });
  }
}

// Network first strategy - for dynamic content
async function networkFirstStrategy(request, cacheName) {
  try {
    console.log('🌐 Network first for:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('💾 Network failed, trying cache for:', request.url);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline - Network unavailable', { 
      status: 503,
      statusText: 'Service Unavailable' 
    });
  }
}

// Network only strategy - for camera/media
async function networkOnlyStrategy(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.error('❌ Network only request failed:', request.url, error);
    throw error;
  }
}

// Stale while revalidate strategy - for most content
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch in the background regardless of cache hit
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.warn('🌐 Background fetch failed:', request.url, error);
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    console.log('💾 Serving stale content for:', request.url);
    return cachedResponse;
  }
  
  // Wait for network if no cache
  console.log('🌐 No cache, waiting for network:', request.url);
  return fetchPromise;
}

// Helper functions to categorize requests
function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.includes(asset)) ||
         url.includes('.css') ||
         url.includes('.js') ||
         url.includes('.tsx') ||
         url.includes('.png') ||
         url.includes('.jpg') ||
         url.includes('.svg') ||
         url.includes('.ico');
}

function isNetworkFirst(url) {
  return NETWORK_FIRST.some(pattern => url.includes(pattern)) ||
         url.includes('/api/') ||
         url.includes('.pdf');
}

function isCameraOrMedia(url) {
  return url.includes('mediaDevices') ||
         url.includes('getUserMedia') ||
         url.includes('blob:') ||
         url.includes('data:image') ||
         url.includes('stream');
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'background-calibration') {
    event.waitUntil(handleBackgroundCalibration());
  }
});

async function handleBackgroundCalibration() {
  // Handle any pending calibration data when back online
  try {
    const calibrationData = await getStoredCalibrationData();
    if (calibrationData) {
      console.log('📐 Processing background calibration');
      // Process stored calibration data
    }
  } catch (error) {
    console.error('❌ Background calibration failed:', error);
  }
}

async function getStoredCalibrationData() {
  // This would integrate with IndexedDB or similar storage
  // For now, return null as we're not implementing full offline storage
  return null;
}

// Push notification handling (for future enhancement)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'BookfoldAR notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 'bookfold-notification'
    },
    actions: [
      {
        action: 'open-app',
        title: 'Open BookfoldAR',
        icon: '/icons/camera-shortcut.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('BookfoldAR', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open-app') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('💥 Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Service Worker unhandled rejection:', event.reason);
  event.preventDefault();
});
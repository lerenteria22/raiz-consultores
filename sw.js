// IMPORTANTE: Incrementa la versión (v2 -> v3 -> v4) cada vez que subas cambios a GitHub
const CACHE_NAME = 'edan-salud-v3';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/dexie@latest/dist/dexie.js'
];

// Instalación: Descarga la versión nueva sin forzar el reinicio inmediato
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activación: Elimina la caché de interfaz vieja al recibir la orden
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Escucha la instrucción de activación inmediata desde la notificación flotante
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Estrategia Stale-While-Revalidate (Apertura instantánea + descarga silenciosa)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

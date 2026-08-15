// Nombre y versión de la caché (Cambiar versión si actualizas el HTML en el futuro)
const CACHE_NAME = 'edan-salud-cache-v1';

// Archivos vitales que se guardarán en el celular para funcionar sin internet
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/dexie@latest/dist/dexie.js'
];

// 1. INSTALACIÓN: Descarga la app al celular la primera vez que se visita con internet
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caché EDAN instalada correctamente');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 2. ACTIVACIÓN: Borra cachés antiguos si llegas a actualizar la app
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. INTERCEPTACIÓN DE RED (FETCH): Estrategia "Caché-First" (Ideal para zonas sin señal)
self.addEventListener('fetch', event => {
  // Ignoramos las peticiones de subida de datos (POST) para que las maneje Dexie.js
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el archivo ya está en el celular (Caché), lo entregamos instantáneamente
        if (response) {
          return response;
        }
        // Si no está, lo buscamos en internet y lo guardamos
        return fetch(event.request).then(
          function (networkResponse) {
            // Verificar si es una respuesta válida
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            // Clonamos la respuesta para guardarla en la caché
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(function (cache) {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        ).catch(() => {
          // Si no hay red y no está en caché (Fallback general para no crashear)
          console.log('Modo offline total activado para:', event.request.url);
        });
      })
  );
});
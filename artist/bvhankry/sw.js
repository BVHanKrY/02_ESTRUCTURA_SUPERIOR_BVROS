/*
 * BVros Service Worker — modo red solamente.
 *
 * Decisión de esta etapa:
 * - No crea Cache Storage.
 * - No guarda audio, imágenes, HTML, CSS, JavaScript ni respuestas de API.
 * - No intercepta descargas ni reproducciones.
 * - Mantiene un service worker válido y actualizable para la PWA.
 */
const BVROS_SW_VERSION = 'bvros-network-only-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Borra cachés antiguos creados por versiones anteriores del proyecto.
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', () => {
  // Intencionalmente vacío: el navegador usa la red y su caché HTTP normal.
  // No se usa event.respondWith(), por lo que este worker no almacena contenido.
});

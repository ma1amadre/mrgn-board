/* Service worker: оболочка приложения работает офлайн, ассеты с хешами кешируются навсегда.
 * Данные (Supabase) не трогаем — они на другом origin и всегда идут в сеть. */
const CACHE = 'mrgn-board-v1';
// Базовый путь берётся из места, где лежит sw.js: локально «/», на Pages «/mrgn-board/».
const SHELL = new URL('./', self.location.href).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Хешированные ассеты неизменяемы: сначала кеш, сеть только для новых файлов.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  // Переходы: сеть, при обрыве — сохранённая оболочка (SPA сама разберёт адрес).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put(SHELL, response.clone()));
          return response;
        })
        .catch(() => caches.match(SHELL)),
    );
  }
});

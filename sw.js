/* Service Worker — Calculadora de Ração (WF Tecnology)
   Estratégia:
   - App shell (index, manifest, ícones): cache primeiro, atualiza em segundo plano
   - CDN (fontes, Chart.js, Firebase JS): cache com revalidação
   - Firebase Realtime Database: SEMPRE rede (nunca cachear dados)
*/
const CACHE = 'racao-v6-2';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Dados do Firebase: nunca cachear (sempre rede)
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('firebasedatabase')) return;

  // Navegação (abrir o app): rede primeiro, cai para o cache se offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Demais recursos (fontes, CDN, ícones): cache primeiro, atualiza por trás
  e.respondWith(
    caches.match(e.request).then(cached => {
      const rede = fetch(e.request)
        .then(res => {
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || rede;
    })
  );
});

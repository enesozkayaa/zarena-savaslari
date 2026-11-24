// =============================================================
// Zarena Savaşları - servis çalışanı (ana ekrana ekleme + çevrimdışı kopya)
// Oyunu güncelleyip yüklerken ONBELLEK numarasını 1 artır (oyun.js SURUM ile aynı).
// =============================================================

const ONBELLEK = 'zarena-savaslari-v12';
const DOSYALAR = [
  './', 'index.html', 'style.css', 'esyalar.js', 'motor.js', 'insan.js', 'masa.js', 'sahne.js', 'ag.js', 'ses.js', 'oyun.js',
  'manifest.webmanifest', 'ikonlar/ikon-192.png', 'ikonlar/ikon-512.png',
];

self.addEventListener('install', olay => {
  olay.waitUntil(caches.open(ONBELLEK).then(o => o.addAll(DOSYALAR.map(d => new Request(d, { cache: 'reload' })))));
  self.skipWaiting();
});
self.addEventListener('activate', olay => {
  olay.waitUntil(caches.keys().then(adlar => Promise.all(adlar.filter(a => a.startsWith('zarena-savaslari-') && a !== ONBELLEK).map(a => caches.delete(a)))));
  self.clients.claim();
});
// Önce internet (en yeni sürüm), olmazsa kayıtlı kopya
self.addEventListener('fetch', olay => {
  if (olay.request.method !== 'GET') return;
  const url = new URL(olay.request.url), kapsam = new URL(self.registration.scope);
  const ayniSite = url.origin === kapsam.origin && url.pathname.startsWith(kapsam.pathname);
  olay.respondWith(
    (ayniSite ? fetch(olay.request.url, { cache: 'no-cache' }) : fetch(olay.request))
      .then(cevap => { if (cevap.ok && ayniSite) { const k = cevap.clone(); caches.open(ONBELLEK).then(o => o.put(olay.request, k)); } return cevap; })
      .catch(() => caches.match(olay.request)),
  );
});

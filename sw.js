// Service worker: permite instalar A Juegar como app en el celu y abrirla sin conexión.
//  - Páginas y código: primero la red (así siempre llega la versión nueva); sin conexión, lo guardado.
//  - Imágenes, fuentes y el SDK de Firebase: primero lo guardado (no cambian).
//  - La base de datos de Firebase no pasa por acá (para jugar online hace falta internet).
const CACHE = 'a-juegar-v1';
const BASICOS = ['./', 'index.html', 'shared/estilo.css', 'shared/salas.js', 'shared/efectos.js', 'shared/chat.js',
                 'shared/juegos.js', 'shared/iconos.js', 'shared/firebase.js', 'icono.svg', 'manifest.webmanifest'];

self.addEventListener('install', ev => {
  self.skipWaiting();
  ev.waitUntil(caches.open(CACHE).then(c => Promise.all(BASICOS.map(u => c.add(u).catch(() => {})))));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const guardar = (req, res) => {
  if (res && res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
  return res;
};
const primeroRed = req => fetch(req).then(res => guardar(req, res)).catch(() => caches.match(req, {ignoreSearch: true}));
const primeroGuardado = req => caches.match(req).then(r => r || fetch(req).then(res => guardar(req, res)));

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    ev.respondWith(/\.(png|jpe?g|webp|svg)$/i.test(url.pathname) ? primeroGuardado(req) : primeroRed(req));
  } else if (/^(fonts\.(googleapis|gstatic)\.com|www\.gstatic\.com)$/.test(url.hostname)) {
    ev.respondWith(primeroGuardado(req));   // fuentes y SDK de Firebase (la URL trae la versión)
  }
});

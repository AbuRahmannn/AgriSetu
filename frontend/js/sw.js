const CACHE = 'agrisetu-v1';
const urls = ['/', '/index.html', '/crop.html', '/disease.html', '/chatbot.html', '/map.html', '/forum.html'];
self.addEventListener('install', ev=>{ ev.waitUntil(caches.open(CACHE).then(c=>c.addAll(urls))); });
self.addEventListener('fetch', ev=>{ ev.respondWith(caches.match(ev.request).then(r=>r||fetch(ev.request))); });

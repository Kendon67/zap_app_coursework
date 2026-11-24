const cacheName = 'zap_pwa_v1';
const cacheFiles = [
    './',
    './index.html',
    './index.css',
    './index.js',
    './manifest.webmanifest'
];

// install sw & cache content
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(cacheName).then((cache) => {
            return cache.addAll(cacheFiles);
        })
    );
});

// serve cache content
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
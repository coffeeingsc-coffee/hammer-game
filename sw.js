// Service Worker for Hammer vs Water Cooler PWA
const CACHE_NAME = 'hammer-vs-cooler-v1';

const ASSETS_TO_CACHE = [
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://vtelpopqybfytrgzkomj.supabase.co/storage/v1/object/public/game-assets/public/f973aa4a-b4d3-4deb-a18a-8ac275edda9d/82c00055-2cbc-40d1-a4e3-fec3ea10ff7e/f99b548e-3d11-4ef7-a7aa-572f6e1ef0bb.png',
  'https://vtelpopqybfytrgzkomj.supabase.co/storage/v1/object/public/game-assets/public/f973aa4a-b4d3-4deb-a18a-8ac275edda9d/82c00055-2cbc-40d1-a4e3-fec3ea10ff7e/a22d3019-953f-40d4-a5cf-82f8cf2354f2.png',
  'https://vtelpopqybfytrgzkomj.supabase.co/storage/v1/object/public/game-assets/public/f973aa4a-b4d3-4deb-a18a-8ac275edda9d/82c00055-2cbc-40d1-a4e3-fec3ea10ff7e/b86c1aac-1714-4c8a-bbd2-57d41fd35d84.mp3',
  'https://vtelpopqybfytrgzkomj.supabase.co/storage/v1/object/public/game-assets/public/f973aa4a-b4d3-4deb-a18a-8ac275edda9d/82c00055-2cbc-40d1-a4e3-fec3ea10ff7e/fd557e8f-9096-4678-821e-4f00cb2748d9.mp3',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => cached);
    })
  );
});

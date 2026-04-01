const VERSION = 'bobatracker-v1';
const STATIC_CACHE = `${VERSION}-static`;
const DATA_CACHE = `${VERSION}-data`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.svg',
];

// 安裝：預先快取靜態資源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 啟動：清除舊版快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('bobatracker-') && key !== STATIC_CACHE && key !== DATA_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch 策略
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // data.json → Network First（優先抓新資料，失敗用快取）
  if (url.pathname.endsWith('data.json')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(DATA_CACHE).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 外部圖片（FB CDN）→ 不快取，直接 fetch，失敗不處理
  if (url.hostname.includes('fbcdn.net') || url.hostname.includes('facebook.com')) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 408 })));
    return;
  }

  // 靜態資源 → Cache First（秒開，背景更新）
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(res => {
        caches.open(STATIC_CACHE).then(cache => cache.put(event.request, res.clone()));
        return res;
      });
      return cached || fetchPromise;
    })
  );
});

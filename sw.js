// オフラインでも開けるよう、静的ファイルとデータをキャッシュする。
// データ更新時は VERSION を上げる。
const VERSION = "v2026-09-24-3d";
const FILES = [
  "./",
  "index.html",
  "assets/style.css",
  "assets/app.js",
  "assets/calc.js",
  "assets/tiles.js",
  "assets/share.js",
  "assets/map3d.js",
  "assets/vendor/three.min.js",
  "data/prefectures.geojson",
  "data/data.json",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 自サイトのファイルはネット優先、つながらなければキャッシュを返す
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});

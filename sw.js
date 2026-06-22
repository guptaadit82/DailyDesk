const CACHE_NAME = "daily-desk-cache-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./style.css?v=mobile2",
  "./app.js",
  "./js/config.js",
  "./js/main.js",
  "./js/main.js?v=mobile2",
  "./js/store.js",
  "./js/subjects.js",
  "./js/utils.js",
  "./js/views.js",
  "./js/views.js?v=mobile2",
  "./vocab.json",
  "./manifest.json",
  "./icons/favicon.ico",
  "./icons/logo.svg",
  "./icons/icon-16.png",
  "./icons/icon-32.png",
  "./data/data.json",
  "./data/gk-data.json",
  "./data/phrase-connectors.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if(request.method !== "GET") return;

  const acceptsHtml = request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
  if(acceptsHtml){
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const fetched = fetch(request).then(response => {
        if(response && response.status === 200 && response.type === "basic"){
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached || caches.match("./index.html"));
      return cached || fetched;
    })
  );
});

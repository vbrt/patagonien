// Service Worker: hält die Seite selbst offline verfügbar (Posts/Fotos kommen immer frisch aus der Datenbank)
const V = "patagonien-v9";
const ASSETS = ["./", "index.html", "cockpit.html", "style.css?v=9", "app.js?v=9", "data.js?v=9", "config.js?v=9", "cockpit.js?v=9", "cockpit-flags.js", "vendor/supabase.js?v=2.45.4", "vendor/591.supabase.js", "img/hero.jpg", "img/cockpit-hero.jpg", "img/felix.jpg", "img/victor.jpg", "img/icon-192.png", "img/icon-512.png", "img/apple-touch-icon.png", "manifest-cockpit.webmanifest", "manifest-blog.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if(e.request.method !== "GET" || u.origin !== location.origin) return;
  // Netz zuerst, bei Funkloch aus dem Speicher
  e.respondWith(fetch(e.request).then(r => { if(r.ok){ const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; }).catch(() => caches.match(e.request, {ignoreSearch: false}).then(m => m || caches.match("./"))));
});

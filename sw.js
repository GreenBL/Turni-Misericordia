// Service worker minimo: rende il sito installabile e tiene in cache il "guscio" della pagina.
// Le chiamate ad Apps Script (altro dominio) non vengono mai toccate: i turni sono sempre quelli veri.
const CACHE = "turni-v1";
const FILE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(FILE.map((f) => c.add(f).catch(() => {})))) // un file mancante non blocca l'installazione
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // Apps Script, font ecc.: rete normale

  if (req.mode === "navigate") {
    // Pagina: prima la rete, così gli aggiornamenti arrivano subito; la cache serve solo senza connessione
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copia)); }
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Icone e file statici: dalla cache, aggiornati in secondo piano
  e.respondWith(
    caches.match(req).then((inCache) => {
      const rete = fetch(req)
        .then((res) => {
          if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
          return res;
        })
        .catch(() => inCache);
      return inCache || rete;
    })
  );
});

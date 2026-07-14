const CACHE_NAME = "field-assist-v1";
const TILE_CACHE_NAME = "field-assist-tiles-v1";
const MAX_TILE_ENTRIES = 500; // ~50MB of 256x256 tiles

const STATIC_ASSETS = [
  "/",
  "/projects",
  "/gear",
  "/checklists",
  "/map",
  "/manifest.json",
];

// ─── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== TILE_CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (!request.url.startsWith("http")) return;

  // OSM / tile server — cache-first with size limit
  if (
    request.url.includes("//tile.openstreetmap.org/") ||
    request.url.includes("//a.tile.openstreetmap.org/") ||
    request.url.includes("//b.tile.openstreetmap.org/") ||
    request.url.includes("//c.tile.openstreetmap.org/")
  ) {
    event.respondWith(cacheFirstTile(request));
    return;
  }

  // Navigation — network-first, cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((c) => c || caches.match("/"))
        )
    );
    return;
  }

  // Static assets — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchP = fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      });
      return cached || fetchP;
    })
  );
});

// ─── Tile cache-first with LRU eviction ────────────────────────────────────────
async function cacheFirstTile(request) {
  const cache = await caches.open(TILE_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    if (!res.ok) return res;

    // Evict oldest entries if over limit
    const keys = await cache.keys();
    if (keys.length >= MAX_TILE_ENTRIES) {
      const toDelete = keys.slice(0, 50);
      await Promise.all(toDelete.map((k) => cache.delete(k)));
    }

    cache.put(request, res.clone());
    return res;
  } catch {
    // Offline with no tile — return transparent 1x1
    return new Response("", { status: 200 });
  }
}

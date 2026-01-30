const CACHE_NAME = "app-cache-v1.3"; // Increment to force cache clear
const RUNTIME_CACHE = "runtime-cache";
const DB_NAME = "offline-db";
const STORE = "outbox";

// Critical files that should ALWAYS be fetched from network first
const NETWORK_FIRST = [
  '/index.html',
  '/main.js',
  '/polyfills.js',
  '/runtime.js',
  '/styles.css'
];

// Patterns for files that should use network-first
const NETWORK_FIRST_PATTERNS = [
  /\.js$/,           // All JavaScript files
  /\.css$/,          // All CSS files
  /index\.html$/,    // index.html
  /main\./,          // main.*.js
  /runtime\./,       // runtime.*.js
  /polyfills\./,     // polyfills.*.js
  /vendor\./,        // vendor.*.js
  /\.bundle\./,      // Any bundle files
  /\d+\.[a-f0-9]+\.js$/, // Hash-based chunks like 298.f2ee012.js
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  
  if (req.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // API requests - network first with cache fallback
  if (url.pathname.startsWith("/api")) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        })
    );
    return;
  }

  // App shell - ALWAYS network first
  const isAppShell = NETWORK_FIRST.some(path => 
    url.pathname === path || url.pathname.endsWith(path)
  ) || NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname));

  if (isAppShell) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          return caches.match(req);
        })
    );
    return;
  }

  // Other resources - cache first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Return cached, update in background
        fetch(req).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, response);
            });
          }
        }).catch(() => {});
        return cached;
      }

      return fetch(req).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseClone);
          });
        }
        return response;
      });
    })
  );
});

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function replayOutbox() {
  try {
    const db = await openDb();

    const items = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!items.length) return;

    const successfullySyncedIds = [];

    for (const item of items) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: JSON.stringify(item.body),
        });
        if (!res.ok) break;
        successfullySyncedIds.push(item.id);
      } catch (e) {
        break;
      }
    }

    if (successfullySyncedIds.length) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        successfullySyncedIds.forEach((id) => store.delete(id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  } catch (error) {}
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "REPLAY_OUTBOX") {
    event.waitUntil(replayOutbox());
  }
  
  if (event.data?.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-outbox") {
    event.waitUntil(replayOutbox());
  }
});
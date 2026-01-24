self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  if (url.pathname.startsWith("/api")) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches
              .open("runtime-cache")
              .then((cache) => {
                cache.put(req, responseClone);
              })
              .catch((err) => {});
          }

          return response;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) {
            return cached;
          }
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }),
    );
    return;
  }

  event.respondWith(
    caches.open("runtime-cache").then((cache) =>
      cache.match(req).then((cached) => {
        if (cached) return cached;

        return fetch(req)
          .then((response) => {
            if (response.ok) {
              cache.put(req, response.clone());
            }
            return response;
          })
          .catch((err) => {
            throw err;
          });
      }),
    ),
  );
});

const DB_NAME = "offline-db";
const STORE = "outbox";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
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

        if (!res.ok) {
          break;
        }

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

        tx.oncomplete = () => {
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    }
  } catch (error) {}
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "REPLAY_OUTBOX") {
    event.waitUntil(replayOutbox());
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-outbox") {
    event.waitUntil(replayOutbox());
  }
});
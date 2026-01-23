/* custom-service-worker.js */

/* ---------- INSTALL ---------- */
self.addEventListener('install', event => {
  self.skipWaiting();
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

/* ---------- FETCH (offline reads, safe) ---------- */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open('runtime-cache').then(cache =>
      cache.match(event.request).then(cached => {
        if (cached) return cached;

        return fetch(event.request)
          .then(response => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cached);
      })
    )
  );
});

/* ---------- INDEXED DB (OUTBOX) ---------- */
const DB_NAME = 'offline-db';
const STORE = 'outbox';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ---------- REPLAY LOGIC ---------- */
async function replayOutbox() {

  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);

  const items = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  for (const item of items) {
    try {

      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: JSON.stringify(item.body)
      });

      if (res.ok) {
        store.delete(item.id);
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: "SYNC_SUCCESS",
            payload: {
              id: item.id,
              entity: "expense",
            },
          });
        });
      } else {
        return;
      }
    } catch (e) {
      return;
    }
  }
}


/* ---------- MESSAGE TRIGGER ---------- */
self.addEventListener('message', event => {
  if (event.data?.type === 'REPLAY_OUTBOX') {
    event.waitUntil(replayOutbox());
  }
});

/* ---------- SYNC TRIGGER ---------- */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-outbox') {
    event.waitUntil(replayOutbox());
  }
});

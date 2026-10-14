import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';

// Gives every write request an Idempotency-Key. Sending the same request again (a retry after a
// timeout, a double click, an offline replay) reuses the key, so the server applies it only once.
// The key is released when the server confirms success; a new, identical request after that is a
// genuinely new action (e.g. two equal expenses) and gets a new key.
const HEADER = 'Idempotency-Key';
const WRITE_METHODS = ['POST', 'PUT', 'DELETE'];
const KEY_TTL_MS = 10 * 60 * 1000;

const pendingKeys = new Map<string, { key: string; expiresAt: number }>();

function keyFor(fingerprint: string): string {
  const now = Date.now();
  for (const [fp, entry] of pendingKeys) {
    if (entry.expiresAt < now) pendingKeys.delete(fp);
  }

  let entry = pendingKeys.get(fingerprint);
  if (!entry) {
    entry = { key: crypto.randomUUID(), expiresAt: now + KEY_TTL_MS };
    pendingKeys.set(fingerprint, entry);
  }
  return entry.key;
}

export const idempotencyInterceptor: HttpInterceptorFn = (req, next) => {
  const applies =
    WRITE_METHODS.includes(req.method) &&
    !req.headers.has(HEADER) &&
    !(req.body instanceof FormData) &&
    !req.url.includes('/api/Auth/'); // auth calls carry credentials and are not idempotency-aware

  if (!applies) {
    return next(req);
  }

  const fingerprint = `${req.method} ${req.urlWithParams} ${JSON.stringify(req.body ?? null)}`;

  return next(req.clone({ setHeaders: { [HEADER]: keyFor(fingerprint) } })).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        pendingKeys.delete(fingerprint);
      }
    })
  );
};

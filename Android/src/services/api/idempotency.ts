import type { InternalAxiosRequestConfig } from "axios";

// Gives every write request an Idempotency-Key. Sending the same request again (a retry after a
// timeout or a lost connection, a double tap) reuses the key, so the server applies it only once.
// The key is released when the server confirms success; a new, identical request after that is a
// genuinely new action (e.g. two equal expenses) and gets a new key.
const HEADER = "Idempotency-Key";
const WRITE_METHODS = ["post", "put", "delete"];
const KEY_TTL_MS = 10 * 60 * 1000;

type KeyedConfig = InternalAxiosRequestConfig & { _idempotencyFingerprint?: string };

const pendingKeys = new Map<string, { key: string; expiresAt: number }>();

function newKey(): string {
  const random = () => Math.random().toString(36).slice(2, 12);
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${random()}${random()}`;
}

function keyFor(fingerprint: string): string {
  const now = Date.now();
  for (const [fp, entry] of pendingKeys) {
    if (entry.expiresAt < now) pendingKeys.delete(fp);
  }

  let entry = pendingKeys.get(fingerprint);
  if (!entry) {
    entry = { key: newKey(), expiresAt: now + KEY_TTL_MS };
    pendingKeys.set(fingerprint, entry);
  }
  return entry.key;
}

/** Request interceptor step: adds the header (kept on the config, so token-refresh retries reuse it). */
export function attachIdempotencyKey(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (
    !WRITE_METHODS.includes(method) ||
    config.headers?.has(HEADER) ||
    url.includes("/api/Auth/") // auth calls carry credentials and are not idempotency-aware
  ) {
    return config;
  }

  const fingerprint = `${method} ${url} ${JSON.stringify(config.params ?? null)} ${JSON.stringify(config.data ?? null)}`;
  config.headers.set(HEADER, keyFor(fingerprint));
  (config as KeyedConfig)._idempotencyFingerprint = fingerprint;
  return config;
}

/** Response interceptor step: the server applied the request, so the next identical one is new. */
export function releaseIdempotencyKey(config: InternalAxiosRequestConfig | undefined): void {
  const fingerprint = (config as KeyedConfig | undefined)?._idempotencyFingerprint;
  if (fingerprint) pendingKeys.delete(fingerprint);
}

// Thin wrapper around Cloudflare KV — replaces the Redis cache layer in the
// legacy .NET stack. All cached values are JSON-encoded.
// KVNamespace is provided as a global via `@cloudflare/workers-types` in tsconfig types.

export type CacheOptions = {
  /** TTL in seconds. Cloudflare KV minimum is 60. */
  ttlSeconds?: number;
};

export async function cacheGet<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(kv: KVNamespace, key: string, value: T, options: CacheOptions = {}) {
  const ttl = options.ttlSeconds ?? 300;
  await kv.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, ttl) });
}

export async function cacheDelete(kv: KVNamespace, key: string) {
  await kv.delete(key);
}

/**
 * cacheOrCompute — common get-or-compute pattern.
 * On a hit, returns the cached value; on a miss, runs `compute()`,
 * stores the result, and returns it.
 */
export async function cacheOrCompute<T>(
  kv: KVNamespace,
  key: string,
  compute: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const hit = await cacheGet<T>(kv, key);
  if (hit !== null) return hit;

  const value = await compute();
  await cacheSet(kv, key, value, options);
  return value;
}

/** Invalidate every key under a prefix. KV supports list+delete. */
export async function cacheInvalidatePrefix(kv: KVNamespace, prefix: string) {
  let cursor: string | undefined;
  do {
    const list = await kv.list({ prefix, cursor });
    await Promise.all(list.keys.map((k) => kv.delete(k.name)));
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
}

// Common cache key builders.
export const cacheKeys = {
  newsLatest: (page: number, size: number) => `news:latest:${page}:${size}`,
  newsCategory: (slug: string, page: number, size: number) => `news:cat:${slug}:${page}:${size}`,
  newsDetail: (slug: string) => `news:detail:${slug}`,
  newsTrending: (count: number, hours: number) => `news:trending:${count}:${hours}`,
  categories: () => `categories:all`,
};

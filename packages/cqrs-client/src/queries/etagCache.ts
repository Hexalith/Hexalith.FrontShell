export interface CacheEntry<T = unknown> {
  data: T;
  etag: string;
  timestamp: number;
}

export interface ETagCache {
  get(key: string): CacheEntry | undefined;
  set(key: string, entry: Omit<CacheEntry, "timestamp">): void;
  getAge(key: string): number | undefined;
  isFresh(key: string, maxAgeMs: number): boolean;
  clear(): void;
}

export function buildCacheKey(
  tenantId: string,
  params: {
    domain: string;
    queryType: string;
    aggregateId?: string;
    entityId?: string;
  },
): string {
  return `${tenantId}:${params.domain}:${params.queryType}:${params.aggregateId ?? ""}:${params.entityId ?? ""}`;
}

export function createETagCache(): ETagCache {
  const store = new Map<string, CacheEntry>();
  return {
    get: (key) => store.get(key),
    set: (key, entry) => store.set(key, { ...entry, timestamp: Date.now() }),
    getAge: (key) => {
      const entry = store.get(key);
      return entry ? Date.now() - entry.timestamp : undefined;
    },
    isFresh: (key, maxAgeMs) => {
      const entry = store.get(key);
      if (!entry) return false;
      return Date.now() - entry.timestamp < maxAgeMs;
    },
    clear: () => store.clear(),
  };
}

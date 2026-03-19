export interface CacheEntry<T = unknown> {
  data: T;
  etag: string;
}

export interface ETagCache {
  get(key: string): CacheEntry | undefined;
  set(key: string, entry: CacheEntry): void;
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
    set: (key, entry) => store.set(key, entry),
    clear: () => store.clear(),
  };
}

import type { PreflightValidationResult } from "../core/types";

export interface IPreflightCache {
  get(key: string): PreflightValidationResult | undefined;
  set(key: string, result: PreflightValidationResult): void;
  clear(): void;
}

const TTL_MS = 30_000;

export function buildPreflightCacheKey(
  tenant: string,
  endpoint: string,
  params: { domain: string; type: string; aggregateId?: string },
): string {
  return `${tenant}:${endpoint}:${params.domain}:${params.type}:${params.aggregateId ?? ""}`;
}

export function createPreflightCache(): IPreflightCache {
  const store = new Map<
    string,
    { result: PreflightValidationResult; timestamp: number }
  >();

  return {
    get(key: string): PreflightValidationResult | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() - entry.timestamp >= TTL_MS) {
        store.delete(key);
        return undefined;
      }
      return entry.result;
    },
    set(key: string, result: PreflightValidationResult): void {
      store.set(key, { result, timestamp: Date.now() });
    },
    clear(): void {
      store.clear();
    },
  };
}

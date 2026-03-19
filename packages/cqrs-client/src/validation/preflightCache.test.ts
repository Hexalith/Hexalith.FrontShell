import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildPreflightCacheKey,
  createPreflightCache,
} from "./preflightCache";

describe("preflightCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns cached result within TTL", () => {
    const cache = createPreflightCache();
    cache.set("key1", { isAuthorized: true });

    vi.advanceTimersByTime(29_999);
    expect(cache.get("key1")).toEqual({ isAuthorized: true });
  });

  it("returns undefined after TTL expires", () => {
    const cache = createPreflightCache();
    cache.set("key1", { isAuthorized: true });

    vi.advanceTimersByTime(30_000);
    expect(cache.get("key1")).toBeUndefined();
  });

  it("returns undefined for missing key", () => {
    const cache = createPreflightCache();
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("clear empties all entries", () => {
    const cache = createPreflightCache();
    cache.set("key1", { isAuthorized: true });
    cache.set("key2", { isAuthorized: false, reason: "denied" });

    cache.clear();

    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBeUndefined();
  });
});

describe("buildPreflightCacheKey", () => {
  it("builds key with all fields", () => {
    const key = buildPreflightCacheKey("acme", "commands/validate", {
      domain: "Orders",
      type: "CreateOrder",
      aggregateId: "ord-123",
    });
    expect(key).toBe("acme:commands/validate:Orders:CreateOrder:ord-123");
  });

  it("builds key without optional aggregateId", () => {
    const key = buildPreflightCacheKey("acme", "commands/validate", {
      domain: "Orders",
      type: "CreateOrder",
    });
    expect(key).toBe("acme:commands/validate:Orders:CreateOrder:");
  });

  it("produces different keys for different tenants", () => {
    const params = { domain: "Orders", type: "CreateOrder" };
    const keyA = buildPreflightCacheKey("tenant-a", "commands/validate", params);
    const keyB = buildPreflightCacheKey("tenant-b", "commands/validate", params);
    expect(keyA).not.toBe(keyB);
  });

  it("produces different keys for command vs query endpoints", () => {
    const params = { domain: "Orders", type: "CreateOrder" };
    const cmdKey = buildPreflightCacheKey("acme", "commands/validate", params);
    const qryKey = buildPreflightCacheKey("acme", "queries/validate", params);
    expect(cmdKey).not.toBe(qryKey);
  });
});

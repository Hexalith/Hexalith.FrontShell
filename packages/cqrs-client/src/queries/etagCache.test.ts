import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildCacheKey, createETagCache } from "./etagCache";

describe("createETagCache", () => {
  it("returns undefined for missing key", () => {
    const cache = createETagCache();
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("stores and retrieves an entry", () => {
    const cache = createETagCache();
    const entry = { data: { id: "order-1" }, etag: "abc" };

    cache.set("key-1", entry);

    const stored = cache.get("key-1");
    expect(stored?.data).toEqual(entry.data);
    expect(stored?.etag).toBe(entry.etag);
  });

  it("overwrites existing entry with same key", () => {
    const cache = createETagCache();
    cache.set("key-1", { data: { v: 1 }, etag: "etag-1" });
    cache.set("key-1", { data: { v: 2 }, etag: "etag-2" });

    const stored = cache.get("key-1");
    expect(stored?.data).toEqual({ v: 2 });
    expect(stored?.etag).toBe("etag-2");
  });

  it("clears all entries", () => {
    const cache = createETagCache();
    cache.set("key-1", { data: "a", etag: "e1" });
    cache.set("key-2", { data: "b", etag: "e2" });

    cache.clear();

    expect(cache.get("key-1")).toBeUndefined();
    expect(cache.get("key-2")).toBeUndefined();
  });
});

describe("createETagCache timestamp tracking", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("set() records timestamp", () => {
    const cache = createETagCache();
    const now = Date.now();

    cache.set("key-1", { data: "test", etag: "e1" });

    const stored = cache.get("key-1");
    expect(stored?.timestamp).toBe(now);
  });

  it("getAge() returns age in ms for existing entry", () => {
    const cache = createETagCache();
    cache.set("key-1", { data: "test", etag: "e1" });

    vi.advanceTimersByTime(3000);

    expect(cache.getAge("key-1")).toBe(3000);
  });

  it("getAge() returns undefined for missing key", () => {
    const cache = createETagCache();
    expect(cache.getAge("nonexistent")).toBeUndefined();
  });

  it("isFresh() returns true for entry within maxAge", () => {
    const cache = createETagCache();
    cache.set("key-1", { data: "test", etag: "e1" });

    vi.advanceTimersByTime(1000);

    expect(cache.isFresh("key-1", 5000)).toBe(true);
  });

  it("isFresh() returns false for entry older than maxAge", () => {
    const cache = createETagCache();
    cache.set("key-1", { data: "test", etag: "e1" });

    vi.advanceTimersByTime(6000);

    expect(cache.isFresh("key-1", 5000)).toBe(false);
  });

  it("isFresh() returns false for missing key", () => {
    const cache = createETagCache();
    expect(cache.isFresh("nonexistent", 5000)).toBe(false);
  });

  it("clear() removes all entries including timestamps", () => {
    const cache = createETagCache();
    cache.set("key-1", { data: "a", etag: "e1" });
    cache.set("key-2", { data: "b", etag: "e2" });

    cache.clear();

    expect(cache.getAge("key-1")).toBeUndefined();
    expect(cache.getAge("key-2")).toBeUndefined();
    expect(cache.isFresh("key-1", 5000)).toBe(false);
  });
});

describe("buildCacheKey", () => {
  it("builds key with all segments", () => {
    expect(
      buildCacheKey("tenant-1", {
        domain: "Inventory",
        queryType: "GetStock",
        aggregateId: "wh-1",
        entityId: "sku-42",
      }),
    ).toBe("tenant-1:Inventory:GetStock:wh-1:sku-42");
  });

  it("builds key without entityId", () => {
    expect(
      buildCacheKey("tenant-1", {
        domain: "Orders",
        queryType: "GetOrderDetail",
        aggregateId: "ord-123",
      }),
    ).toBe("tenant-1:Orders:GetOrderDetail:ord-123:");
  });

  it("builds key without aggregateId or entityId", () => {
    expect(
      buildCacheKey("tenant-1", {
        domain: "Orders",
        queryType: "GetOrderList",
      }),
    ).toBe("tenant-1:Orders:GetOrderList::");
  });

  it("includes empty segments between colons for missing optional fields", () => {
    const key = buildCacheKey("t1", {
      domain: "D",
      queryType: "Q",
    });
    const parts = key.split(":");
    expect(parts).toHaveLength(5);
    expect(parts[3]).toBe(""); // aggregateId
    expect(parts[4]).toBe(""); // entityId
  });
});

import { describe, it, expect } from "vitest";

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

    expect(cache.get("key-1")).toEqual(entry);
  });

  it("overwrites existing entry with same key", () => {
    const cache = createETagCache();
    cache.set("key-1", { data: { v: 1 }, etag: "etag-1" });
    cache.set("key-1", { data: { v: 2 }, etag: "etag-2" });

    expect(cache.get("key-1")).toEqual({ data: { v: 2 }, etag: "etag-2" });
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

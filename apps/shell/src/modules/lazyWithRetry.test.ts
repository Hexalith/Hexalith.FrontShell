import { describe, it, expect, vi, afterEach } from "vitest";

import { lazyWithRetry, retryImport } from "./lazyWithRetry";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("retryImport", () => {
  it("successful import on first attempt — no retries", async () => {
    const DummyComponent = () => null;
    const loader = vi.fn().mockResolvedValue({ default: DummyComponent });

    const result = await retryImport(loader, { retryDelayMs: 10 });

    expect(result).toEqual({ default: DummyComponent });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("successful import on second attempt after first failure — resolves normally", async () => {
    const DummyComponent = () => null;
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error("Failed to fetch dynamically imported module"))
      .mockResolvedValueOnce({ default: DummyComponent });

    const result = await retryImport(loader, { retries: 2, retryDelayMs: 10 });

    expect(result).toEqual({ default: DummyComponent });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("all retries fail — throws original error", async () => {
    const chunkError = new Error("Loading chunk xyz failed");
    const loader = vi.fn().mockRejectedValue(chunkError);

    await expect(
      retryImport(loader, { retries: 2, retryDelayMs: 10 }),
    ).rejects.toBe(chunkError);

    expect(loader).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("non-chunk-load error is NOT retried — thrown immediately", async () => {
    const renderError = new TypeError("Cannot read properties of undefined");
    const loader = vi.fn().mockRejectedValue(renderError);

    await expect(
      retryImport(loader, { retries: 2, retryDelayMs: 10 }),
    ).rejects.toBe(renderError);

    expect(loader).toHaveBeenCalledTimes(1); // No retry
  });

  it("defaults retries to 2 and retryDelayMs to 1000", async () => {
    const chunkError = new Error("Loading chunk xyz failed");
    const loader = vi.fn().mockRejectedValue(chunkError);

    await expect(retryImport(loader)).rejects.toBe(chunkError);

    // 1 initial + 2 retries = 3 total
    expect(loader).toHaveBeenCalledTimes(3);
  });
});

describe("lazyWithRetry", () => {
  it("creates a valid React.lazy component", () => {
    const DummyComponent = () => null;
    const loader = vi.fn().mockResolvedValue({ default: DummyComponent });

    const LazyComp = lazyWithRetry(loader, { retryDelayMs: 10 });

    // React.lazy components have $$typeof Symbol
    expect(LazyComp).toBeTruthy();
    expect((LazyComp as unknown as Record<string, unknown>).$$typeof).toBeTruthy();
  });

  it("creates component without options (uses defaults)", () => {
    const DummyComponent = () => null;
    const loader = vi.fn().mockResolvedValue({ default: DummyComponent });

    const LazyComp = lazyWithRetry(loader);
    expect(LazyComp).toBeTruthy();
  });
});

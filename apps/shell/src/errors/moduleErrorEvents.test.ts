import { describe, it, expect, beforeEach, vi } from "vitest";

import { ApiError } from "@hexalith/cqrs-client";

import {
  classifyError,
  classifySeverity,
  getErrorDisplayMessage,
  createModuleErrorEvent,
  emitModuleErrorEvent,
  getModuleErrorLog,
  _clearModuleErrorLog,
  _resetEmittingFlag,
} from "./moduleErrorEvents";

beforeEach(() => {
  _clearModuleErrorLog();
  _resetEmittingFlag();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("classifyError", () => {
  it('returns "chunk-load-failure" for dynamic import error messages', () => {
    const error = new Error(
      "Failed to fetch dynamically imported module: /module.js",
    );
    expect(classifyError(error)).toBe("chunk-load-failure");
  });

  it('returns "chunk-load-failure" for Loading chunk pattern', () => {
    const error = new Error("Loading chunk 5 failed");
    expect(classifyError(error)).toBe("chunk-load-failure");
  });

  it('returns "network-error" for Chrome-style TypeError ("Failed to fetch")', () => {
    const error = new TypeError("Failed to fetch");
    expect(classifyError(error)).toBe("network-error");
  });

  it('returns "network-error" for Firefox-style TypeError ("NetworkError")', () => {
    const error = new TypeError(
      "NetworkError when attempting to fetch resource",
    );
    expect(classifyError(error)).toBe("network-error");
  });

  it('returns "network-error" for ApiError with statusCode >= 500', () => {
    const error = new ApiError(502);
    expect(classifyError(error)).toBe("network-error");
  });

  it('returns "render-error" for generic errors', () => {
    const error = new Error("Cannot read properties of undefined");
    expect(classifyError(error)).toBe("render-error");
  });

  it('returns "render-error" for non-Error values (string)', () => {
    expect(classifyError("something broke")).toBe("render-error");
  });

  it('returns "render-error" for non-Error values (null)', () => {
    expect(classifyError(null)).toBe("render-error");
  });

  it('returns "render-error" for non-Error values (undefined)', () => {
    expect(classifyError(undefined)).toBe("render-error");
  });

  it('returns "render-error" for non-Error values (number)', () => {
    expect(classifyError(42)).toBe("render-error");
  });
});

describe("classifySeverity", () => {
  it('returns "error" for render-error', () => {
    expect(classifySeverity("render-error")).toBe("error");
  });

  it('returns "warning" for chunk-load-failure', () => {
    expect(classifySeverity("chunk-load-failure")).toBe("warning");
  });

  it('returns "warning" for network-error', () => {
    expect(classifySeverity("network-error")).toBe("warning");
  });
});

describe("getErrorDisplayMessage", () => {
  it("returns correct message for chunk-load-failure", () => {
    expect(getErrorDisplayMessage("chunk-load-failure", "Inventory")).toBe(
      "Unable to load Inventory. Check your connection and try again. Other sections continue to work normally.",
    );
  });

  it("returns correct message for network-error", () => {
    expect(getErrorDisplayMessage("network-error", "Tenants")).toBe(
      "Tenants data is temporarily unavailable. Other sections of the application continue to work normally.",
    );
  });

  it("returns correct message for render-error", () => {
    expect(getErrorDisplayMessage("render-error", "Orders")).toBe(
      "Unable to load Orders. Other sections continue to work normally.",
    );
  });
});

describe("createModuleErrorEvent", () => {
  it("produces structured event with all fields", () => {
    const error = new TypeError("Failed to fetch");
    error.stack = "TypeError: Failed to fetch\n    at fetch";
    const event = createModuleErrorEvent("Tenants", error, "<App>");

    expect(event).toEqual(
      expect.objectContaining({
        moduleName: "Tenants",
        classification: "network-error",
        errorCode: "network-error",
        severity: "warning",
        errorMessage: "Failed to fetch",
        stackTrace: "TypeError: Failed to fetch\n    at fetch",
        componentStack: "<App>",
        userId: "anonymous",
        tenantId: "none",
        sessionId: "unknown",
        buildVersion: "dev",
        source: "error-boundary",
        count: 1,
      }),
    );
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("converts null componentStack to undefined", () => {
    const error = new Error("render error");
    const event = createModuleErrorEvent(
      "Tenants",
      error,
      null as unknown as string | undefined,
    );
    expect(event.componentStack).toBeUndefined();
  });

  it("uses context values when provided", () => {
    const error = new Error("test");
    const event = createModuleErrorEvent("Mod", error, undefined, {
      userId: "user-1",
      tenantId: "t-1",
      sessionId: "sess-1",
      buildVersion: "1.0.0",
    });

    expect(event.userId).toBe("user-1");
    expect(event.tenantId).toBe("t-1");
    expect(event.sessionId).toBe("sess-1");
    expect(event.buildVersion).toBe("1.0.0");
  });

  it("uses provided source parameter", () => {
    const error = new Error("test");
    const event = createModuleErrorEvent(
      "shell",
      error,
      undefined,
      undefined,
      "global-handler",
    );
    expect(event.source).toBe("global-handler");
  });

  it("defaults source to 'error-boundary'", () => {
    const error = new Error("test");
    const event = createModuleErrorEvent("Mod", error);
    expect(event.source).toBe("error-boundary");
  });
});

describe("emitModuleErrorEvent", () => {
  it("appends to error log", () => {
    const event = createModuleErrorEvent(
      "Orders",
      new Error("test"),
    );
    emitModuleErrorEvent(event);

    const log = getModuleErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0]!.moduleName).toBe("Orders");
  });

  it("caps error log at 100 entries (FIFO)", () => {
    for (let i = 0; i < 105; i++) {
      emitModuleErrorEvent(
        createModuleErrorEvent(`Module-${i}`, new Error(`error-${i}`)),
      );
    }

    const log = getModuleErrorLog();
    expect(log).toHaveLength(100);
    // Oldest entries (0-4) should have been evicted
    expect(log[0]!.errorMessage).toBe("error-5");
    expect(log[99]!.errorMessage).toBe("error-104");
  });

  it("invokes onModuleError callback", () => {
    const callback = vi.fn();
    const event = createModuleErrorEvent("Mod", new Error("cb-test"));
    emitModuleErrorEvent(event, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(event);
  });

  it("catches callback errors silently", () => {
    const callback = vi.fn(() => {
      throw new Error("callback boom");
    });
    const event = createModuleErrorEvent("Mod", new Error("safe"));

    expect(() => emitModuleErrorEvent(event, callback)).not.toThrow();
    expect(getModuleErrorLog()).toHaveLength(1);
  });

  it("deduplicates events with same moduleName + errorCode within 5s window", () => {
    const baseTime = Date.now();
    const event1 = createModuleErrorEvent("Mod", new Error("render crash"));
    const event2 = createModuleErrorEvent("Mod", new Error("render crash 2"));

    emitModuleErrorEvent(event1, undefined, () => baseTime);
    emitModuleErrorEvent(event2, undefined, () => baseTime + 2000);

    const log = getModuleErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0]!.count).toBe(2);
  });

  it("creates separate entries after 5s dedup window expires", () => {
    const baseTime = Date.now();
    const event1 = createModuleErrorEvent("Mod", new Error("render crash"));
    const event2 = createModuleErrorEvent("Mod", new Error("render crash 2"));

    emitModuleErrorEvent(event1, undefined, () => baseTime);
    emitModuleErrorEvent(event2, undefined, () => baseTime + 6000);

    const log = getModuleErrorLog();
    expect(log).toHaveLength(2);
  });

  it("does not deduplicate events with different moduleName", () => {
    const baseTime = Date.now();
    const event1 = createModuleErrorEvent("ModA", new Error("render crash"));
    const event2 = createModuleErrorEvent("ModB", new Error("render crash"));

    emitModuleErrorEvent(event1, undefined, () => baseTime);
    emitModuleErrorEvent(event2, undefined, () => baseTime);

    const log = getModuleErrorLog();
    expect(log).toHaveLength(2);
  });

  it("re-entrancy guard prevents infinite emit loops", () => {
    const event = createModuleErrorEvent("Mod", new Error("loop"));

    // Simulate re-entrant call by having the callback try to emit again
    const callback = vi.fn(() => {
      // This should be blocked by the re-entrancy guard
      emitModuleErrorEvent(
        createModuleErrorEvent("Mod", new Error("reentrant")),
        undefined,
      );
    });

    emitModuleErrorEvent(event, callback);

    const log = getModuleErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0]!.errorMessage).toBe("loop");
  });
});

describe("getModuleErrorLog", () => {
  it("returns a read-only snapshot — mutating returned array has no effect", () => {
    emitModuleErrorEvent(
      createModuleErrorEvent("Test", new Error("snapshot")),
    );

    const snapshot = getModuleErrorLog();
    // @ts-expect-error — testing runtime immutability
    snapshot.push(createModuleErrorEvent("Fake", new Error("injected")));

    expect(getModuleErrorLog()).toHaveLength(1);
  });
});

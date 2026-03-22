import { describe, it, expect, beforeEach, vi } from "vitest";

import { ApiError } from "@hexalith/cqrs-client";

import {
  classifyError,
  getErrorDisplayMessage,
  createModuleErrorEvent,
  emitModuleErrorEvent,
  getModuleErrorLog,
  _clearModuleErrorLog,
} from "./moduleErrorEvents";

beforeEach(() => {
  _clearModuleErrorLog();
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
        errorMessage: "Failed to fetch",
        stackTrace: "TypeError: Failed to fetch\n    at fetch",
        componentStack: "<App>",
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

  it("caps error log at 50 entries (FIFO)", () => {
    for (let i = 0; i < 55; i++) {
      emitModuleErrorEvent(
        createModuleErrorEvent("Module", new Error(`error-${i}`)),
      );
    }

    const log = getModuleErrorLog();
    expect(log).toHaveLength(50);
    // Oldest entries (0-4) should have been evicted
    expect(log[0]!.errorMessage).toBe("error-5");
    expect(log[49]!.errorMessage).toBe("error-54");
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

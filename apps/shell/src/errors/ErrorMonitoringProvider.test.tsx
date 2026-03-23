import { render, act, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  MockShellProvider,
  createMockAuthContext,
  createMockTenantContext,
} from "@hexalith/shell-api";

import {
  ErrorMonitoringProvider,
  useErrorMonitoring,
} from "./ErrorMonitoringProvider";
import {
  getModuleErrorLog,
  _clearModuleErrorLog,
  _resetEmittingFlag,
} from "./moduleErrorEvents";

import type { ModuleErrorEvent } from "./moduleErrorEvents";

beforeEach(() => {
  _clearModuleErrorLog();
  _resetEmittingFlag();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderWithMonitoring(
  ui: React.ReactElement,
  onModuleError?: (e: ModuleErrorEvent) => void,
  authOverrides?: Parameters<typeof createMockAuthContext>[0],
  tenantOverrides?: Parameters<typeof createMockTenantContext>[0],
) {
  return render(
    <MockShellProvider
      authContext={createMockAuthContext(authOverrides)}
      tenantContext={createMockTenantContext(tenantOverrides)}
    >
      <ErrorMonitoringProvider onModuleError={onModuleError}>
        {ui}
      </ErrorMonitoringProvider>
    </MockShellProvider>,
  );
}

function ContextReader({
  onContext,
}: {
  onContext: (ctx: ReturnType<typeof useErrorMonitoring>) => void;
}) {
  const monitoring = useErrorMonitoring();
  onContext(monitoring);
  return null;
}

describe("ErrorMonitoringProvider", () => {
  it("provides correct context values from auth and tenant", () => {
    let captured: ReturnType<typeof useErrorMonitoring> | null = null;

    renderWithMonitoring(
      <ContextReader onContext={(ctx) => (captured = ctx)} />,
      undefined,
      { user: { sub: "user-42", tenantClaims: ["t1"], name: "U", email: "u@test.com" } },
      { activeTenant: "tenant-a" },
    );

    expect(captured).not.toBeNull();
    expect(captured!.context.userId).toBe("user-42");
    expect(captured!.context.tenantId).toBe("tenant-a");
    expect(captured!.context.sessionId).toBeTruthy();
    expect(captured!.context.buildVersion).toBeTruthy();
  });

  it("defaults userId to 'anonymous' when user is null", () => {
    let captured: ReturnType<typeof useErrorMonitoring> | null = null;

    renderWithMonitoring(
      <ContextReader onContext={(ctx) => (captured = ctx)} />,
      undefined,
      { user: null },
    );

    expect(captured!.context.userId).toBe("anonymous");
  });

  it("defaults tenantId to 'none' when activeTenant is null", () => {
    let captured: ReturnType<typeof useErrorMonitoring> | null = null;

    renderWithMonitoring(
      <ContextReader onContext={(ctx) => (captured = ctx)} />,
      undefined,
      undefined,
      { activeTenant: null as unknown as string },
    );

    expect(captured!.context.tenantId).toBe("none");
  });

  it("captures window error events with source 'global-handler'", () => {
    renderWithMonitoring(<div>test</div>);

    act(() => {
      const errorEvent = new ErrorEvent("error", {
        error: new Error("global test error"),
        message: "global test error",
      });
      window.dispatchEvent(errorEvent);
    });

    const log = getModuleErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0]!.moduleName).toBe("shell");
    expect(log[0]!.source).toBe("global-handler");
    expect(log[0]!.errorMessage).toBe("global test error");
  });

  it("captures window error events without an Error object", () => {
    renderWithMonitoring(<div>test</div>);

    act(() => {
      const errorEvent = new ErrorEvent("error", {
        message: "script-only global error",
      });
      window.dispatchEvent(errorEvent);
    });

    const log = getModuleErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0]!.moduleName).toBe("shell");
    expect(log[0]!.source).toBe("global-handler");
    expect(log[0]!.errorMessage).toBe("script-only global error");
  });

  it("captures unhandled promise rejections with source 'global-handler'", () => {
    renderWithMonitoring(<div>test</div>);

    act(() => {
      const rejectionEvent = new PromiseRejectionEvent("unhandledrejection", {
        reason: new Error("async failure"),
        promise: Promise.resolve(),
      });
      window.dispatchEvent(rejectionEvent);
    });

    const log = getModuleErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0]!.moduleName).toBe("shell");
    expect(log[0]!.source).toBe("global-handler");
    expect(log[0]!.errorMessage).toBe("async failure");
  });

  it("handles non-Error rejection reasons", () => {
    renderWithMonitoring(<div>test</div>);

    act(() => {
      const rejectionEvent = new PromiseRejectionEvent("unhandledrejection", {
        reason: "string rejection",
        promise: Promise.resolve(),
      });
      window.dispatchEvent(rejectionEvent);
    });

    const log = getModuleErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0]!.errorMessage).toBe("string rejection");
  });

  it("invokes onModuleError callback when events are emitted", () => {
    const callback = vi.fn();
    renderWithMonitoring(<div>test</div>, callback);

    act(() => {
      const errorEvent = new ErrorEvent("error", {
        error: new Error("callback test"),
        message: "callback test",
      });
      window.dispatchEvent(errorEvent);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: "callback test" }),
    );
  });

  it("does not crash when onModuleError callback throws", () => {
    const callback = vi.fn(() => {
      throw new Error("callback failure");
    });
    renderWithMonitoring(<div>test</div>, callback);

    act(() => {
      const errorEvent = new ErrorEvent("error", {
        error: new Error("safe test"),
        message: "safe test",
      });
      window.dispatchEvent(errorEvent);
    });

    const log = getModuleErrorLog();
    expect(log).toHaveLength(1);
  });

  it("removes global listeners on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderWithMonitoring(<div>test</div>);

    const errorCalls = addSpy.mock.calls.filter(([type]) => type === "error");
    const rejectionCalls = addSpy.mock.calls.filter(
      ([type]) => type === "unhandledrejection",
    );
    expect(errorCalls.length).toBeGreaterThanOrEqual(1);
    expect(rejectionCalls.length).toBeGreaterThanOrEqual(1);

    unmount();

    const removeErrorCalls = removeSpy.mock.calls.filter(
      ([type]) => type === "error",
    );
    const removeRejectionCalls = removeSpy.mock.calls.filter(
      ([type]) => type === "unhandledrejection",
    );
    expect(removeErrorCalls.length).toBeGreaterThanOrEqual(1);
    expect(removeRejectionCalls.length).toBeGreaterThanOrEqual(1);
  });
});

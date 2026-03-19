import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { CqrsProvider } from "../CqrsProvider";
import { ApiError, AuthError, RateLimitError } from "../errors";
import { useCanExecuteCommand, useCanExecuteQuery } from "./useCanExecute";
import { MockSignalRHub } from "../mocks/MockSignalRHub";

import type { PreflightValidationResult } from "../core/types";

// Mock fetchClient
const mockPost = vi.fn();
const mockGet = vi.fn();
const mockPostForQuery = vi.fn();

vi.mock("../core/fetchClient", () => ({
  createFetchClient: vi.fn(() => ({
    post: mockPost,
    get: mockGet,
    postForQuery: mockPostForQuery,
  })),
}));

// Mock useTenant
const mockUseTenant = vi.fn();
vi.mock("@hexalith/shell-api", () => ({
  useTenant: () => mockUseTenant(),
}));

const mockSignalRHub = new MockSignalRHub();

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(CqrsProvider, {
      commandApiBaseUrl: "https://test",
      tokenGetter: () => Promise.resolve("token"),
      signalRHub: mockSignalRHub,
      children,
    });
  };
}

// Error boundary for testing error propagation (AuthError, RateLimitError)
let capturedBoundaryError: Error | null = null;

class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    capturedBoundaryError = error;
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function createWrapperWithErrorBoundary() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      TestErrorBoundary,
      null,
      React.createElement(CqrsProvider, {
        commandApiBaseUrl: "https://test",
        tokenGetter: () => Promise.resolve("token"),
        signalRHub: mockSignalRHub,
        children,
      }),
    );
  };
}

describe("useCanExecuteCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTenant.mockReturnValue({
      activeTenant: "test-tenant",
      availableTenants: ["test-tenant"],
      switchTenant: vi.fn(),
    });
  });

  it("returns isAuthorized=true when backend authorizes", async () => {
    const response: PreflightValidationResult = { isAuthorized: true };
    mockPost.mockResolvedValueOnce(response);

    const { result } = renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(true);
    expect(result.current.reason).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it("returns isAuthorized=false with reason when backend denies", async () => {
    const response: PreflightValidationResult = {
      isAuthorized: false,
      reason: "Insufficient tenant permissions",
    };
    mockPost.mockResolvedValueOnce(response);

    const { result } = renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(false);
    expect(result.current.reason).toBe("Insufficient tenant permissions");
  });

  it("returns isLoading=true during fetch", async () => {
    let resolvePost!: (value: PreflightValidationResult) => void;
    mockPost.mockReturnValueOnce(
      new Promise<PreflightValidationResult>((resolve) => {
        resolvePost = resolve;
      }),
    );

    const { result } = renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
        }),
      { wrapper: createWrapper() },
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePost({ isAuthorized: true });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("fails closed on network error", async () => {
    const networkError = new TypeError("Failed to fetch");
    mockPost.mockRejectedValueOnce(networkError);

    const { result } = renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(false);
    expect(result.current.reason).toBe("Authorization service unavailable");
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).statusCode).toBe(503);
  });

  it("fails closed on 503", async () => {
    const apiError = new ApiError(503);
    mockPost.mockRejectedValueOnce(apiError);

    const { result } = renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(false);
    expect(result.current.reason).toBe("Authorization service unavailable");
    expect(result.current.error).toBe(apiError);
  });

  it("propagates AuthError on 401", async () => {
    const authError = new AuthError("Session expired");
    mockPost.mockRejectedValueOnce(authError);
    capturedBoundaryError = null;

    // Suppress React 19 dev-mode concurrent rendering recovery exception + error boundary logs
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const originalListeners = process.rawListeners("uncaughtException");
    process.removeAllListeners("uncaughtException");
    const caughtExceptions: unknown[] = [];
    const handler = (err: unknown) => { caughtExceptions.push(err); };
    process.on("uncaughtException", handler);

    renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
        }),
      { wrapper: createWrapperWithErrorBoundary() },
    );

    // Wait for error boundary to catch the thrown AuthError
    await waitFor(() => {
      expect(capturedBoundaryError).toBeInstanceOf(AuthError);
    });

    expect(mockPost).toHaveBeenCalledTimes(1);

    // Restore
    process.removeListener("uncaughtException", handler);
    for (const l of originalListeners) {
      process.on("uncaughtException", l as NodeJS.UncaughtExceptionListener);
    }
    consoleSpy.mockRestore();
  });

  it("propagates RateLimitError on 429", async () => {
    const rateLimitError = new RateLimitError("60");
    mockPost.mockRejectedValueOnce(rateLimitError);
    capturedBoundaryError = null;

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const originalListeners = process.rawListeners("uncaughtException");
    process.removeAllListeners("uncaughtException");
    const caughtExceptions: unknown[] = [];
    const handler = (err: unknown) => { caughtExceptions.push(err); };
    process.on("uncaughtException", handler);

    renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
        }),
      { wrapper: createWrapperWithErrorBoundary() },
    );

    await waitFor(() => {
      expect(capturedBoundaryError).toBeInstanceOf(RateLimitError);
    });

    expect(mockPost).toHaveBeenCalledTimes(1);

    process.removeListener("uncaughtException", handler);
    for (const l of originalListeners) {
      process.on("uncaughtException", l as NodeJS.UncaughtExceptionListener);
    }
    consoleSpy.mockRestore();
  });

  it("caches result within 30 seconds", async () => {
    mockPost.mockResolvedValue({ isAuthorized: true } as PreflightValidationResult);

    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockPost).toHaveBeenCalledTimes(1);

    // Rerender — should use cached result, no new API call
    rerender();
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthorized).toBe(true);
  });

  it("re-fetches after cache TTL expires", async () => {
    vi.useFakeTimers();
    mockPost.mockResolvedValue({ isAuthorized: true } as PreflightValidationResult);

    const wrapper = createWrapper();
    const { result, unmount } = renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
        }),
      { wrapper },
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.isAuthorized).toBe(true);
    expect(mockPost).toHaveBeenCalledTimes(1);

    // Advance past TTL
    act(() => {
      vi.advanceTimersByTime(30_001);
    });

    unmount();

    // Render a new hook — cache is expired, should make a new API call
    const { result: result2 } = renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
        }),
      { wrapper },
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result2.current.isAuthorized).toBe(true);
    expect(mockPost).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("re-fetches after tenant switch (different cache key)", async () => {
    mockPost.mockResolvedValue({ isAuthorized: true } as PreflightValidationResult);

    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockPost).toHaveBeenCalledTimes(1);

    // Switch tenant
    mockUseTenant.mockReturnValue({
      activeTenant: "tenant-b",
      availableTenants: ["test-tenant", "tenant-b"],
      switchTenant: vi.fn(),
    });

    rerender();

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledTimes(2);
    });
  });

  it("sends correct request body", async () => {
    mockPost.mockResolvedValueOnce({ isAuthorized: true } as PreflightValidationResult);

    const { result } = renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
          aggregateId: "ord-123",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/commands/validate",
      expect.objectContaining({
        body: {
          tenant: "test-tenant",
          domain: "Orders",
          commandType: "CreateOrder",
          aggregateId: "ord-123",
        },
      }),
    );
  });

  it("does not fetch when no active tenant", async () => {
    mockUseTenant.mockReturnValue({
      activeTenant: null,
      availableTenants: [],
      switchTenant: vi.fn(),
    });

    const { result } = renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(false);
    expect(result.current.reason).toBe("No active tenant");
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("re-fetches when params change", async () => {
    mockPost.mockResolvedValue({ isAuthorized: true } as PreflightValidationResult);

    let domain = "Orders";
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      () =>
        useCanExecuteCommand({
          domain,
          commandType: "CreateOrder",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockPost).toHaveBeenCalledTimes(1);

    // Change params
    domain = "Inventory";
    rerender();

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    expect(mockPost).toHaveBeenLastCalledWith(
      "/api/v1/commands/validate",
      expect.objectContaining({
        body: expect.objectContaining({ domain: "Inventory" }),
      }),
    );
  });

  it("does not update state after unmount", async () => {
    let resolvePost!: (value: PreflightValidationResult) => void;
    mockPost.mockReturnValueOnce(
      new Promise<PreflightValidationResult>((resolve) => {
        resolvePost = resolve;
      }),
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result, unmount } = renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(true);

    // Unmount before resolving
    unmount();

    // Resolve after unmount
    await act(async () => {
      resolvePost({ isAuthorized: true });
    });

    // No "state update on unmounted component" warning
    const stateUpdateWarnings = consoleSpy.mock.calls.filter(
      (call) =>
        typeof call[0] === "string" &&
        call[0].includes("state update") &&
        call[0].includes("unmounted"),
    );
    expect(stateUpdateWarnings).toHaveLength(0);

    consoleSpy.mockRestore();
  });
});

describe("useCanExecuteQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTenant.mockReturnValue({
      activeTenant: "test-tenant",
      availableTenants: ["test-tenant"],
      switchTenant: vi.fn(),
    });
  });

  it("returns isAuthorized=true when backend authorizes", async () => {
    const response: PreflightValidationResult = { isAuthorized: true };
    mockPost.mockResolvedValueOnce(response);

    const { result } = renderHook(
      () =>
        useCanExecuteQuery({
          domain: "Orders",
          queryType: "GetOrderList",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(true);
    expect(result.current.reason).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it("returns isAuthorized=false with reason when backend denies", async () => {
    const response: PreflightValidationResult = {
      isAuthorized: false,
      reason: "Insufficient tenant permissions",
    };
    mockPost.mockResolvedValueOnce(response);

    const { result } = renderHook(
      () =>
        useCanExecuteQuery({
          domain: "Orders",
          queryType: "GetOrderList",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(false);
    expect(result.current.reason).toBe("Insufficient tenant permissions");
  });

  it("returns isLoading=true during fetch", async () => {
    let resolvePost!: (value: PreflightValidationResult) => void;
    mockPost.mockReturnValueOnce(
      new Promise<PreflightValidationResult>((resolve) => {
        resolvePost = resolve;
      }),
    );

    const { result } = renderHook(
      () =>
        useCanExecuteQuery({
          domain: "Orders",
          queryType: "GetOrderList",
        }),
      { wrapper: createWrapper() },
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePost({ isAuthorized: true });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("fails closed on network error", async () => {
    const networkError = new TypeError("Failed to fetch");
    mockPost.mockRejectedValueOnce(networkError);

    const { result } = renderHook(
      () =>
        useCanExecuteQuery({
          domain: "Orders",
          queryType: "GetOrderList",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(false);
    expect(result.current.reason).toBe("Authorization service unavailable");
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).statusCode).toBe(503);
  });

  it("fails closed on 503", async () => {
    const apiError = new ApiError(503);
    mockPost.mockRejectedValueOnce(apiError);

    const { result } = renderHook(
      () =>
        useCanExecuteQuery({
          domain: "Orders",
          queryType: "GetOrderList",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(false);
    expect(result.current.reason).toBe("Authorization service unavailable");
    expect(result.current.error).toBe(apiError);
  });

  it("propagates AuthError on 401", async () => {
    const authError = new AuthError("Session expired");
    mockPost.mockRejectedValueOnce(authError);
    capturedBoundaryError = null;

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const originalListeners = process.rawListeners("uncaughtException");
    process.removeAllListeners("uncaughtException");
    const handler = (err: unknown) => { /* suppress */ void err; };
    process.on("uncaughtException", handler);

    renderHook(
      () =>
        useCanExecuteQuery({
          domain: "Orders",
          queryType: "GetOrderList",
        }),
      { wrapper: createWrapperWithErrorBoundary() },
    );

    await waitFor(() => {
      expect(capturedBoundaryError).toBeInstanceOf(AuthError);
    });

    process.removeListener("uncaughtException", handler);
    for (const l of originalListeners) {
      process.on("uncaughtException", l as NodeJS.UncaughtExceptionListener);
    }
    consoleSpy.mockRestore();
  });

  it("propagates RateLimitError on 429", async () => {
    const rateLimitError = new RateLimitError("60");
    mockPost.mockRejectedValueOnce(rateLimitError);
    capturedBoundaryError = null;

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const originalListeners = process.rawListeners("uncaughtException");
    process.removeAllListeners("uncaughtException");
    const handler = (err: unknown) => { /* suppress */ void err; };
    process.on("uncaughtException", handler);

    renderHook(
      () =>
        useCanExecuteQuery({
          domain: "Orders",
          queryType: "GetOrderList",
        }),
      { wrapper: createWrapperWithErrorBoundary() },
    );

    await waitFor(() => {
      expect(capturedBoundaryError).toBeInstanceOf(RateLimitError);
    });

    process.removeListener("uncaughtException", handler);
    for (const l of originalListeners) {
      process.on("uncaughtException", l as NodeJS.UncaughtExceptionListener);
    }
    consoleSpy.mockRestore();
  });

  it("caches result within 30 seconds", async () => {
    mockPost.mockResolvedValue({ isAuthorized: true } as PreflightValidationResult);

    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      () =>
        useCanExecuteQuery({
          domain: "Orders",
          queryType: "GetOrderList",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPost).toHaveBeenCalledTimes(1);

    // Rerender — should use cached result, no new API call
    rerender();
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthorized).toBe(true);
  });

  it("re-fetches after tenant switch (different cache key)", async () => {
    mockPost.mockResolvedValue({ isAuthorized: true } as PreflightValidationResult);

    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      () =>
        useCanExecuteQuery({
          domain: "Orders",
          queryType: "GetOrderList",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockPost).toHaveBeenCalledTimes(1);

    mockUseTenant.mockReturnValue({
      activeTenant: "tenant-b",
      availableTenants: ["test-tenant", "tenant-b"],
      switchTenant: vi.fn(),
    });

    rerender();

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledTimes(2);
    });
  });

  it("re-fetches after cache TTL expires", async () => {
    vi.useFakeTimers();
    mockPost.mockResolvedValue({ isAuthorized: true } as PreflightValidationResult);

    const wrapper = createWrapper();
    const { result, unmount } = renderHook(
      () =>
        useCanExecuteQuery({
          domain: "Orders",
          queryType: "GetOrderList",
        }),
      { wrapper },
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.isAuthorized).toBe(true);
    expect(mockPost).toHaveBeenCalledTimes(1);

    // Advance past TTL
    act(() => {
      vi.advanceTimersByTime(30_001);
    });

    unmount();

    // Render a new hook — cache is expired, should make a new API call
    const { result: result2 } = renderHook(
      () =>
        useCanExecuteQuery({
          domain: "Orders",
          queryType: "GetOrderList",
        }),
      { wrapper },
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result2.current.isAuthorized).toBe(true);
    expect(mockPost).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("does not fetch when no active tenant", async () => {
    mockUseTenant.mockReturnValue({
      activeTenant: null,
      availableTenants: [],
      switchTenant: vi.fn(),
    });

    const { result } = renderHook(
      () =>
        useCanExecuteQuery({
          domain: "Orders",
          queryType: "GetOrderList",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(false);
    expect(result.current.reason).toBe("No active tenant");
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("posts to /api/v1/queries/validate", async () => {
    mockPost.mockResolvedValueOnce({ isAuthorized: true } as PreflightValidationResult);

    const { result } = renderHook(
      () =>
        useCanExecuteQuery({
          domain: "Orders",
          queryType: "GetOrderList",
          aggregateId: "ord-123",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/queries/validate",
      expect.objectContaining({
        body: {
          tenant: "test-tenant",
          domain: "Orders",
          queryType: "GetOrderList",
          aggregateId: "ord-123",
        },
      }),
    );
  });

  it("shares cache with separate cache keys from command", async () => {
    mockPost.mockResolvedValue({ isAuthorized: true } as PreflightValidationResult);

    const wrapper = createWrapper();

    // First render command hook
    const { result: cmdResult } = renderHook(
      () =>
        useCanExecuteCommand({
          domain: "Orders",
          commandType: "CreateOrder",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(cmdResult.current.isLoading).toBe(false);
    });

    // Then render query hook with same domain/type — different endpoint = different cache key
    const { result: qryResult } = renderHook(
      () =>
        useCanExecuteQuery({
          domain: "Orders",
          queryType: "CreateOrder",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(qryResult.current.isLoading).toBe(false);
    });

    // Both should have made separate API calls (different cache keys)
    expect(mockPost).toHaveBeenCalledTimes(2);
  });
});

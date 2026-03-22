import { createElement, type ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

import { ConnectionStateProvider, useConnectionState } from "../connection/ConnectionStateProvider";
import { ApiError, AuthError, ForbiddenError, ValidationError } from "../errors";
import { QueryProvider } from "./QueryProvider";
import { useQuery, type QueryParams } from "./useQuery";
import { MockSignalRHub } from "../mocks/MockSignalRHub";
import { SignalRProvider } from "../notifications/SignalRProvider";
import { _resetSubscriptionState } from "../notifications/useProjectionSubscription";

import type { CommandEventBus } from "../commands/commandEventBus";
import type { FetchClient, QueryResponse } from "../core/fetchClient";
import type { SubmitQueryResponse } from "../core/types";

let mockActiveTenant: string | null = "test-tenant";

vi.mock("@hexalith/shell-api", () => ({
  useTenant: () => ({
    activeTenant: mockActiveTenant,
    availableTenants: ["test-tenant"],
    switchTenant: vi.fn(),
  }),
}));

// Mock CqrsProvider's useCqrs so QueryProvider can access commandEventBus
let mockCommandEventBus: CommandEventBus;

vi.mock("../CqrsProvider", () => ({
  useCqrs: () => ({
    fetchClient: {},
    commandEventBus: mockCommandEventBus,
  }),
}));

const TestSchema = z.object({
  id: z.string(),
  name: z.string(),
});

function createMockFetchClient(
  postForQueryImpl?: FetchClient["postForQuery"],
): FetchClient {
  return {
    post: vi.fn(),
    get: vi.fn(),
    postForQuery: postForQueryImpl ?? vi.fn(),
  };
}

function createMockEventBus(): CommandEventBus {
  const listeners: Array<(event: { correlationId: string; domain: string; aggregateId: string; tenant: string }) => void> = [];
  return {
    onCommandCompleted(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
    emitCommandCompleted(event) {
      for (const listener of [...listeners]) {
        listener(event);
      }
    },
  };
}

function createWrapper(fetchClient: FetchClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      ConnectionStateProvider,
      null,
      createElement(QueryProvider, { fetchClient, children }),
    );
  };
}

function makeQueryResponse(
  data: SubmitQueryResponse,
  etag: string | null = '"etag-1"',
): QueryResponse<SubmitQueryResponse> {
  return { status: 200, data, etag };
}

const defaultParams: QueryParams = {
  domain: "Orders",
  queryType: "GetOrder",
  aggregateId: "ord-1",
};

describe("useQuery", () => {
  let mockFetchClient: FetchClient;

  beforeEach(() => {
    mockActiveTenant = "test-tenant";
    mockCommandEventBus = createMockEventBus();
    mockFetchClient = createMockFetchClient(
      vi.fn().mockResolvedValue(
        makeQueryResponse({
          correlationId: "q-1",
          payload: { id: "ord-1", name: "Test Order" },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns typed data on successful query", async () => {
    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(mockFetchClient) },
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.data).toEqual({
        id: "ord-1",
        name: "Test Order",
      });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets ValidationError when Zod validation fails", async () => {
    const badPayloadClient = createMockFetchClient(
      vi.fn().mockResolvedValue(
        makeQueryResponse({
          correlationId: "q-2",
          payload: { id: 123, name: null },
        }),
      ),
    );

    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(badPayloadClient) },
    );

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(ValidationError);
    });

    expect(result.current.data).toBeUndefined();
  });

  it("stores ETag in cache on 200 response and sends If-None-Match on refetch", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse(
        { correlationId: "q-3", payload: { id: "a", name: "b" } },
        '"etag-abc"',
      ),
    );
    const client = createMockFetchClient(postForQuery);

    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: "a", name: "b" });
    });

    // Trigger refetch
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    const secondCallOptions = postForQuery.mock.calls[1]?.[1];
    expect(secondCallOptions?.headers?.["If-None-Match"]).toBe('"etag-abc"');
  });

  it("returns cached data on 304 response", async () => {
    let callCount = 0;
    const postForQuery = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return makeQueryResponse(
          { correlationId: "q-4", payload: { id: "x", name: "cached" } },
          '"etag-xyz"',
        );
      }
      return { status: 304, data: null, etag: null };
    });
    const client = createMockFetchClient(postForQuery);

    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: "x", name: "cached" });
    });

    // Refetch — should get 304 and return cached data
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    expect(result.current.data).toEqual({ id: "x", name: "cached" });
    expect(result.current.error).toBeNull();
  });

  it("sets error when activeTenant is null", async () => {
    mockActiveTenant = null;

    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(mockFetchClient) },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.data).toBeUndefined();
  });

  it("auto-injects tenant in request body", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-5",
        payload: { id: "a", name: "b" },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    renderHook(() => useQuery(TestSchema, defaultParams), {
      wrapper: createWrapper(client),
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalled();
    });

    const callBody = postForQuery.mock.calls[0]?.[1]?.body;
    expect(callBody.tenant).toBe("test-tenant");
    expect(callBody.domain).toBe("Orders");
    expect(callBody.queryType).toBe("GetOrder");
  });

  it("skips fetch when enabled is false", async () => {
    const postForQuery = vi.fn();
    const client = createMockFetchClient(postForQuery);

    renderHook(
      () => useQuery(TestSchema, defaultParams, { enabled: false }),
      { wrapper: createWrapper(client) },
    );

    // Give time for any async side effects
    await new Promise((r) => setTimeout(r, 50));

    expect(postForQuery).not.toHaveBeenCalled();
  });

  it("fetches when enabled transitions from false to true", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-6",
        payload: { id: "a", name: "b" },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    let enabledVal = false;
    const { rerender } = renderHook(
      () => useQuery(TestSchema, defaultParams, { enabled: enabledVal }),
      { wrapper: createWrapper(client) },
    );

    // Give time
    await new Promise((r) => setTimeout(r, 50));
    expect(postForQuery).not.toHaveBeenCalled();

    enabledVal = true;
    rerender();

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalled();
    });
  });

  it("polls at refetchInterval", async () => {
    vi.useFakeTimers();
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-7",
        payload: { id: "a", name: "b" },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    renderHook(
      () =>
        useQuery(TestSchema, defaultParams, { refetchInterval: 5000 }),
      { wrapper: createWrapper(client) },
    );

    // Flush initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(postForQuery).toHaveBeenCalledTimes(1);

    // Advance to trigger poll
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(postForQuery).toHaveBeenCalledTimes(2);

    // Another interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(postForQuery).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it("triggers refetch on window visibility change", async () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-8",
        payload: { id: "a", name: "b" },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    const { unmount } = renderHook(
      () =>
        useQuery(TestSchema, defaultParams, { refetchOnWindowFocus: true }),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(1);
    });

    // Verify listener was added
    expect(addSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );

    // Simulate tab coming back to focus
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    // Cleanup
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
  });

  it("does not refetch on visibilitychange when refetchOnWindowFocus is false", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-9",
        payload: { id: "a", name: "b" },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    renderHook(
      () =>
        useQuery(TestSchema, defaultParams, {
          refetchOnWindowFocus: false,
        }),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(1);
    });

    // Simulate tab focus
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Give time for any potential refetch
    await new Promise((r) => setTimeout(r, 50));

    // Should NOT have been called again
    expect(postForQuery).toHaveBeenCalledTimes(1);
  });

  it("exposes refetch() that triggers manual re-fetch", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-10",
        payload: { id: "a", name: "b" },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });
  });

  it("isLoading is true only during initial fetch, not during refetch", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-11",
        payload: { id: "a", name: "b" },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    // Initial: isLoading should be true
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Refetch: isLoading should stay false
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("sets error state on fetch error", async () => {
    const fetchError = new Error("Network failure");
    const postForQuery = vi.fn().mockRejectedValue(fetchError);
    const client = createMockFetchClient(postForQuery);

    const { result, unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Explicitly unmount to cancel any pending retry timers
    unmount();
  });

  it("clears interval on unmount", async () => {
    vi.useFakeTimers();
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-12",
        payload: { id: "a", name: "b" },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    const { unmount } = renderHook(
      () =>
        useQuery(TestSchema, defaultParams, { refetchInterval: 3000 }),
      { wrapper: createWrapper(client) },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(postForQuery).toHaveBeenCalledTimes(1);

    unmount();

    // Advance past interval — should NOT trigger another fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(postForQuery).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("returns object shape (not tuple)", () => {
    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(mockFetchClient) },
    );

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("isRefreshing");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("refetch");
    expect(Array.isArray(result.current)).toBe(false);
  });

  it("isRefreshing defaults to false", async () => {
    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(mockFetchClient) },
    );

    expect(result.current.isRefreshing).toBe(false);

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.isRefreshing).toBe(false);
  });

  it("does not cache when response has no ETag", async () => {
    let callCount = 0;
    const postForQuery = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        status: 200,
        data: {
          correlationId: `q-${callCount}`,
          payload: { id: "a", name: `v${callCount}` },
        },
        etag: null,
      };
    });
    const client = createMockFetchClient(postForQuery);

    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    // Refetch — should not send If-None-Match since nothing was cached
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    const secondCallOptions = postForQuery.mock.calls[1]?.[1];
    expect(secondCallOptions?.headers?.["If-None-Match"]).toBeUndefined();
  });

  it("defaults aggregateId to empty string in request body", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-agg",
        payload: { id: "a", name: "b" },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    renderHook(
      () =>
        useQuery(TestSchema, {
          domain: "Orders",
          queryType: "GetOrderList",
        }),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalled();
    });

    const body = postForQuery.mock.calls[0]?.[1]?.body;
    expect(body.aggregateId).toBe("");
  });

  it("aborts in-flight request on unmount", async () => {
    let capturedSignal: AbortSignal | undefined;
    const postForQuery = vi.fn().mockImplementation(
      async (_path: string, opts?: { signal?: AbortSignal }) => {
        capturedSignal = opts?.signal;
        return makeQueryResponse({
          correlationId: "q-abort",
          payload: { id: "a", name: "b" },
        });
      },
    );
    const client = createMockFetchClient(postForQuery);

    const { unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalled();
    });

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it("aborts old request and starts new fetch when params change mid-flight", async () => {
    const capturedSignals: Array<AbortSignal | undefined> = [];
    const postForQuery = vi
      .fn()
      .mockImplementationOnce(
        (_path: string, opts?: { signal?: AbortSignal }) =>
          new Promise<QueryResponse<SubmitQueryResponse>>((resolve, reject) => {
            capturedSignals.push(opts?.signal);
            opts?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      )
      .mockImplementationOnce(async () => {
        capturedSignals.push(undefined);
        return makeQueryResponse({
          correlationId: "q-param-change",
          payload: { id: "ord-2", name: "Updated Order" },
        });
      });
    const client = createMockFetchClient(postForQuery);

    const { result, rerender } = renderHook(
      ({ params }) => useQuery(TestSchema, params),
      {
        initialProps: { params: defaultParams },
        wrapper: createWrapper(client),
      },
    );

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(1);
    });

    const updatedParams: QueryParams = {
      ...defaultParams,
      aggregateId: "ord-2",
    };

    rerender({ params: updatedParams });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    expect(capturedSignals[0]?.aborted).toBe(true);
    expect(postForQuery.mock.calls[1]?.[1]?.body).toMatchObject({
      tenant: "test-tenant",
      domain: "Orders",
      queryType: "GetOrder",
      aggregateId: "ord-2",
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        id: "ord-2",
        name: "Updated Order",
      });
    });
  });

  it("surfaces a timeout error after 30 seconds", async () => {
    vi.useFakeTimers();

    const postForQuery = vi.fn().mockImplementation(
      (_path: string, opts?: { signal?: AbortSignal }) =>
        new Promise<QueryResponse<SubmitQueryResponse>>((_resolve, reject) => {
          opts?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const client = createMockFetchClient(postForQuery);

    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error).toMatchObject({
      code: "API_ERROR",
      statusCode: 0,
      body: "Query timed out after 30 seconds",
    });
    expect(result.current.isLoading).toBe(false);

    vi.useRealTimers();
  });
});

describe("useQuery retry with backoff", () => {
  beforeEach(() => {
    mockActiveTenant = "test-tenant";
    mockCommandEventBus = createMockEventBus();
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("retries on network error with backoff", async () => {
    const networkError = new Error("Network failure");
    const postForQuery = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(
        makeQueryResponse({
          correlationId: "q-retry",
          payload: { id: "a", name: "recovered" },
        }),
      );
    const client = createMockFetchClient(postForQuery);

    const { result, unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    expect(postForQuery).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(postForQuery).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual({ id: "a", name: "recovered" });
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("retries on 5xx ApiError", async () => {
    const serverError = new ApiError(503, "Service Unavailable");
    const postForQuery = vi.fn()
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce(
        makeQueryResponse({
          correlationId: "q-5xx",
          payload: { id: "a", name: "ok" },
        }),
      );
    const client = createMockFetchClient(postForQuery);

    const { result, unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    expect(postForQuery).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(postForQuery).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual({ id: "a", name: "ok" });
    unmount();
  });

  it("does NOT retry on ValidationError (Zod parse failure)", async () => {
    // Return data that fails Zod validation
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-val",
        payload: { id: 123, name: null },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    const { result, unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    expect(postForQuery).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBeInstanceOf(ValidationError);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(postForQuery).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("does NOT retry on AuthError", async () => {
    const authError = new AuthError("Token expired");
    const postForQuery = vi.fn().mockRejectedValue(authError);
    const client = createMockFetchClient(postForQuery);

    const { result, unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    expect(postForQuery).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBeInstanceOf(AuthError);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(postForQuery).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("does NOT retry on ForbiddenError", async () => {
    const forbiddenError = new ForbiddenError();
    const postForQuery = vi.fn().mockRejectedValue(forbiddenError);
    const client = createMockFetchClient(postForQuery);

    const { result, unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    expect(postForQuery).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBeInstanceOf(ForbiddenError);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(postForQuery).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("does NOT retry on 4xx ApiError", async () => {
    const clientError = new ApiError(404, "Not Found");
    const postForQuery = vi.fn().mockRejectedValue(clientError);
    const client = createMockFetchClient(postForQuery);

    const { result, unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    expect(postForQuery).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBeInstanceOf(ApiError);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(postForQuery).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("unmount cancels pending retry", async () => {
    const networkError = new Error("Network failure");
    const postForQuery = vi.fn().mockRejectedValue(networkError);
    const client = createMockFetchClient(postForQuery);

    const { unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    expect(postForQuery).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });

    // Unmount before retry fires
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    // Should not have retried after unmount
    expect(postForQuery).toHaveBeenCalledTimes(1);
  });

  it("retry updates connection state via reportFailure and reportSuccess", async () => {
    const networkError = new Error("Network failure");
    const postForQuery = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(
        makeQueryResponse({
          correlationId: "q-report",
          payload: { id: "a", name: "ok" },
        }),
      );
    const client = createMockFetchClient(postForQuery);

    const { result, unmount } = renderHook(
      () => ({
        query: useQuery(TestSchema, defaultParams),
        connection: useConnectionState(),
      }),
      { wrapper: createWrapper(client) },
    );

    expect(postForQuery).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.connection.state).toBe("reconnecting");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.connection.state).toBe("connected");
    expect(result.current.query.data).toEqual({ id: "a", name: "ok" });

    unmount();
  });

  it("returns to connected when transport recovers even if payload validation fails", async () => {
    const networkError = new Error("Network failure");
    const postForQuery = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(
        makeQueryResponse({
          correlationId: "q-malformed",
          payload: { id: 123, name: null },
        }),
      );
    const client = createMockFetchClient(postForQuery);

    const { result, unmount } = renderHook(
      () => ({
        query: useQuery(TestSchema, defaultParams),
        connection: useConnectionState(),
      }),
      { wrapper: createWrapper(client) },
    );

    expect(postForQuery).toHaveBeenCalledTimes(1);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.connection.state).toBe("reconnecting");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(postForQuery).toHaveBeenCalledTimes(2);
    expect(result.current.connection.state).toBe("connected");
    expect(result.current.query.error).toBeInstanceOf(ValidationError);

    unmount();
  });
});

describe("useQuery command-complete invalidation", () => {
  beforeEach(() => {
    mockActiveTenant = "test-tenant";
    mockCommandEventBus = createMockEventBus();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("command-complete invalidation triggers refetch for matching domain", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-inv",
        payload: { id: "a", name: "initial" },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    const { unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(1);
    });

    // Emit command completed for matching domain + tenant
    act(() => {
      mockCommandEventBus.emitCommandCompleted({
        correlationId: "cmd-1",
        domain: "Orders",
        aggregateId: "ord-1",
        tenant: "test-tenant",
      });
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    unmount();
  });

  it("command-complete invalidation does NOT trigger refetch for different domain", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-inv2",
        payload: { id: "a", name: "b" },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    const { unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(1);
    });

    // Emit for different domain
    act(() => {
      mockCommandEventBus.emitCommandCompleted({
        correlationId: "cmd-2",
        domain: "Products",
        aggregateId: "prod-1",
        tenant: "test-tenant",
      });
    });

    // Give time for any potential refetch
    await new Promise((r) => setTimeout(r, 100));

    expect(postForQuery).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("command-complete invalidation does NOT trigger refetch for different tenant", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-inv3",
        payload: { id: "a", name: "b" },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    const { unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(1);
    });

    // Emit for different tenant
    act(() => {
      mockCommandEventBus.emitCommandCompleted({
        correlationId: "cmd-3",
        domain: "Orders",
        aggregateId: "ord-1",
        tenant: "other-tenant",
      });
    });

    await new Promise((r) => setTimeout(r, 100));

    expect(postForQuery).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("invalidation refetch sends If-None-Match header (ETag-aware)", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse(
        { correlationId: "q-etag", payload: { id: "a", name: "b" } },
        '"etag-inv"',
      ),
    );
    const client = createMockFetchClient(postForQuery);

    const { unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(1);
    });

    // Emit command completed to trigger invalidation refetch
    act(() => {
      mockCommandEventBus.emitCommandCompleted({
        correlationId: "cmd-etag",
        domain: "Orders",
        aggregateId: "ord-1",
        tenant: "test-tenant",
      });
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    // Verify ETag header was sent on refetch
    const secondCallOptions = postForQuery.mock.calls[1]?.[1];
    expect(secondCallOptions?.headers?.["If-None-Match"]).toBe('"etag-inv"');
    unmount();
  });
});

describe("useQuery SignalR integration", () => {
  let mockHub: MockSignalRHub;

  beforeEach(() => {
    mockActiveTenant = "test-tenant";
    mockCommandEventBus = createMockEventBus();
    mockHub = new MockSignalRHub();
    _resetSubscriptionState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function createSignalRWrapper(fetchClient: FetchClient) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return createElement(
        ConnectionStateProvider,
        null,
        createElement(SignalRProvider, {
          hubUrl: "http://localhost/hubs/projection-changes",
          accessTokenFactory: vi.fn().mockResolvedValue("token"),
          hub: mockHub,
          children: createElement(QueryProvider, { fetchClient, children }),
        }),
      );
    };
  }

  it("ProjectionChanged triggers refetch for matching domain and tenant", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse(
        {
          correlationId: "q-signalr",
          payload: { id: "a", name: "realtime" },
        },
        '"etag-signalr"',
      ),
    );
    const client = createMockFetchClient(postForQuery);

    const { result, unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createSignalRWrapper(client) },
    );

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: "a", name: "realtime" });
    });

    // Simulate SignalR projection change for matching domain + tenant
    act(() => {
      mockHub.emitProjectionChanged("Orders", "test-tenant");
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    // AC #6: invalidation refetch must include cached If-None-Match
    const secondCallOptions = postForQuery.mock.calls[1]?.[1];
    expect(secondCallOptions?.headers?.["If-None-Match"]).toBe('"etag-signalr"');

    unmount();
  });

  it("ProjectionChanged does NOT trigger refetch for non-matching domain", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-signalr-2",
        payload: { id: "a", name: "b" },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    const { unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createSignalRWrapper(client) },
    );

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(1);
    });

    act(() => {
      mockHub.emitProjectionChanged("Products", "test-tenant");
    });

    await new Promise((r) => setTimeout(r, 100));

    expect(postForQuery).toHaveBeenCalledTimes(1);
    unmount();
  });
});

describe("ETag 304 behavior", () => {
  beforeEach(() => {
    mockActiveTenant = "test-tenant";
    mockCommandEventBus = createMockEventBus();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("no loading flicker or data loss during refetch returning 304", async () => {
    let resolveRefetch!: (value: QueryResponse<SubmitQueryResponse>) => void;
    let callCount = 0;
    const postForQuery = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return makeQueryResponse(
          { correlationId: "q-flicker", payload: { id: "x", name: "cached" } },
          '"etag-flicker"',
        );
      }
      return new Promise<QueryResponse<SubmitQueryResponse>>((resolve) => {
        resolveRefetch = resolve;
      });
    });
    const client = createMockFetchClient(postForQuery);

    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    // (a) Wait for initial load to complete
    await waitFor(() => {
      expect(result.current.data).toEqual({ id: "x", name: "cached" });
    });
    expect(result.current.isLoading).toBe(false);

    // (b) Trigger refetch — starts async fetch with deferred promise
    await act(async () => {
      result.current.refetch();
    });

    // (c) During in-flight: isLoading stays false AND data stays defined
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({ id: "x", name: "cached" });

    // (d) Resolve with 304 — cached data returned
    await act(async () => {
      resolveRefetch({ status: 304, data: null, etag: null });
    });

    expect(result.current.data).toEqual({ id: "x", name: "cached" });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("304 response does not trigger Zod validation", async () => {
    const safeParseSpy = vi.spyOn(TestSchema, "safeParse");
    let callCount = 0;
    const postForQuery = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return makeQueryResponse(
          { correlationId: "q-zod", payload: { id: "z", name: "zod-test" } },
          '"etag-zod"',
        );
      }
      return { status: 304, data: null, etag: null };
    });
    const client = createMockFetchClient(postForQuery);

    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: "z", name: "zod-test" });
    });

    // safeParse called once for initial 200
    expect(safeParseSpy).toHaveBeenCalledTimes(1);

    // Refetch → 304
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    // Primary assertion: data equals cached value, no error
    expect(result.current.data).toEqual({ id: "z", name: "zod-test" });
    expect(result.current.error).toBeNull();

    // Secondary assertion: safeParse not called again on 304
    expect(safeParseSpy).toHaveBeenCalledTimes(1);
  });
});

describe("ETag If-None-Match across refetch sources", () => {
  beforeEach(() => {
    mockActiveTenant = "test-tenant";
    mockCommandEventBus = createMockEventBus();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("cache entry updates with new ETag on subsequent 200", async () => {
    let callCount = 0;
    const postForQuery = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return makeQueryResponse(
          { correlationId: "q-v1", payload: { id: "a", name: "v1" } },
          '"v1"',
        );
      }
      if (callCount === 2) {
        return makeQueryResponse(
          { correlationId: "q-v2", payload: { id: "a", name: "v2" } },
          '"v2"',
        );
      }
      return makeQueryResponse(
        { correlationId: "q-v3", payload: { id: "a", name: "v3" } },
        '"v3"',
      );
    });
    const client = createMockFetchClient(postForQuery);

    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: "a", name: "v1" });
    });

    // First refetch → gets ETag "v2"
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    // Second refetch → should send If-None-Match: "v2" (not "v1")
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(3);
    });

    const thirdCallOptions = postForQuery.mock.calls[2]?.[1];
    expect(thirdCallOptions?.headers?.["If-None-Match"]).toBe('"v2"');
  });

  it("polling refetch sends If-None-Match header", async () => {
    vi.useFakeTimers();
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse(
        { correlationId: "q-poll", payload: { id: "a", name: "poll" } },
        '"etag-poll"',
      ),
    );
    const client = createMockFetchClient(postForQuery);

    renderHook(
      () => useQuery(TestSchema, defaultParams, { refetchInterval: 5000 }),
      { wrapper: createWrapper(client) },
    );

    // Flush initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(postForQuery).toHaveBeenCalledTimes(1);

    // Advance to trigger poll
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(postForQuery).toHaveBeenCalledTimes(2);

    // Verify polling request includes If-None-Match
    const secondCallOptions = postForQuery.mock.calls[1]?.[1];
    expect(secondCallOptions?.headers?.["If-None-Match"]).toBe('"etag-poll"');

    vi.useRealTimers();
  });

  it("window focus refetch sends If-None-Match header", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse(
        { correlationId: "q-focus", payload: { id: "a", name: "focus" } },
        '"etag-focus"',
      ),
    );
    const client = createMockFetchClient(postForQuery);

    const { unmount } = renderHook(
      () => useQuery(TestSchema, defaultParams, { refetchOnWindowFocus: true }),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(1);
    });

    // Simulate tab coming back to focus
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    const secondCallOptions = postForQuery.mock.calls[1]?.[1];
    expect(secondCallOptions?.headers?.["If-None-Match"]).toBe('"etag-focus"');

    unmount();
  });

  it("stale ETag recovery -- backend rejects old ETag with 200", async () => {
    let callCount = 0;
    const postForQuery = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return makeQueryResponse(
          { correlationId: "q-stale1", payload: { id: "a", name: "old" } },
          '"stale"',
        );
      }
      if (callCount === 2) {
        return makeQueryResponse(
          { correlationId: "q-stale2", payload: { id: "a", name: "fresh" } },
          '"fresh"',
        );
      }
      return makeQueryResponse(
        { correlationId: "q-stale3", payload: { id: "a", name: "latest" } },
        '"latest"',
      );
    });
    const client = createMockFetchClient(postForQuery);

    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: "a", name: "old" });
    });

    // Refetch: sends If-None-Match: "stale", backend returns 200 + "fresh"
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    const secondCallOptions = postForQuery.mock.calls[1]?.[1];
    expect(secondCallOptions?.headers?.["If-None-Match"]).toBe('"stale"');
    expect(result.current.data).toEqual({ id: "a", name: "fresh" });

    // Third refetch: should send If-None-Match: "fresh" (not "stale")
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(3);
    });

    const thirdCallOptions = postForQuery.mock.calls[2]?.[1];
    expect(thirdCallOptions?.headers?.["If-None-Match"]).toBe('"fresh"');
  });

  it("concurrent useQuery hooks sharing same cache key both use latest ETag", async () => {
    let callCount = 0;
    const postForQuery = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount <= 2) {
        // Initial fetches for both hooks
        return makeQueryResponse(
          { correlationId: `q-shared-${callCount}`, payload: { id: "a", name: "shared" } },
          '"shared-v1"',
        );
      }
      if (callCount === 3) {
        // Hook A refetch → returns new ETag
        return makeQueryResponse(
          { correlationId: "q-shared-3", payload: { id: "a", name: "updated" } },
          '"shared-v2"',
        );
      }
      // Hook B refetch → 304
      return { status: 304, data: null, etag: null };
    });
    const client = createMockFetchClient(postForQuery);

    const { result } = renderHook(
      () => ({
        a: useQuery(TestSchema, defaultParams),
        b: useQuery(TestSchema, defaultParams),
      }),
      { wrapper: createWrapper(client) },
    );

    // Wait for both initial fetches
    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(result.current.a.data).toBeDefined();
      expect(result.current.b.data).toBeDefined();
    });

    // Refetch hook A → gets new ETag "shared-v2"
    await act(async () => {
      result.current.a.refetch();
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(3);
    });

    // Refetch hook B → should send If-None-Match: "shared-v2" (updated by hook A)
    await act(async () => {
      result.current.b.refetch();
    });

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(4);
    });

    const fourthCallOptions = postForQuery.mock.calls[3]?.[1];
    expect(fourthCallOptions?.headers?.["If-None-Match"]).toBe('"shared-v2"');
  });
});

describe("useQuery stale-while-revalidate", () => {
  const paramsA: QueryParams = { domain: "Orders", queryType: "GetOrder", aggregateId: "ord-1" };
  const paramsB: QueryParams = { domain: "Orders", queryType: "GetOrder", aggregateId: "ord-2" };

  beforeEach(() => {
    mockActiveTenant = "test-tenant";
    mockCommandEventBus = createMockEventBus();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fresh cache hit renders data immediately with no network request", async () => {
    const postForQuery = vi.fn()
      .mockResolvedValueOnce(
        makeQueryResponse(
          { correlationId: "q-1", payload: { id: "a", name: "dataA" } },
          '"etag-a"',
        ),
      )
      .mockResolvedValueOnce(
        makeQueryResponse(
          { correlationId: "q-2", payload: { id: "b", name: "dataB" } },
          '"etag-b"',
        ),
      );
    const client = createMockFetchClient(postForQuery);

    const { result, rerender } = renderHook(
      ({ params }) => useQuery(TestSchema, params),
      {
        initialProps: { params: paramsA },
        wrapper: createWrapper(client),
      },
    );

    // Populate cache for paramsA
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.data).toEqual({ id: "a", name: "dataA" });
    expect(postForQuery).toHaveBeenCalledTimes(1);

    // Switch to paramsB (populates different cache entry)
    rerender({ params: paramsB });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.data).toEqual({ id: "b", name: "dataB" });
    expect(postForQuery).toHaveBeenCalledTimes(2);

    // Advance 1 minute (paramsA cache still fresh < 5 min)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    // Switch back to paramsA — fresh cache, no new fetch
    rerender({ params: paramsA });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.data).toEqual({ id: "a", name: "dataA" });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
    expect(postForQuery).toHaveBeenCalledTimes(2); // No additional fetch
  });

  it("stale cache hit renders cached data and revalidates in background", async () => {
    const postForQuery = vi.fn()
      .mockResolvedValueOnce(
        makeQueryResponse(
          { correlationId: "q-1", payload: { id: "a", name: "old" } },
          '"etag-old"',
        ),
      )
      .mockResolvedValueOnce(
        makeQueryResponse(
          { correlationId: "q-2", payload: { id: "b", name: "dataB" } },
          '"etag-b"',
        ),
      )
      .mockResolvedValueOnce(
        makeQueryResponse(
          { correlationId: "q-3", payload: { id: "a", name: "fresh" } },
          '"etag-fresh"',
        ),
      );
    const client = createMockFetchClient(postForQuery);

    const { result, rerender } = renderHook(
      ({ params }) => useQuery(TestSchema, params),
      {
        initialProps: { params: paramsA },
        wrapper: createWrapper(client),
      },
    );

    // Populate cache for paramsA
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.data).toEqual({ id: "a", name: "old" });
    expect(postForQuery).toHaveBeenCalledTimes(1);

    // Switch to paramsB
    rerender({ params: paramsB });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.data).toEqual({ id: "b", name: "dataB" });
    expect(postForQuery).toHaveBeenCalledTimes(2);

    // Advance past freshness threshold (6 minutes)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
    });

    // Switch back to paramsA — stale cache, show old data + revalidate
    rerender({ params: paramsA });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Data available immediately from stale cache, no loading
    expect(result.current.isLoading).toBe(false);

    // Background revalidation completes
    expect(postForQuery).toHaveBeenCalledTimes(3);
    expect(result.current.data).toEqual({ id: "a", name: "fresh" });
    expect(result.current.isRefreshing).toBe(false);
  });

  it("no cache shows loading state", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse({
        correlationId: "q-nocache",
        payload: { id: "a", name: "b" },
      }),
    );
    const client = createMockFetchClient(postForQuery);

    const { result } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRefreshing).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.data).toEqual({ id: "a", name: "b" });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
  });

  it("background revalidation updates data in-place when fresh response received", async () => {
    let resolveThirdFetch!: (value: unknown) => void;

    const postForQuery = vi.fn()
      .mockResolvedValueOnce(
        makeQueryResponse(
          { correlationId: "q-1", payload: { id: "a", name: "initial" } },
          '"etag-1"',
        ),
      )
      .mockResolvedValueOnce(
        makeQueryResponse(
          { correlationId: "q-2", payload: { id: "b", name: "dataB" } },
          '"etag-b"',
        ),
      )
      .mockImplementationOnce(
        () => new Promise((resolve) => { resolveThirdFetch = resolve; }),
      );
    const client = createMockFetchClient(postForQuery);

    const { result, rerender } = renderHook(
      ({ params }) => useQuery(TestSchema, params),
      {
        initialProps: { params: paramsA },
        wrapper: createWrapper(client),
      },
    );

    // Populate cache for paramsA
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.data).toEqual({ id: "a", name: "initial" });

    // Switch to paramsB
    rerender({ params: paramsB });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.data).toEqual({ id: "b", name: "dataB" });

    // Make paramsA stale
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
    });

    // Switch back to paramsA — stale cache triggers background revalidation
    rerender({ params: paramsA });

    // Stale data shown immediately (from cache)
    expect(result.current.data).toEqual({ id: "a", name: "initial" });
    expect(result.current.isLoading).toBe(false);

    // Resolve background fetch
    await act(async () => {
      resolveThirdFetch(
        makeQueryResponse(
          { correlationId: "q-3", payload: { id: "a", name: "refreshed" } },
          '"etag-2"',
        ),
      );
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.data).toEqual({ id: "a", name: "refreshed" });
  });
});

describe("ETag tenant switch", () => {
  beforeEach(() => {
    mockActiveTenant = "test-tenant";
    mockCommandEventBus = createMockEventBus();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tenant switch clears ETag cache and refetches without If-None-Match", async () => {
    const postForQuery = vi.fn().mockResolvedValue(
      makeQueryResponse(
        { correlationId: "q-tenant", payload: { id: "a", name: "b" } },
        '"etag-tenant"',
      ),
    );
    const client = createMockFetchClient(postForQuery);

    const { rerender } = renderHook(
      () => useQuery(TestSchema, defaultParams),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(1);
    });

    // Verify first call has no If-None-Match (cold start)
    expect(postForQuery.mock.calls[0]?.[1]?.headers?.["If-None-Match"]).toBeUndefined();

    // Switch tenant — cache should be cleared by QueryProvider
    mockActiveTenant = "other-tenant";
    rerender();

    await waitFor(() => {
      expect(postForQuery).toHaveBeenCalledTimes(2);
    });

    // After tenant switch, no If-None-Match (cache cleared, new tenant key)
    const secondCallOptions = postForQuery.mock.calls[1]?.[1];
    expect(secondCallOptions?.headers?.["If-None-Match"]).toBeUndefined();
    expect(secondCallOptions?.body?.tenant).toBe("other-tenant");
  });
});

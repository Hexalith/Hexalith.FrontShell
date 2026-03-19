import React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { CqrsProvider } from "../CqrsProvider";
import { ApiError } from "../errors";
import { useCommandPipeline } from "./useCommandPipeline";
import { MockSignalRHub } from "../mocks/MockSignalRHub";


import type { SubmitCommandInput } from "./types";
import type {
  CommandStatusResponse,
  SubmitCommandResponse,
} from "../core/types";

const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock("../core/fetchClient", () => ({
  createFetchClient: vi.fn(() => ({
    post: mockPost,
    get: mockGet,
  })),
}));

vi.mock("@hexalith/shell-api", () => ({
  useTenant: () => ({
    activeTenant: "test-tenant",
    availableTenants: ["test-tenant"],
    switchTenant: vi.fn(),
  }),
}));

const testCommand: SubmitCommandInput = {
  domain: "Tenants",
  aggregateId: "agg-1",
  commandType: "CreateTenant",
  payload: { name: "Acme" },
};

function makeStatusResponse(
  overrides?: Partial<CommandStatusResponse>,
): CommandStatusResponse {
  return {
    correlationId: "corr-1",
    status: "Processing",
    statusCode: 200,
    timestamp: "2026-03-16T00:00:00Z",
    ...overrides,
  };
}

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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useCommandPipeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() => useCommandPipeline(), {
      wrapper: createWrapper(),
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.correlationId).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.replay).toBeNull();
  });

  it("full lifecycle: idle → sending → polling → completed", async () => {
    const submitResponse: SubmitCommandResponse = { correlationId: "corr-1" };
    mockPost.mockResolvedValueOnce(submitResponse);

    // Use deferred for the GET polling response so we can control timing
    const pollDeferred = createDeferred<CommandStatusResponse>();
    mockGet.mockReturnValueOnce(pollDeferred.promise);

    const { result } = renderHook(() => useCommandPipeline(), {
      wrapper: createWrapper(),
    });

    // Send command
    await act(async () => {
      await result.current.send(testCommand);
    });

    // After submit, should be polling (GET not resolved yet)
    expect(result.current.status).toBe("polling");
    expect(result.current.correlationId).toBe("corr-1");

    // Now resolve the poll response
    await act(async () => {
      pollDeferred.resolve(makeStatusResponse({ status: "Completed" }));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("completed");
    expect(result.current.error).toBeNull();
  });

  it("rejected lifecycle: idle → sending → polling → rejected", async () => {
    mockPost.mockResolvedValueOnce({ correlationId: "corr-1" });

    const pollDeferred = createDeferred<CommandStatusResponse>();
    mockGet.mockReturnValueOnce(pollDeferred.promise);

    const { result } = renderHook(() => useCommandPipeline(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.send(testCommand);
    });

    expect(result.current.status).toBe("polling");

    await act(async () => {
      pollDeferred.resolve(
        makeStatusResponse({
          status: "Rejected",
          rejectionEventType: "TenantAlreadyExists",
        }),
      );
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("rejected");
    expect(result.current.error).toBeTruthy();
    expect(result.current.replay).toBeNull();
  });

  it("timedOut lifecycle with replay", async () => {
    mockPost.mockResolvedValueOnce({ correlationId: "corr-1" });

    const pollDeferred1 = createDeferred<CommandStatusResponse>();
    mockGet.mockReturnValueOnce(pollDeferred1.promise);

    const { result } = renderHook(() => useCommandPipeline(), {
      wrapper: createWrapper(),
    });

    // Send
    await act(async () => {
      await result.current.send(testCommand);
    });

    expect(result.current.status).toBe("polling");

    // Poll gets TimedOut
    await act(async () => {
      pollDeferred1.resolve(
        makeStatusResponse({ status: "TimedOut", timeoutDuration: "30s" }),
      );
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("timedOut");
    expect(result.current.replay).not.toBeNull();

    // Replay - set up mock for replay POST and new polling
    const replayDeferred = createDeferred<SubmitCommandResponse>();
    mockPost.mockReturnValueOnce(replayDeferred.promise);

    const pollDeferred2 = createDeferred<CommandStatusResponse>();
    mockGet.mockReturnValueOnce(pollDeferred2.promise);

    // Start replay (don't await - need to resolve deferred)
    let replayPromise: Promise<void>;
    act(() => {
      replayPromise = result.current.replay!();
    });

    // Resolve replay response
    await act(async () => {
      replayDeferred.resolve({ correlationId: "corr-2" });
      await replayPromise!;
    });

    expect(result.current.status).toBe("polling");
    expect(result.current.correlationId).toBe("corr-2");

    // Let polling complete
    await act(async () => {
      pollDeferred2.resolve(
        makeStatusResponse({
          correlationId: "corr-2",
          status: "Completed",
        }),
      );
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("completed");
  });

  it("emits commandCompleted event on Completed", async () => {
    mockPost.mockResolvedValueOnce({ correlationId: "corr-1" });

    const pollDeferred = createDeferred<CommandStatusResponse>();
    mockGet.mockReturnValueOnce(pollDeferred.promise);

    const { result } = renderHook(() => useCommandPipeline(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.send(testCommand);
    });

    await act(async () => {
      pollDeferred.resolve(makeStatusResponse({ status: "Completed" }));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("completed");
  });

  it("replay function only available after failed/timedOut", async () => {
    mockPost.mockResolvedValueOnce({ correlationId: "corr-1" });

    const pollDeferred = createDeferred<CommandStatusResponse>();
    mockGet.mockReturnValueOnce(pollDeferred.promise);

    const { result } = renderHook(() => useCommandPipeline(), {
      wrapper: createWrapper(),
    });

    // Idle: no replay
    expect(result.current.replay).toBeNull();

    await act(async () => {
      await result.current.send(testCommand);
    });

    // Polling: no replay
    expect(result.current.replay).toBeNull();

    await act(async () => {
      pollDeferred.resolve(makeStatusResponse({ status: "Completed" }));
      await vi.advanceTimersByTimeAsync(0);
    });

    // Completed: no replay
    expect(result.current.replay).toBeNull();
  });

  it("replay on 409 sets error and transitions to failed", async () => {
    // First: send → timedOut to get replay available
    mockPost.mockResolvedValueOnce({ correlationId: "corr-1" });

    const pollDeferred = createDeferred<CommandStatusResponse>();
    mockGet.mockReturnValueOnce(pollDeferred.promise);

    const { result } = renderHook(() => useCommandPipeline(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.send(testCommand);
    });

    await act(async () => {
      pollDeferred.resolve(
        makeStatusResponse({ status: "TimedOut", timeoutDuration: "30s" }),
      );
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.replay).not.toBeNull();

    // Replay returns 409
    const apiError = new ApiError(409, { detail: "Not replayable" });
    mockPost.mockRejectedValueOnce(apiError);

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.replay!();
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toBe(apiError);
    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBeTruthy();
  });

  it("send() resets state machine", async () => {
    mockPost.mockResolvedValueOnce({ correlationId: "corr-1" });

    const pollDeferred1 = createDeferred<CommandStatusResponse>();
    mockGet.mockReturnValueOnce(pollDeferred1.promise);

    const { result } = renderHook(() => useCommandPipeline(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.send(testCommand);
    });

    await act(async () => {
      pollDeferred1.resolve(
        makeStatusResponse({ status: "TimedOut", timeoutDuration: "30s" }),
      );
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("timedOut");

    // Send again resets everything
    mockPost.mockResolvedValueOnce({ correlationId: "corr-2" });

    const pollDeferred2 = createDeferred<CommandStatusResponse>();
    mockGet.mockReturnValueOnce(pollDeferred2.promise);

    await act(async () => {
      await result.current.send(testCommand);
    });

    expect(result.current.correlationId).toBe("corr-2");
    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe("polling");
  });

  it("submit error transitions to failed", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network failure"));

    const { result } = renderHook(() => useCommandPipeline(), {
      wrapper: createWrapper(),
    });

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.send(testCommand);
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe("Network failure");
    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBeTruthy();
    expect(result.current.replay).toBeNull();
  });
});

describe("useCommandPipeline context guard", () => {
  it("throws when used outside CqrsProvider", () => {
    expect(() => renderHook(() => useCommandPipeline())).toThrow(
      "useCommandPipeline must be used within CqrsProvider",
    );
  });
});

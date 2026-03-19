import React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { CqrsProvider } from "../CqrsProvider";
import { CommandRejectedError, CommandTimeoutError } from "../errors";
import { MockSignalRHub } from "../mocks/MockSignalRHub";
import { mapTerminalStatus, useCommandStatus } from "./useCommandStatus";

import type { CommandStatusResponse } from "../core/types";

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

const mockSignalRHub = new MockSignalRHub();

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      CqrsProvider,
      {
        commandApiBaseUrl: "https://test",
        tokenGetter: () => Promise.resolve("token"),
        signalRHub: mockSignalRHub,
      },
      children,
    );
  };
}

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

describe("mapTerminalStatus", () => {
  it("maps Completed to completed", () => {
    const result = mapTerminalStatus(
      makeStatusResponse({ status: "Completed" }),
    );
    expect(result.status).toBe("completed");
    expect(result.error).toBeUndefined();
  });

  it("maps Rejected to rejected with CommandRejectedError", () => {
    const result = mapTerminalStatus(
      makeStatusResponse({
        status: "Rejected",
        rejectionEventType: "TenantAlreadyExists",
      }),
    );
    expect(result.status).toBe("rejected");
    expect(result.error).toBeInstanceOf(CommandRejectedError);
  });

  it("maps PublishFailed to failed with CommandTimeoutError", () => {
    const result = mapTerminalStatus(
      makeStatusResponse({
        status: "PublishFailed",
        failureReason: "Broker down",
      }),
    );
    expect(result.status).toBe("failed");
    expect(result.error).toBeInstanceOf(CommandTimeoutError);
  });

  it("maps TimedOut to timedOut with CommandTimeoutError", () => {
    const result = mapTerminalStatus(
      makeStatusResponse({
        status: "TimedOut",
        timeoutDuration: "30s",
      }),
    );
    expect(result.status).toBe("timedOut");
    expect(result.error).toBeInstanceOf(CommandTimeoutError);
  });

  it("maps non-terminal status to polling", () => {
    const result = mapTerminalStatus(
      makeStatusResponse({ status: "Processing" }),
    );
    expect(result.status).toBe("polling");
    expect(result.error).toBeUndefined();
  });
});

describe("useCommandStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns idle state when correlationId is null", () => {
    const { result } = renderHook(() => useCommandStatus(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.response).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("polls immediately on correlationId set", async () => {
    mockGet.mockResolvedValue(makeStatusResponse());

    const { result } = renderHook(() => useCommandStatus("corr-1"), {
      wrapper: createWrapper(),
    });

    // Status transitions to polling immediately
    expect(result.current.status).toBe("polling");

    // Wait for the immediate poll
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockGet).toHaveBeenCalledWith("/api/v1/commands/status/corr-1");
  });

  it("polls every 1000ms", async () => {
    mockGet.mockResolvedValue(makeStatusResponse());

    renderHook(() => useCommandStatus("corr-1"), {
      wrapper: createWrapper(),
    });

    // First immediate poll
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Advance 1 second for next poll
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(mockGet).toHaveBeenCalledTimes(2);

    // Another second
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it("stops on Completed status", async () => {
    mockGet.mockResolvedValue(
      makeStatusResponse({ status: "Completed" }),
    );

    const { result } = renderHook(() => useCommandStatus("corr-1"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("completed");
    expect(result.current.error).toBeNull();

    // Advancing time should NOT trigger more polls
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("stops on Rejected status and sets CommandRejectedError", async () => {
    mockGet.mockResolvedValue(
      makeStatusResponse({
        status: "Rejected",
        rejectionEventType: "TenantAlreadyExists",
      }),
    );

    const { result } = renderHook(() => useCommandStatus("corr-1"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("rejected");
    expect(result.current.error).toBeInstanceOf(CommandRejectedError);
  });

  it("stops on PublishFailed status and sets error", async () => {
    mockGet.mockResolvedValue(
      makeStatusResponse({
        status: "PublishFailed",
        failureReason: "Broker down",
      }),
    );

    const { result } = renderHook(() => useCommandStatus("corr-1"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBeInstanceOf(CommandTimeoutError);
  });

  it("stops on TimedOut status and sets CommandTimeoutError", async () => {
    mockGet.mockResolvedValue(
      makeStatusResponse({
        status: "TimedOut",
        timeoutDuration: "30s",
      }),
    );

    const { result } = renderHook(() => useCommandStatus("corr-1"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("timedOut");
    expect(result.current.error).toBeInstanceOf(CommandTimeoutError);
  });

  it("continues polling on non-terminal statuses", async () => {
    mockGet
      .mockResolvedValueOnce(makeStatusResponse({ status: "Received" }))
      .mockResolvedValueOnce(makeStatusResponse({ status: "Processing" }))
      .mockResolvedValueOnce(makeStatusResponse({ status: "EventsStored" }))
      .mockResolvedValueOnce(makeStatusResponse({ status: "Completed" }));

    const { result } = renderHook(() => useCommandStatus("corr-1"), {
      wrapper: createWrapper(),
    });

    // Immediate poll: Received
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.status).toBe("polling");

    // Processing
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.status).toBe("polling");

    // EventsStored
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.status).toBe("polling");

    // Completed
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.status).toBe("completed");
  });

  it("fetch error stops polling and sets error", async () => {
    const error = new Error("Network failure");
    mockGet.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useCommandStatus("corr-1"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.error).toBeTruthy();

    // No more polls after error
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("cleans up interval on unmount", async () => {
    mockGet.mockResolvedValue(makeStatusResponse());

    const { unmount } = renderHook(() => useCommandStatus("corr-1"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    unmount();

    // Advancing time after unmount should not cause more calls
    const callsBefore = mockGet.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(mockGet).toHaveBeenCalledTimes(callsBefore);
  });
});

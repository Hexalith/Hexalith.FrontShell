import React from "react";
import { renderHook, waitFor, cleanup, act } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

import {
  ConnectionHealthProvider,
  useConnectionHealth,
} from "./ConnectionHealthContext";

function createTimedOutFetch(): ReturnType<typeof vi.fn> {
  return vi.fn().mockImplementation(
    (_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal;
        signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      }),
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true });
  global.fetch = fetchMock;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  cleanup();
});

function renderConnectionHealthHook(backendUrl = "http://localhost:5000") {
  return renderHook(() => useConnectionHealth(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ConnectionHealthProvider backendUrl={backendUrl}>
        {children}
      </ConnectionHealthProvider>
    ),
  });
}

// ── Tests that DON'T need fake timers (simple async fetch) ──

describe("ConnectionHealthProvider", () => {
  it("sets health to 'connected' on successful health check", async () => {
    const { result } = renderConnectionHealthHook();

    await waitFor(() => {
      expect(result.current.health).toBe("connected");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:5000",
      expect.objectContaining({ method: "HEAD" }),
    );
  });

  it("sets health to 'disconnected' immediately on first failure when never connected", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network error"));

    const { result } = renderConnectionHealthHook();

    await waitFor(() => {
      expect(result.current.health).toBe("disconnected");
    });
  });

  it("treats HTTP 503 response as 'connected' (server reachable)", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    const { result } = renderConnectionHealthHook();

    await waitFor(() => {
      expect(result.current.health).toBe("connected");
    });
  });

  it("provides lastChecked date after health check", async () => {
    const { result } = renderConnectionHealthHook();

    await waitFor(() => {
      expect(result.current.lastChecked).toBeInstanceOf(Date);
    });
  });

  it("recovers to 'connected' on success after initial failure", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Network error"))
      .mockResolvedValue({ ok: true });

    vi.useFakeTimers();

    const { result } = renderConnectionHealthHook();

    // First check fails → disconnected immediately (never connected)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.health).toBe("disconnected");

    // Periodic poll at 30s → succeeds → connected
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(result.current.health).toBe("connected");
  });

  it("uses 3-failure threshold when previously connected", async () => {
    // First check succeeds (establishes connection), then failures begin
    fetchMock
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValue(new TypeError("Network error"));

    vi.useFakeTimers();

    const { result } = renderConnectionHealthHook();

    // Initial check succeeds → connected
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.health).toBe("connected");

    // Periodic poll fails → reconnecting (failure 1, threshold=3 for previously connected)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(result.current.health).toBe("reconnecting");

    // Second failure (2s backoff) → still reconnecting
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(result.current.health).toBe("reconnecting");

    // Third failure (4s backoff) → disconnected
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });

    expect(result.current.health).toBe("disconnected");
  });

  it("treats AbortError as no-op (not a failure)", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    fetchMock.mockRejectedValueOnce(abortError).mockResolvedValue({ ok: true });

    vi.useFakeTimers();

    const { result } = renderConnectionHealthHook();

    // First fetch throws AbortError — should be silently ignored (no failure count)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Health should NOT be "disconnected" (AbortError was not counted as a failure)
    expect(result.current.health).not.toBe("disconnected");

    // Advance to next polling interval — second fetch succeeds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(result.current.health).toBe("connected");
  });

  it("disconnects immediately on request timeout when never connected", async () => {
    fetchMock = createTimedOutFetch();
    global.fetch = fetchMock;

    vi.useFakeTimers();

    const { result } = renderConnectionHealthHook();

    // First timeout after 5s → disconnected immediately (never connected)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_100);
    });

    expect(result.current.health).toBe("disconnected");
  });

  it("pauses polling when tab is hidden", async () => {
    vi.useFakeTimers();

    renderConnectionHealthHook();

    // Wait for initial check
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const initialCallCount = fetchMock.mock.calls.length;

    // Simulate tab hidden
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    // Advance past polling interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });

    // Should NOT have made additional fetch calls while hidden
    expect(fetchMock.mock.calls.length).toBe(initialCallCount);

    // Restore visibility
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
  });

  it("fires immediate check on tab visibility return", async () => {
    vi.useFakeTimers();

    renderConnectionHealthHook();

    // Wait for initial check
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Go hidden
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    const callCountBeforeReturn = fetchMock.mock.calls.length;

    // Come back visible
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Should have fired an immediate health check
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callCountBeforeReturn);
  });

  it("cleans up interval, abort controller, and visibility listener on unmount", async () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = renderConnectionHealthHook();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    unmount();

    // Verify visibility listener was removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    removeEventListenerSpy.mockRestore();
  });

  it("provides checkNow function for manual health check", async () => {
    const { result } = renderConnectionHealthHook();

    await waitFor(() => {
      expect(typeof result.current.checkNow).toBe("function");
    });

    const callsBefore = fetchMock.mock.calls.length;

    await act(async () => {
      result.current.checkNow();
    });

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});

describe("useConnectionHealth outside provider", () => {
  it("throws error when used outside ConnectionHealthProvider", () => {
    expect(() => {
      renderHook(() => useConnectionHealth());
    }).toThrow(
      "useConnectionHealth must be used within ConnectionHealthProvider",
    );
  });
});

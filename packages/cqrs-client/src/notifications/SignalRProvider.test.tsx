import { createElement, type ReactNode } from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SignalRProvider, useSignalRHub } from "./SignalRProvider";
import { ConnectionStateProvider, useConnectionState } from "../connection/ConnectionStateProvider";
import { MockSignalRHub } from "../mocks/MockSignalRHub";

function createWrapper(mockHub: MockSignalRHub) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      ConnectionStateProvider,
      null,
      createElement(SignalRProvider, {
        hubUrl: "http://localhost/hubs/projection-changes",
        accessTokenFactory: vi.fn().mockResolvedValue("token"),
        hub: mockHub,
        children,
      }),
    );
  };
}

describe("SignalRProvider", () => {
  let mockHub: MockSignalRHub;

  beforeEach(() => {
    mockHub = new MockSignalRHub();
  });

  it("provides hub via context", () => {
    const { result } = renderHook(() => useSignalRHub(), {
      wrapper: createWrapper(mockHub),
    });

    expect(result.current).toBe(mockHub);
  });

  it("throws when useSignalRHub is used outside provider", () => {
    expect(() => {
      renderHook(() => useSignalRHub());
    }).toThrow("useSignalRHub must be used within SignalRProvider");
  });

  it("reports connected state and signalr transport on connection", () => {
    const { result } = renderHook(
      () => ({
        hub: useSignalRHub(),
        connection: useConnectionState(),
      }),
      { wrapper: createWrapper(mockHub) },
    );

    // Simulate SignalR reconnect (goes through reconnecting → connected)
    act(() => {
      mockHub.simulateDisconnect();
    });

    act(() => {
      mockHub.simulateReconnect();
    });

    expect(result.current.connection.state).toBe("connected");
    expect(result.current.connection.transport).toBe("signalr");
  });

  it("reports disconnected state and polling transport on disconnect", () => {
    const { result } = renderHook(
      () => ({
        hub: useSignalRHub(),
        connection: useConnectionState(),
      }),
      { wrapper: createWrapper(mockHub) },
    );

    act(() => {
      mockHub.simulateDisconnect();
    });

    expect(result.current.connection.state).toBe("disconnected");
    expect(result.current.connection.transport).toBe("polling");
  });

  it("cleans up state listener on unmount", () => {
    const { unmount } = renderHook(() => useSignalRHub(), {
      wrapper: createWrapper(mockHub),
    });

    unmount();

    // After unmount, simulating disconnect should not throw
    // (no setState on unmounted component)
    expect(() => {
      mockHub.simulateDisconnect();
    }).not.toThrow();
  });
});

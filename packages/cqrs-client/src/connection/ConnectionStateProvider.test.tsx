import { createElement, type ReactNode } from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import {
  ConnectionStateProvider,
  useConnectionState,
  useConnectionReporter,
} from "./ConnectionStateProvider";

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(ConnectionStateProvider, null, children);
  };
}

describe("ConnectionStateProvider", () => {
  it("initial state is 'connected' with transport 'polling'", () => {
    const { result } = renderHook(() => useConnectionState(), {
      wrapper: createWrapper(),
    });

    expect(result.current.state).toBe("connected");
    expect(result.current.transport).toBe("polling");
  });

  it("single failure transitions to 'reconnecting'", () => {
    const { result } = renderHook(
      () => ({
        state: useConnectionState(),
        reporter: useConnectionReporter(),
      }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.reporter.reportFailure();
    });

    expect(result.current.state.state).toBe("reconnecting");
  });

  it("two consecutive failures stay in 'reconnecting'", () => {
    const { result } = renderHook(
      () => ({
        state: useConnectionState(),
        reporter: useConnectionReporter(),
      }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.reporter.reportFailure();
      result.current.reporter.reportFailure();
    });

    expect(result.current.state.state).toBe("reconnecting");
  });

  it("three consecutive failures transitions to 'disconnected'", () => {
    const { result } = renderHook(
      () => ({
        state: useConnectionState(),
        reporter: useConnectionReporter(),
      }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.reporter.reportFailure();
      result.current.reporter.reportFailure();
      result.current.reporter.reportFailure();
    });

    expect(result.current.state.state).toBe("disconnected");
  });

  it("success after failure transitions back to 'connected'", () => {
    const { result } = renderHook(
      () => ({
        state: useConnectionState(),
        reporter: useConnectionReporter(),
      }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.reporter.reportFailure();
      result.current.reporter.reportFailure();
      result.current.reporter.reportFailure();
    });

    expect(result.current.state.state).toBe("disconnected");

    act(() => {
      result.current.reporter.reportSuccess();
    });

    expect(result.current.state.state).toBe("connected");
  });

  it("success resets failure counter", () => {
    const { result } = renderHook(
      () => ({
        state: useConnectionState(),
        reporter: useConnectionReporter(),
      }),
      { wrapper: createWrapper() },
    );

    // Two failures
    act(() => {
      result.current.reporter.reportFailure();
      result.current.reporter.reportFailure();
    });
    expect(result.current.state.state).toBe("reconnecting");

    // Success resets counter
    act(() => {
      result.current.reporter.reportSuccess();
    });
    expect(result.current.state.state).toBe("connected");

    // Two more failures — should be reconnecting (not disconnected) since counter was reset
    act(() => {
      result.current.reporter.reportFailure();
      result.current.reporter.reportFailure();
    });
    expect(result.current.state.state).toBe("reconnecting");
  });
});

describe("useConnectionState", () => {
  it("throws when used outside ConnectionStateProvider", () => {
    expect(() => renderHook(() => useConnectionState())).toThrow(
      "useConnectionState must be used within ConnectionStateProvider",
    );
  });
});

describe("useConnectionReporter", () => {
  it("returns reportSuccess and reportFailure", () => {
    const { result } = renderHook(() => useConnectionReporter(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.reportSuccess).toBe("function");
    expect(typeof result.current.reportFailure).toBe("function");
  });

  it("throws when used outside ConnectionStateProvider", () => {
    expect(() => renderHook(() => useConnectionReporter())).toThrow(
      "useConnectionReporter must be used within ConnectionStateProvider",
    );
  });
});

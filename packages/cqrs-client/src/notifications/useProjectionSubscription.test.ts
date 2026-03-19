import {
  createElement,
  Fragment,
  useEffect,
  type ReactNode,
} from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SignalRProvider } from "./SignalRProvider";
import { useProjectionSubscription, _resetSubscriptionState } from "./useProjectionSubscription";
import { ConnectionStateProvider } from "../connection/ConnectionStateProvider";
import { MockSignalRHub } from "../mocks/MockSignalRHub";
import { QueryProvider, useQueryClient } from "../queries/QueryProvider";

import type { CommandEventBus } from "../commands/commandEventBus";
import type { FetchClient } from "../core/fetchClient";

let mockActiveTenant: string | null = "test-tenant";

vi.mock("@hexalith/shell-api", () => ({
  useTenant: () => ({
    activeTenant: mockActiveTenant,
    availableTenants: ["test-tenant"],
    switchTenant: vi.fn(),
  }),
}));

let mockCommandEventBus: CommandEventBus;

vi.mock("../CqrsProvider", () => ({
  useCqrs: () => ({
    fetchClient: {},
    commandEventBus: mockCommandEventBus,
  }),
}));

function createMockEventBus(): CommandEventBus {
  const listeners: Array<
    (event: {
      correlationId: string;
      domain: string;
      aggregateId: string;
      tenant: string;
    }) => void
  > = [];
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

function createMockFetchClient(): FetchClient {
  return {
    post: vi.fn(),
    get: vi.fn(),
    postForQuery: vi.fn(),
  };
}

function InvalidationSpy({
  onInvalidate,
}: {
  onInvalidate: (domain: string, tenant: string) => void;
}) {
  const { onDomainInvalidation } = useQueryClient();
  useEffect(() => {
    return onDomainInvalidation((domain, tenant) => {
      onInvalidate(domain, tenant);
    });
  }, [onDomainInvalidation, onInvalidate]);
  return null;
}

function createWrapper(mockHub: MockSignalRHub) {
  const fetchClient = createMockFetchClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      ConnectionStateProvider,
      null,
      createElement(
        SignalRProvider,
        {
          hubUrl: "http://localhost/hubs/projection-changes",
          accessTokenFactory: vi.fn().mockResolvedValue("token"),
          hub: mockHub,
        },
        createElement(QueryProvider, { fetchClient }, children),
      ),
    );
  };
}

describe("useProjectionSubscription", () => {
  let mockHub: MockSignalRHub;

  beforeEach(() => {
    mockHub = new MockSignalRHub();
    mockActiveTenant = "test-tenant";
    mockCommandEventBus = createMockEventBus();
    _resetSubscriptionState();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls joinGroup on mount", () => {
    renderHook(() => useProjectionSubscription("Orders", "tenant-1"), {
      wrapper: createWrapper(mockHub),
    });

    expect(mockHub.getJoinedGroups()).toEqual([
      { projectionType: "Orders", tenantId: "tenant-1" },
    ]);
  });

  it("calls leaveGroup on unmount (after debounce)", () => {
    const { unmount } = renderHook(
      () => useProjectionSubscription("Orders", "tenant-1"),
      { wrapper: createWrapper(mockHub) },
    );

    unmount();
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockHub.getJoinedGroups()).toEqual([]);
  });

  it("triggers notifyDomainInvalidation on ProjectionChanged", () => {
    const fetchClient = createMockFetchClient();
    const invalidationSpy = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        ConnectionStateProvider,
        null,
        createElement(
          SignalRProvider,
          {
            hubUrl: "http://localhost/hubs",
            accessTokenFactory: vi.fn().mockResolvedValue("token"),
            hub: mockHub,
          },
          createElement(
            QueryProvider,
            { fetchClient },
            createElement(
              Fragment,
              null,
              createElement(InvalidationSpy, {
                onInvalidate: invalidationSpy,
              }),
              children,
            ),
          ),
        ),
      );

    renderHook(
      () => {
        useProjectionSubscription("Orders", "tenant-1");
      },
      { wrapper },
    );

    act(() => {
      mockHub.emitProjectionChanged("Orders", "tenant-1");
    });

    expect(invalidationSpy).toHaveBeenCalledWith("Orders", "tenant-1");
    expect(mockHub.getJoinedGroups()).toEqual([
      { projectionType: "Orders", tenantId: "tenant-1" },
    ]);
  });

  it("does not call LeaveGroup for non-matching projection changes", () => {
    renderHook(() => useProjectionSubscription("Orders", "tenant-1"), {
      wrapper: createWrapper(mockHub),
    });

    act(() => {
      mockHub.emitProjectionChanged("Inventory", "tenant-2");
    });

    // Group should still be active
    expect(mockHub.getJoinedGroups()).toEqual([
      { projectionType: "Orders", tenantId: "tenant-1" },
    ]);
  });

  describe("reference counting", () => {
    it("two hooks same group: first unmount does NOT call LeaveGroup", () => {
      const wrapper = createWrapper(mockHub);

      const hook1 = renderHook(
        () => useProjectionSubscription("Orders", "tenant-1"),
        { wrapper },
      );

      renderHook(
        () => useProjectionSubscription("Orders", "tenant-1"),
        { wrapper },
      );

      // Unmount first hook
      hook1.unmount();
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Group should still be joined (second hook still active)
      expect(mockHub.getJoinedGroups()).toEqual([
        { projectionType: "Orders", tenantId: "tenant-1" },
      ]);
    });

    it("two hooks same group: second unmount DOES call LeaveGroup", () => {
      const wrapper = createWrapper(mockHub);

      const hook1 = renderHook(
        () => useProjectionSubscription("Orders", "tenant-1"),
        { wrapper },
      );

      const hook2 = renderHook(
        () => useProjectionSubscription("Orders", "tenant-1"),
        { wrapper },
      );

      hook1.unmount();
      act(() => {
        vi.advanceTimersByTime(100);
      });
      hook2.unmount();
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockHub.getJoinedGroups()).toEqual([]);
    });
  });

  describe("50-group limit", () => {
    it("49 groups succeeds silently", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const wrapper = createWrapper(mockHub);

      for (let i = 0; i < 49; i++) {
        renderHook(
          () => useProjectionSubscription(`Projection-${i}`, "tenant-1"),
          { wrapper },
        );
      }

      expect(mockHub.getJoinedGroups()).toHaveLength(49);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("50 groups succeeds silently", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const wrapper = createWrapper(mockHub);

      for (let i = 0; i < 50; i++) {
        renderHook(
          () => useProjectionSubscription(`Projection-${i}`, "tenant-1"),
          { wrapper },
        );
      }

      expect(mockHub.getJoinedGroups()).toHaveLength(50);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("51st group warns and does not join", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const wrapper = createWrapper(mockHub);

      for (let i = 0; i < 51; i++) {
        renderHook(
          () => useProjectionSubscription(`Projection-${i}`, "tenant-1"),
          { wrapper },
        );
      }

      expect(mockHub.getJoinedGroups()).toHaveLength(50);
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      expect(consoleWarnSpy.mock.calls[0][0]).toContain("Max group limit (50) exceeded");
      consoleWarnSpy.mockRestore();
    });
  });

  it("unsubscribes from onProjectionChanged on unmount", () => {
    const wrapper = createWrapper(mockHub);

    const { unmount } = renderHook(
      () => useProjectionSubscription("Orders", "tenant-1"),
      { wrapper },
    );

    unmount();
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // After unmount, emitting should not cause errors
    expect(() => {
      mockHub.emitProjectionChanged("Orders", "tenant-1");
    }).not.toThrow();
  });

  it("is a no-op when no SignalRProvider is in tree", () => {
    const fetchClient = createMockFetchClient();
    // Wrapper WITHOUT SignalRProvider
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        ConnectionStateProvider,
        null,
        createElement(QueryProvider, { fetchClient }, children),
      );

    // Should not throw
    expect(() => {
      renderHook(() => useProjectionSubscription("Orders", "tenant-1"), {
        wrapper,
      });
    }).not.toThrow();
  });
});

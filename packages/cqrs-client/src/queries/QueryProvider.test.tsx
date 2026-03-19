import { type ReactNode } from "react";
import { render, renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { QueryProvider, useQueryClient } from "./QueryProvider";

import type { ETagCache } from "./etagCache";
import type { CommandEventBus } from "../commands/commandEventBus";
import type { FetchClient } from "../core/fetchClient";

let mockActiveTenant: string | null = "tenant-1";

vi.mock("@hexalith/shell-api", () => ({
  useTenant: () => ({
    activeTenant: mockActiveTenant,
    availableTenants: ["tenant-1", "tenant-2"],
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

function createMockFetchClient(): FetchClient {
  return {
    post: vi.fn(),
    get: vi.fn(),
    postForQuery: vi.fn(),
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
    return (
      <QueryProvider fetchClient={fetchClient}>{children}</QueryProvider>
    );
  };
}

describe("QueryProvider", () => {
  let mockFetchClient: FetchClient;

  beforeEach(() => {
    mockActiveTenant = "tenant-1";
    mockFetchClient = createMockFetchClient();
    mockCommandEventBus = createMockEventBus();
  });

  it("renders children", () => {
    const { getByText } = render(
      <QueryProvider fetchClient={mockFetchClient}>
        <div>child content</div>
      </QueryProvider>,
    );
    expect(getByText("child content")).toBeTruthy();
  });

  it("provides context with fetchClient, etagCache, and onDomainInvalidation", () => {
    const { result } = renderHook(() => useQueryClient(), {
      wrapper: createWrapper(mockFetchClient),
    });

    expect(result.current.fetchClient).toBe(mockFetchClient);
    expect(result.current.etagCache).toBeDefined();
    expect(result.current.etagCache.get).toBeDefined();
    expect(result.current.etagCache.set).toBeDefined();
    expect(result.current.etagCache.clear).toBeDefined();
    expect(result.current.onDomainInvalidation).toBeDefined();
    expect(typeof result.current.onDomainInvalidation).toBe("function");
  });

  it("notifies domain invalidation listeners when command completes", () => {
    const listener = vi.fn();

    const { result } = renderHook(() => useQueryClient(), {
      wrapper: createWrapper(mockFetchClient),
    });

    result.current.onDomainInvalidation(listener);

    mockCommandEventBus.emitCommandCompleted({
      correlationId: "cmd-1",
      domain: "Orders",
      aggregateId: "ord-1",
      tenant: "tenant-1",
    });

    expect(listener).toHaveBeenCalledWith("Orders", "tenant-1");
  });

  it("unsubscribes domain invalidation listener correctly", () => {
    const listener = vi.fn();

    const { result } = renderHook(() => useQueryClient(), {
      wrapper: createWrapper(mockFetchClient),
    });

    const unsubscribe = result.current.onDomainInvalidation(listener);
    unsubscribe();

    mockCommandEventBus.emitCommandCompleted({
      correlationId: "cmd-2",
      domain: "Orders",
      aggregateId: "ord-1",
      tenant: "tenant-1",
    });

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("useQueryClient", () => {
  beforeEach(() => {
    mockCommandEventBus = createMockEventBus();
  });

  it("throws when used outside QueryProvider", () => {
    expect(() => renderHook(() => useQueryClient())).toThrow(
      "useQueryClient must be used within QueryProvider",
    );
  });
});

describe("ETag cache tenant clearing", () => {
  let mockFetchClient: FetchClient;

  beforeEach(() => {
    mockActiveTenant = "tenant-1";
    mockFetchClient = createMockFetchClient();
    mockCommandEventBus = createMockEventBus();
  });

  it("does NOT clear cache on initial mount", () => {
    let cacheRef: ETagCache | null = null;

    function CacheSpy() {
      const { etagCache } = useQueryClient();
      cacheRef = etagCache;
      return null;
    }

    render(
      <QueryProvider fetchClient={mockFetchClient}>
        <CacheSpy />
      </QueryProvider>,
    );

    // Set a value after mount
    cacheRef!.set("key-1", { data: "test", etag: "e1" });
    expect(cacheRef!.get("key-1")).toBeDefined();
  });

  it("clears cache when tenant changes", () => {
    let cacheRef: ETagCache | null = null;

    function CacheSpy() {
      const { etagCache } = useQueryClient();
      cacheRef = etagCache;
      return null;
    }

    const { rerender } = render(
      <QueryProvider fetchClient={mockFetchClient}>
        <CacheSpy />
      </QueryProvider>,
    );

    // Populate cache
    cacheRef!.set("key-1", { data: "test", etag: "e1" });
    expect(cacheRef!.get("key-1")).toBeDefined();

    // Change tenant
    mockActiveTenant = "tenant-2";
    rerender(
      <QueryProvider fetchClient={mockFetchClient}>
        <CacheSpy />
      </QueryProvider>,
    );

    // Cache should be cleared
    expect(cacheRef!.get("key-1")).toBeUndefined();
  });
});

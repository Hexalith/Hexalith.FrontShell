import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { CqrsProvider, useCqrs } from "./CqrsProvider";
import { MockSignalRHub } from "./mocks/MockSignalRHub";

vi.mock("@hexalith/shell-api", () => ({
  useTenant: () => ({
    activeTenant: "test-tenant",
    availableTenants: ["test-tenant"],
    switchTenant: vi.fn(),
  }),
}));

let capturedCtx: ReturnType<typeof useCqrs> | null = null;

function CqrsConsumer() {
  capturedCtx = useCqrs();
  return null;
}

describe("CqrsProvider", () => {
  it("accepts signalRHub so tests do not start a real SignalR connection", () => {
    const hub = new MockSignalRHub();

    expect(() =>
      render(
        <CqrsProvider
          commandApiBaseUrl="https://example.test"
          tokenGetter={() => Promise.resolve("token")}
          signalRHub={hub}
        >
          <CqrsConsumer />
        </CqrsProvider>,
      ),
    ).not.toThrow();
  });

  it("provides preflightCache in context", () => {
    const hub = new MockSignalRHub();
    capturedCtx = null;

    render(
      <CqrsProvider
        commandApiBaseUrl="https://example.test"
        tokenGetter={() => Promise.resolve("token")}
        signalRHub={hub}
      >
        <CqrsConsumer />
      </CqrsProvider>,
    );

    expect(capturedCtx).not.toBeNull();
    expect(capturedCtx!.preflightCache).toBeDefined();
    expect(typeof capturedCtx!.preflightCache.get).toBe("function");
    expect(typeof capturedCtx!.preflightCache.set).toBe("function");
    expect(typeof capturedCtx!.preflightCache.clear).toBe("function");
  });
});

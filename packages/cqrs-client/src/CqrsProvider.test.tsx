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

function CqrsConsumer() {
  useCqrs();
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
});

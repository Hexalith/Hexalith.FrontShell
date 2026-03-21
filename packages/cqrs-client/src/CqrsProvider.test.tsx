import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { CqrsProvider, useCqrs } from "./CqrsProvider";
import { MockCommandBus } from "./mocks/MockCommandBus";
import { MockQueryBus } from "./mocks/MockQueryBus";
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

  it("delegates postForQuery to queryBus when provided", async () => {
    const hub = new MockSignalRHub();
    const queryBus = new MockQueryBus({ delay: 1 });
    queryBus.setResponse("test-tenant:TestDomain:TestQuery::", { value: 42 });

    capturedCtx = null;

    render(
      <CqrsProvider
        commandApiBaseUrl="http://localhost:mock"
        tokenGetter={() => Promise.resolve("token")}
        signalRHub={hub}
        queryBus={queryBus}
      >
        <CqrsConsumer />
      </CqrsProvider>,
    );

    const result = await capturedCtx!.fetchClient.postForQuery(
      "/api/v1/queries",
      {
        body: {
          tenant: "test-tenant",
          domain: "TestDomain",
          queryType: "TestQuery",
          aggregateId: "",
        },
      },
    );

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.data).toEqual({
        correlationId: "mock-query",
        payload: { value: 42 },
      });
    }
  });

  it("delegates post to commandBus when provided", async () => {
    const hub = new MockSignalRHub();
    const commandBus = new MockCommandBus({ delay: 1, defaultBehavior: "success" });

    capturedCtx = null;

    render(
      <CqrsProvider
        commandApiBaseUrl="http://localhost:mock"
        tokenGetter={() => Promise.resolve("token")}
        signalRHub={hub}
        commandBus={commandBus}
      >
        <CqrsConsumer />
      </CqrsProvider>,
    );

    const result = await capturedCtx!.fetchClient.post<{ correlationId: string }>(
      "/api/v1/commands",
      {
        body: {
          tenant: "test-tenant",
          domain: "TestDomain",
          aggregateId: "test-1",
          commandType: "CreateTest",
          payload: { name: "test" },
        },
      },
    );

    expect(result).toHaveProperty("correlationId");
    expect(commandBus.getCalls()).toHaveLength(1);
    expect(commandBus.getLastCall()!.command.domain).toBe("TestDomain");
  });

  it("mock adapter returns Completed status for command status polling", async () => {
    const hub = new MockSignalRHub();
    const queryBus = new MockQueryBus({ delay: 1 });

    capturedCtx = null;

    render(
      <CqrsProvider
        commandApiBaseUrl="http://localhost:mock"
        tokenGetter={() => Promise.resolve("token")}
        signalRHub={hub}
        queryBus={queryBus}
      >
        <CqrsConsumer />
      </CqrsProvider>,
    );

    const result = await capturedCtx!.fetchClient.get<{
      correlationId: string;
      status: string;
    }>("/api/v1/commands/status/test-correlation-id");

    expect(result.correlationId).toBe("test-correlation-id");
    expect(result.status).toBe("Completed");
  });

  it("without mock props, creates real FetchClient (regression)", () => {
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
    expect(capturedCtx!.fetchClient).toBeDefined();
    expect(typeof capturedCtx!.fetchClient.post).toBe("function");
    expect(typeof capturedCtx!.fetchClient.get).toBe("function");
    expect(typeof capturedCtx!.fetchClient.postForQuery).toBe("function");
  });
});

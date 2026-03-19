import { describe, expect, it } from "vitest";

import { ApiError, CommandRejectedError, CommandTimeoutError } from "../errors";
import { commandBusContractTests, TEST_COMMAND } from "./__contracts__/commandBus.contract.test";
import { MockCommandBus } from "./MockCommandBus";

// Contract tests
commandBusContractTests("MockCommandBus", () => new MockCommandBus(), {
  configureReject: (bus) =>
    (bus as MockCommandBus).configureNextSend({
      type: "reject",
      rejectionEventType: "OrderNotFound",
    }),
  configureTimeout: (bus) =>
    (bus as MockCommandBus).configureNextSend({ type: "timeout" }),
});

// Mock-specific tests
describe("MockCommandBus specifics", () => {
  it("records all send() calls", async () => {
    const bus = new MockCommandBus();
    await bus.send(TEST_COMMAND);
    await bus.send({ ...TEST_COMMAND, commandType: "AnotherCommand" });
    expect(bus.getCalls()).toHaveLength(2);
    expect(bus.getCalls()[0].command.commandType).toBe("TestCommand");
    expect(bus.getCalls()[1].command.commandType).toBe("AnotherCommand");
  });

  it("getLastCall() returns the most recent call", async () => {
    const bus = new MockCommandBus();
    await bus.send(TEST_COMMAND);
    await bus.send({ ...TEST_COMMAND, commandType: "Last" });
    expect(bus.getLastCall()?.command.commandType).toBe("Last");
  });

  it("getLastCall() returns undefined when no calls made", () => {
    const bus = new MockCommandBus();
    expect(bus.getLastCall()).toBeUndefined();
  });

  it("consumes behavior queue FIFO", async () => {
    const bus = new MockCommandBus();
    bus.configureNextSend({ type: "reject", rejectionEventType: "First" });
    bus.configureNextSend({ type: "timeout" });

    // First call: reject
    await expect(bus.send(TEST_COMMAND)).rejects.toBeInstanceOf(CommandRejectedError);
    // Second call: timeout
    await expect(bus.send(TEST_COMMAND)).rejects.toBeInstanceOf(CommandTimeoutError);
    // Third call: falls back to default (success)
    const result = await bus.send(TEST_COMMAND);
    expect(result.correlationId).toBeTruthy();
  });

  it("falls back to defaultBehavior after queue is empty", async () => {
    const bus = new MockCommandBus({ defaultBehavior: "reject" });
    // No queue configured — should use default behavior
    await expect(bus.send(TEST_COMMAND)).rejects.toBeInstanceOf(CommandRejectedError);
  });

  it("reset() clears calls and behavior queue", async () => {
    const bus = new MockCommandBus();
    await bus.send(TEST_COMMAND);
    // Enqueue a behavior, then reset before it's consumed
    bus.configureNextSend({ type: "timeout" });
    bus.reset();

    expect(bus.getCalls()).toHaveLength(0);
    // Queue was cleared, so this should succeed (default behavior)
    const result = await bus.send(TEST_COMMAND);
    expect(result.correlationId).toBeTruthy();
  });

  it("returns ProblemDetails shape for publishFail", async () => {
    const bus = new MockCommandBus();
    bus.configureNextSend({ type: "publishFail", failureReason: "Disk full" });

    try {
      await bus.send(TEST_COMMAND);
      expect.fail("Expected ApiError");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const apiError = e as ApiError;
      expect(apiError.statusCode).toBe(500);
      const body = apiError.body as Record<string, unknown>;
      expect(body.type).toBe("about:blank");
      expect(body.title).toBe("Publish Failed");
      expect(body.status).toBe(500);
      expect(body.detail).toBe("Disk full");
      expect(body.instance).toBe("/api/v1/commands");
    }
  });

  it("throws provided error directly for error behavior", async () => {
    const bus = new MockCommandBus();
    const customError = new Error("Network failure");
    bus.configureNextSend({ type: "error", error: customError });

    await expect(bus.send(TEST_COMMAND)).rejects.toBe(customError);
  });

  it("respects custom delay", async () => {
    const bus = new MockCommandBus({ delay: 100 });
    const start = performance.now();
    await bus.send(TEST_COMMAND);
    expect(performance.now() - start).toBeGreaterThanOrEqual(90);
  });

  it("enforces minimum positive delay even when misconfigured", async () => {
    const bus = new MockCommandBus({ delay: 0 });
    const start = performance.now();
    await bus.send(TEST_COMMAND);
    expect(performance.now() - start).toBeGreaterThan(0);
  });

  it("records correlationId in each call", async () => {
    const bus = new MockCommandBus();
    await bus.send(TEST_COMMAND);
    const call = bus.getLastCall();
    expect(call?.correlationId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/i);
  });
});

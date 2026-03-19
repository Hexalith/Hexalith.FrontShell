import { describe, it, expect, vi } from "vitest";

import {
  createCommandEventBus,
  type CommandCompletedEvent,
} from "./commandEventBus";

const makeEvent = (
  overrides?: Partial<CommandCompletedEvent>,
): CommandCompletedEvent => ({
  correlationId: "corr-1",
  domain: "Tenants",
  aggregateId: "agg-1",
  tenant: "t-1",
  ...overrides,
});

describe("CommandEventBus", () => {
  it("delivers events to subscribed listeners", () => {
    const bus = createCommandEventBus();
    const listener = vi.fn();
    bus.onCommandCompleted(listener);

    const event = makeEvent();
    bus.emitCommandCompleted(event);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(event);
  });

  it("delivers events to multiple listeners", () => {
    const bus = createCommandEventBus();
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    bus.onCommandCompleted(listener1);
    bus.onCommandCompleted(listener2);

    const event = makeEvent();
    bus.emitCommandCompleted(event);

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
  });

  it("stops delivering events after unsubscribe", () => {
    const bus = createCommandEventBus();
    const listener = vi.fn();
    const unsubscribe = bus.onCommandCompleted(listener);

    bus.emitCommandCompleted(makeEvent());
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    bus.emitCommandCompleted(makeEvent({ correlationId: "corr-2" }));
    expect(listener).toHaveBeenCalledOnce();
  });

  it("unsubscribing one listener does not affect others", () => {
    const bus = createCommandEventBus();
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const unsub1 = bus.onCommandCompleted(listener1);
    bus.onCommandCompleted(listener2);

    unsub1();
    bus.emitCommandCompleted(makeEvent());

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledOnce();
  });

  it("does not throw when emitting with no listeners", () => {
    const bus = createCommandEventBus();
    expect(() => bus.emitCommandCompleted(makeEvent())).not.toThrow();
  });
});

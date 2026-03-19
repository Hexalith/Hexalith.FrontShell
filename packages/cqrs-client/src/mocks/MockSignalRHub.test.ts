import { describe, expect, it, vi } from "vitest";

import { MockSignalRHub } from "./MockSignalRHub";

describe("MockSignalRHub", () => {
  it("starts in connected state", () => {
    const hub = new MockSignalRHub();
    expect(hub.connectionState).toBe("connected");
  });

  it("tracks joined groups", () => {
    const hub = new MockSignalRHub();
    hub.joinGroup("Orders", "tenant-1");
    hub.joinGroup("Inventory", "tenant-1");

    const groups = hub.getJoinedGroups();
    expect(groups).toHaveLength(2);
    expect(groups).toEqual([
      { projectionType: "Orders", tenantId: "tenant-1" },
      { projectionType: "Inventory", tenantId: "tenant-1" },
    ]);
  });

  it("does not duplicate groups on re-join", () => {
    const hub = new MockSignalRHub();
    hub.joinGroup("Orders", "tenant-1");
    hub.joinGroup("Orders", "tenant-1");

    expect(hub.getJoinedGroups()).toHaveLength(1);
  });

  it("removes groups on leave", () => {
    const hub = new MockSignalRHub();
    hub.joinGroup("Orders", "tenant-1");
    hub.joinGroup("Inventory", "tenant-1");
    hub.leaveGroup("Orders", "tenant-1");

    expect(hub.getJoinedGroups()).toHaveLength(1);
    expect(hub.getJoinedGroups()[0].projectionType).toBe("Inventory");
  });

  it("ignores leave for non-joined group", () => {
    const hub = new MockSignalRHub();
    hub.leaveGroup("Orders", "tenant-1"); // should not throw
    expect(hub.getJoinedGroups()).toHaveLength(0);
  });

  it("emits projection changed events to listeners", () => {
    const hub = new MockSignalRHub();
    const listener = vi.fn();

    hub.onProjectionChanged(listener);
    hub.emitProjectionChanged("Orders", "tenant-1");

    expect(listener).toHaveBeenCalledWith("Orders", "tenant-1");
  });

  it("supports multiple projection listeners", () => {
    const hub = new MockSignalRHub();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    hub.onProjectionChanged(listener1);
    hub.onProjectionChanged(listener2);
    hub.emitProjectionChanged("Orders", "tenant-1");

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
  });

  it("unsubscribes projection listener via returned cleanup function", () => {
    const hub = new MockSignalRHub();
    const listener = vi.fn();

    const unsubscribe = hub.onProjectionChanged(listener);
    unsubscribe();
    hub.emitProjectionChanged("Orders", "tenant-1");

    expect(listener).not.toHaveBeenCalled();
  });

  it("simulates disconnect", () => {
    const hub = new MockSignalRHub();
    const stateListener = vi.fn();

    hub.onConnectionStateChange(stateListener);
    hub.simulateDisconnect();

    expect(hub.connectionState).toBe("disconnected");
    expect(stateListener).toHaveBeenCalledWith("disconnected");
  });

  it("simulates reconnect (transitions through reconnecting → connected)", () => {
    const hub = new MockSignalRHub();
    const stateListener = vi.fn();

    hub.simulateDisconnect();
    hub.onConnectionStateChange(stateListener);
    hub.simulateReconnect();

    expect(hub.connectionState).toBe("connected");
    expect(stateListener).toHaveBeenCalledWith("reconnecting");
    expect(stateListener).toHaveBeenCalledWith("connected");
    expect(stateListener).toHaveBeenCalledTimes(2);
  });

  it("unsubscribes state listener via returned cleanup function", () => {
    const hub = new MockSignalRHub();
    const stateListener = vi.fn();

    const unsubscribe = hub.onConnectionStateChange(stateListener);
    unsubscribe();
    hub.simulateDisconnect();

    expect(stateListener).not.toHaveBeenCalled();
  });

  it("reset() clears all state", () => {
    const hub = new MockSignalRHub();
    const projListener = vi.fn();
    const stateListener = vi.fn();

    hub.joinGroup("Orders", "tenant-1");
    hub.onProjectionChanged(projListener);
    hub.onConnectionStateChange(stateListener);
    hub.simulateDisconnect();

    hub.reset();

    expect(hub.getJoinedGroups()).toHaveLength(0);
    expect(hub.connectionState).toBe("connected");

    // Listeners were cleared
    hub.emitProjectionChanged("Orders", "tenant-1");
    hub.simulateDisconnect();
    expect(projListener).not.toHaveBeenCalled();
    expect(stateListener).toHaveBeenCalledTimes(1); // only the pre-reset call
  });
});

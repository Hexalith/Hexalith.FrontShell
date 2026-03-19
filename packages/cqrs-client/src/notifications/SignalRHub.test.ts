import { HubConnectionState } from "@microsoft/signalr";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SignalRHub } from "./SignalRHub";

// --- Local mock helpers (not exported) ---

interface MockHubConnection {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  invoke: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  onreconnecting: ReturnType<typeof vi.fn>;
  onreconnected: ReturnType<typeof vi.fn>;
  onclose: ReturnType<typeof vi.fn>;
  state: HubConnectionState;
}

function createMockHubConnection(): MockHubConnection {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    invoke: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    onreconnecting: vi.fn(),
    onreconnected: vi.fn(),
    onclose: vi.fn(),
    state: HubConnectionState.Disconnected,
  };
}

let mockConnection: MockHubConnection;

vi.mock("@microsoft/signalr", () => {
  const HubConnectionState = {
    Disconnected: "Disconnected",
    Connecting: "Connecting",
    Connected: "Connected",
    Disconnecting: "Disconnecting",
    Reconnecting: "Reconnecting",
  };

  return {
    HubConnectionState,
    HubConnectionBuilder: vi.fn().mockImplementation(() => ({
      withUrl: vi.fn().mockReturnThis(),
      withAutomaticReconnect: vi.fn().mockReturnThis(),
      build: vi.fn(() => mockConnection),
    })),
  };
});

describe("SignalRHub", () => {
  let hub: SignalRHub;
  const hubUrl = "http://localhost/hubs/projection-changes";
  const tokenFactory = vi.fn().mockResolvedValue("test-token");

  beforeEach(() => {
    mockConnection = createMockHubConnection();
    hub = new SignalRHub(hubUrl, tokenFactory);
  });

  describe("start()", () => {
    it("sets connected state on successful start", async () => {
      mockConnection.state = HubConnectionState.Connected;
      const stateChanges: string[] = [];
      hub.onConnectionStateChange((s) => stateChanges.push(s));

      await hub.start();

      expect(mockConnection.start).toHaveBeenCalledOnce();
      expect(hub.connectionState).toBe("connected");
      expect(stateChanges).toContain("connected");
    });

    it("start() failure sets disconnected state without throwing", async () => {
      mockConnection.start.mockRejectedValue(new Error("Network error"));

      await hub.start();

      expect(hub.connectionState).toBe("disconnected");
    });
  });

  describe("stop()", () => {
    it("calls connection.stop()", async () => {
      await hub.stop();
      expect(mockConnection.stop).toHaveBeenCalledOnce();
    });
  });

  describe("joinGroup / leaveGroup", () => {
    it("invokes JoinGroup when connected", async () => {
      mockConnection.state = HubConnectionState.Connected;
      await hub.start();

      hub.joinGroup("Orders", "tenant-1");

      expect(mockConnection.invoke).toHaveBeenCalledWith(
        "JoinGroup",
        "Orders",
        "tenant-1",
      );
    });

    it("joinGroup is no-op on invoke when not connected", () => {
      mockConnection.state = HubConnectionState.Disconnected;

      hub.joinGroup("Orders", "tenant-1");

      expect(mockConnection.invoke).not.toHaveBeenCalled();
    });

    it("invokes LeaveGroup when connected", async () => {
      mockConnection.state = HubConnectionState.Connected;
      await hub.start();

      hub.joinGroup("Orders", "tenant-1");
      mockConnection.invoke.mockClear();

      hub.leaveGroup("Orders", "tenant-1");

      expect(mockConnection.invoke).toHaveBeenCalledWith(
        "LeaveGroup",
        "Orders",
        "tenant-1",
      );
    });

    it("leaveGroup removes from tracking Set even when disconnected", async () => {
      // Join while connected
      mockConnection.state = HubConnectionState.Connected;
      await hub.start();
      hub.joinGroup("Orders", "tenant-1");

      // Now disconnect
      mockConnection.state = HubConnectionState.Disconnected;
      hub.leaveGroup("Orders", "tenant-1");

      // Simulate reconnect — group should NOT be re-joined
      mockConnection.invoke.mockClear();
      const onreconnectedCb = mockConnection.onreconnected.mock.calls[0][0];
      mockConnection.state = HubConnectionState.Connected;
      onreconnectedCb("new-connection-id");

      expect(mockConnection.invoke).not.toHaveBeenCalled();
    });
  });

  describe("reconnection", () => {
    it("re-joins all tracked groups after reconnection", async () => {
      mockConnection.state = HubConnectionState.Connected;
      await hub.start();

      hub.joinGroup("Orders", "tenant-1");
      hub.joinGroup("Inventory", "tenant-1");
      hub.joinGroup("Customers", "tenant-2");

      mockConnection.invoke.mockClear();

      // Simulate reconnect
      const onreconnectedCb = mockConnection.onreconnected.mock.calls[0][0];
      onreconnectedCb("new-connection-id");

      // Exactly 3 JoinGroup invocations
      expect(mockConnection.invoke).toHaveBeenCalledTimes(3);
      expect(mockConnection.invoke).toHaveBeenCalledWith(
        "JoinGroup",
        "Orders",
        "tenant-1",
      );
      expect(mockConnection.invoke).toHaveBeenCalledWith(
        "JoinGroup",
        "Inventory",
        "tenant-1",
      );
      expect(mockConnection.invoke).toHaveBeenCalledWith(
        "JoinGroup",
        "Customers",
        "tenant-2",
      );
    });

    it("re-joins correctly when projectionType or tenantId contain colons", async () => {
      mockConnection.state = HubConnectionState.Connected;
      await hub.start();

      hub.joinGroup("ns:Orders", "tenant:alpha");

      mockConnection.invoke.mockClear();
      const onreconnectedCb = mockConnection.onreconnected.mock.calls[0][0];
      onreconnectedCb("new-connection-id");

      expect(mockConnection.invoke).toHaveBeenCalledTimes(1);
      expect(mockConnection.invoke).toHaveBeenCalledWith(
        "JoinGroup",
        "ns:Orders",
        "tenant:alpha",
      );
    });

    it("transitions to reconnecting state", () => {
      const stateChanges: string[] = [];
      hub.onConnectionStateChange((s) => stateChanges.push(s));

      const onreconnectingCb =
        mockConnection.onreconnecting.mock.calls[0][0];
      onreconnectingCb(new Error("dropped"));

      expect(hub.connectionState).toBe("reconnecting");
      expect(stateChanges).toEqual(["reconnecting"]);
    });

    it("transitions to connected after reconnect", () => {
      const stateChanges: string[] = [];
      hub.onConnectionStateChange((s) => stateChanges.push(s));

      const onreconnectedCb = mockConnection.onreconnected.mock.calls[0][0];
      onreconnectedCb("new-id");

      expect(hub.connectionState).toBe("connected");
      expect(stateChanges).toEqual(["connected"]);
    });

    it("transitions to disconnected on close", () => {
      const stateChanges: string[] = [];
      hub.onConnectionStateChange((s) => stateChanges.push(s));

      const oncloseCb = mockConnection.onclose.mock.calls[0][0];
      oncloseCb(new Error("closed"));

      expect(hub.connectionState).toBe("disconnected");
      expect(stateChanges).toEqual(["disconnected"]);
    });
  });

  describe("ProjectionChanged", () => {
    it("notifies listeners on ProjectionChanged", () => {
      const listener = vi.fn();
      hub.onProjectionChanged(listener);

      // Get the handler registered via connection.on('ProjectionChanged', ...)
      const onCall = mockConnection.on.mock.calls.find(
        (c: unknown[]) => c[0] === "ProjectionChanged",
      );
      expect(onCall).toBeDefined();

      const handler = onCall![1];
      handler("Orders", "tenant-1");

      expect(listener).toHaveBeenCalledWith("Orders", "tenant-1");
    });

    it("unsubscribe removes listener", () => {
      const listener = vi.fn();
      const unsubscribe = hub.onProjectionChanged(listener);
      unsubscribe();

      const onCall = mockConnection.on.mock.calls.find(
        (c: unknown[]) => c[0] === "ProjectionChanged",
      );
      const handler = onCall![1];
      handler("Orders", "tenant-1");

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("onConnectionStateChange", () => {
    it("unsubscribe stops notifications", () => {
      const listener = vi.fn();
      const unsub = hub.onConnectionStateChange(listener);
      unsub();

      const oncloseCb = mockConnection.onclose.mock.calls[0][0];
      oncloseCb(new Error("closed"));

      expect(listener).not.toHaveBeenCalled();
    });
  });
});

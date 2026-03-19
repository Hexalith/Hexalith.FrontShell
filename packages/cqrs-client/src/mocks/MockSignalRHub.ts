export type SignalRConnectionState = "connected" | "disconnected" | "reconnecting";

export interface ISignalRHub {
  joinGroup(projectionType: string, tenantId: string): void;
  leaveGroup(projectionType: string, tenantId: string): void;
  onProjectionChanged(
    listener: (projectionType: string, tenantId: string) => void,
  ): () => void;
  readonly connectionState: SignalRConnectionState;
  onConnectionStateChange(
    listener: (state: SignalRConnectionState) => void,
  ): () => void;
}

interface GroupKey {
  projectionType: string;
  tenantId: string;
}

function groupKeyStr(projectionType: string, tenantId: string): string {
  return `${projectionType}:${tenantId}`;
}

export class MockSignalRHub implements ISignalRHub {
  private _connectionState: SignalRConnectionState = "connected";
  private readonly groups = new Set<string>();
  private readonly groupEntries: GroupKey[] = [];
  private readonly projectionListeners = new Set<(projectionType: string, tenantId: string) => void>();
  private readonly stateListeners = new Set<(state: SignalRConnectionState) => void>();

  get connectionState(): SignalRConnectionState {
    return this._connectionState;
  }

  joinGroup(projectionType: string, tenantId: string): void {
    const key = groupKeyStr(projectionType, tenantId);
    if (!this.groups.has(key)) {
      this.groups.add(key);
      this.groupEntries.push({ projectionType, tenantId });
    }
  }

  leaveGroup(projectionType: string, tenantId: string): void {
    const key = groupKeyStr(projectionType, tenantId);
    if (this.groups.has(key)) {
      this.groups.delete(key);
      const idx = this.groupEntries.findIndex(
        (e) => e.projectionType === projectionType && e.tenantId === tenantId,
      );
      if (idx >= 0) this.groupEntries.splice(idx, 1);
    }
  }

  onProjectionChanged(
    listener: (projectionType: string, tenantId: string) => void,
  ): () => void {
    this.projectionListeners.add(listener);
    return () => {
      this.projectionListeners.delete(listener);
    };
  }

  onConnectionStateChange(
    listener: (state: SignalRConnectionState) => void,
  ): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  // --- Test control API ---

  /** Emit a projection changed event to all registered listeners. */
  emitProjectionChanged(projectionType: string, tenantId: string): void {
    for (const listener of this.projectionListeners) {
      listener(projectionType, tenantId);
    }
  }

  /** Simulate a disconnection. */
  simulateDisconnect(): void {
    this._connectionState = "disconnected";
    for (const listener of this.stateListeners) {
      listener("disconnected");
    }
  }

  /** Simulate a reconnection (transitions through reconnecting → connected). */
  simulateReconnect(): void {
    this._connectionState = "reconnecting";
    for (const listener of this.stateListeners) {
      listener("reconnecting");
    }
    this._connectionState = "connected";
    for (const listener of this.stateListeners) {
      listener("connected");
    }
  }

  /** Returns a read-only list of currently joined groups. */
  getJoinedGroups(): ReadonlyArray<{ projectionType: string; tenantId: string }> {
    return [...this.groupEntries];
  }

  /** Reset all state: groups, listeners, connection state. */
  reset(): void {
    this.groups.clear();
    this.groupEntries.length = 0;
    this.projectionListeners.clear();
    this.stateListeners.clear();
    this._connectionState = "connected";
  }
}

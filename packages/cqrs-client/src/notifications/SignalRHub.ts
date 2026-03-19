import {
  HubConnectionBuilder,
  HubConnectionState,
  type HubConnection,
} from "@microsoft/signalr";

import type {
  ISignalRHub,
  SignalRConnectionState,
} from "../mocks/MockSignalRHub";

const GROUP_KEY_SEP = "\u001f";

function groupKey(projectionType: string, tenantId: string): string {
  return `${projectionType}${GROUP_KEY_SEP}${tenantId}`;
}

export class SignalRHub implements ISignalRHub {
  private _connectionState: SignalRConnectionState = "disconnected";
  private readonly connection: HubConnection;
  private readonly trackedGroups = new Set<string>();
  private readonly projectionListeners = new Set<
    (projectionType: string, tenantId: string) => void
  >();
  private readonly stateListeners = new Set<
    (state: SignalRConnectionState) => void
  >();

  constructor(hubUrl: string, accessTokenFactory: () => Promise<string>) {
    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory })
      .withAutomaticReconnect([1000, 3000, 5000, 10000, 30000])
      .build();

    this.connection.on(
      "ProjectionChanged",
      (projectionType: string, tenantId: string) => {
        for (const listener of this.projectionListeners) {
          listener(projectionType, tenantId);
        }
      },
    );

    this.connection.onreconnecting(() => {
      this.setConnectionState("reconnecting");
    });

    this.connection.onreconnected(() => {
      this.setConnectionState("connected");
      this.rejoinGroups();
    });

    this.connection.onclose(() => {
      this.setConnectionState("disconnected");
    });
  }

  get connectionState(): SignalRConnectionState {
    return this._connectionState;
  }

  async start(): Promise<void> {
    try {
      await this.connection.start();
      this.setConnectionState("connected");
    } catch {
      this.setConnectionState("disconnected");
      console.warn(
        "[SignalRHub] Failed to start connection. Queries will use polling.",
      );
    }
  }

  async stop(): Promise<void> {
    await this.connection.stop();
  }

  joinGroup(projectionType: string, tenantId: string): void {
    const key = groupKey(projectionType, tenantId);
    this.trackedGroups.add(key);

    if (this.connection.state === HubConnectionState.Connected) {
      this.connection
        .invoke("JoinGroup", projectionType, tenantId)
        .catch(() => {
          // Silently ignore — group is still tracked for rejoin
        });
    }
  }

  leaveGroup(projectionType: string, tenantId: string): void {
    const key = groupKey(projectionType, tenantId);
    this.trackedGroups.delete(key);

    if (this.connection.state === HubConnectionState.Connected) {
      this.connection
        .invoke("LeaveGroup", projectionType, tenantId)
        .catch(() => {
          // Silently ignore
        });
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

  private setConnectionState(state: SignalRConnectionState): void {
    this._connectionState = state;
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  private rejoinGroups(): void {
    for (const key of this.trackedGroups) {
      const sep = key.indexOf(GROUP_KEY_SEP);
      const projectionType =
        sep === -1 ? key : key.slice(0, sep);
      const tenantId = sep === -1 ? "" : key.slice(sep + GROUP_KEY_SEP.length);
      this.connection
        .invoke("JoinGroup", projectionType, tenantId)
        .catch(() => {
          // Silently ignore — will retry on next reconnect
        });
    }
  }
}

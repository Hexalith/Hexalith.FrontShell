import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import {
  createCommandEventBus,
  type CommandEventBus,
} from "./commands/commandEventBus";
import { ConnectionStateProvider } from "./connection/ConnectionStateProvider";
import { createFetchClient, type FetchClient } from "./core/fetchClient";
import { SignalRProvider } from "./notifications/SignalRProvider";
import { QueryProvider } from "./queries/QueryProvider";
import { createPreflightCache } from "./validation/preflightCache";

import type { ISignalRHub } from "./mocks/MockSignalRHub";
import type { IPreflightCache } from "./validation/preflightCache";

export interface CqrsContextValue {
  fetchClient: FetchClient;
  commandEventBus: CommandEventBus;
  preflightCache: IPreflightCache;
}

const CqrsContext = createContext<CqrsContextValue | null>(null);

export interface CqrsProviderProps {
  commandApiBaseUrl: string;
  tokenGetter: () => Promise<string | null>;
  children: ReactNode;
  /**
   * When set (e.g. `MockSignalRHub` in unit tests), skips creating a real SignalR connection.
   * Production shells should omit this so a live hub is used.
   */
  signalRHub?: ISignalRHub;
}

export function CqrsProvider({
  commandApiBaseUrl,
  tokenGetter,
  children,
  signalRHub,
}: CqrsProviderProps) {
  const fetchClient = useMemo(
    () => createFetchClient({ baseUrl: commandApiBaseUrl, tokenGetter }),
    [commandApiBaseUrl, tokenGetter],
  );
  const commandEventBus = useMemo(() => createCommandEventBus(), []);
  const preflightCache = useMemo(() => createPreflightCache(), []);

  const hubUrl = useMemo(
    () => `${commandApiBaseUrl.replace(/\/+$/, "")}/hubs/projection-changes`,
    [commandApiBaseUrl],
  );

  const accessTokenFactory = useCallback(
    async () => {
      const token = await tokenGetter();
      return token ?? "";
    },
    [tokenGetter],
  );

  const value = useMemo(
    () => ({ fetchClient, commandEventBus, preflightCache }),
    [fetchClient, commandEventBus, preflightCache],
  );

  return (
    <CqrsContext.Provider value={value}>
      <ConnectionStateProvider>
        <SignalRProvider
          hubUrl={hubUrl}
          accessTokenFactory={accessTokenFactory}
          hub={signalRHub}
        >
          <QueryProvider fetchClient={fetchClient}>{children}</QueryProvider>
        </SignalRProvider>
      </ConnectionStateProvider>
    </CqrsContext.Provider>
  );
}

export function useCqrs(callerName = "useCqrs"): CqrsContextValue {
  const ctx = useContext(CqrsContext);
  if (!ctx) {
    throw new Error(`${callerName} must be used within CqrsProvider`);
  }
  return ctx;
}

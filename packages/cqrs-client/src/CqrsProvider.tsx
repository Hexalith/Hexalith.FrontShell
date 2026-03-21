import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { z } from "zod";

import {
  createCommandEventBus,
  type CommandEventBus,
} from "./commands/commandEventBus";
import { ConnectionStateProvider } from "./connection/ConnectionStateProvider";
import {
  createFetchClient,
  type FetchClient,
  type FetchRequestOptions,
  type QueryResponse,
} from "./core/fetchClient";
import { SignalRProvider } from "./notifications/SignalRProvider";
import { QueryProvider } from "./queries/QueryProvider";
import { createPreflightCache } from "./validation/preflightCache";

import type { ICommandBus } from "./core/ICommandBus";
import type { IQueryBus } from "./core/IQueryBus";
import type { SubmitCommandRequest, SubmitQueryRequest } from "./core/types";
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
  /**
   * When provided, queries delegate to this bus instead of making HTTP requests.
   * Used by dev-host and integration tests to inject MockQueryBus.
   */
  queryBus?: IQueryBus;
  /**
   * When provided, command submissions delegate to this bus instead of making HTTP requests.
   * Used by dev-host and integration tests to inject MockCommandBus.
   */
  commandBus?: ICommandBus;
}

/**
 * Schema that accepts any value — used by the mock adapter to pass data through
 * without validation at the adapter level (the real schema validation happens in useQuery).
 */
const passthroughSchema = z.unknown();

/**
 * Creates a FetchClient adapter that delegates to mock IQueryBus/ICommandBus
 * instead of making real HTTP requests.
 */
function createMockAwareFetchClient(
  queryBus?: IQueryBus,
  commandBus?: ICommandBus,
): FetchClient {
  return {
    async post<T>(path: string, options?: FetchRequestOptions): Promise<T> {
      if (path === "/api/v1/commands") {
        if (!commandBus) {
          throw new Error(
            "CqrsProvider: commandBus prop not provided but command submission attempted",
          );
        }
        const body = options?.body as SubmitCommandRequest;
        const response = await commandBus.send(body);
        return response as T;
      }
      throw new Error(`CqrsProvider mock adapter: unhandled POST path: ${path}`);
    },

    async get<T>(path: string): Promise<T> {
      if (path.startsWith("/api/v1/commands/status/")) {
        const correlationId = path.split("/").pop() ?? "";
        return {
          correlationId,
          status: "Completed",
          statusCode: 200,
          timestamp: new Date().toISOString(),
        } as T;
      }
      throw new Error(`CqrsProvider mock adapter: unhandled GET path: ${path}`);
    },

    async postForQuery<T>(
      path: string,
      options?: FetchRequestOptions,
    ): Promise<QueryResponse<T>> {
      if (path === "/api/v1/queries") {
        if (!queryBus) {
          throw new Error(
            "CqrsProvider: queryBus prop not provided but query attempted",
          );
        }
        const body = options?.body as SubmitQueryRequest;
        const rawData = await queryBus.query(body, passthroughSchema);
        return {
          status: 200 as const,
          data: { correlationId: "mock-query", payload: rawData } as T,
          etag: null,
        };
      }
      throw new Error(
        `CqrsProvider mock adapter: unhandled postForQuery path: ${path}`,
      );
    },
  };
}

export function CqrsProvider({
  commandApiBaseUrl,
  tokenGetter,
  children,
  signalRHub,
  queryBus,
  commandBus,
}: CqrsProviderProps) {
  const hasMockBus = queryBus !== undefined || commandBus !== undefined;
  const fetchClient = useMemo(
    () =>
      hasMockBus
        ? createMockAwareFetchClient(queryBus, commandBus)
        : createFetchClient({ baseUrl: commandApiBaseUrl, tokenGetter }),
    [hasMockBus, commandApiBaseUrl, tokenGetter, queryBus, commandBus],
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

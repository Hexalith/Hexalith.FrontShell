import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import { useTenant } from "@hexalith/shell-api";

import { useCqrs } from "../CqrsProvider";
import { createETagCache, type ETagCache } from "./etagCache";

import type { FetchClient } from "../core/fetchClient";

type DomainInvalidationListener = (domain: string, tenant: string) => void;

export interface QueryContextValue {
  fetchClient: FetchClient;
  etagCache: ETagCache;
  onDomainInvalidation: (listener: DomainInvalidationListener) => () => void;
  notifyDomainInvalidation: (domain: string, tenant: string) => void;
}

const QueryContext = createContext<QueryContextValue | null>(null);

export function QueryProvider({
  fetchClient,
  children,
}: {
  fetchClient: FetchClient;
  children: ReactNode;
}) {
  const etagCache = useMemo(() => createETagCache(), []);
  const { activeTenant } = useTenant();
  const prevTenantRef = useRef(activeTenant);

  useEffect(() => {
    if (
      prevTenantRef.current !== undefined &&
      prevTenantRef.current !== activeTenant
    ) {
      etagCache.clear();
    }
    prevTenantRef.current = activeTenant;
  }, [activeTenant, etagCache]);

  // Domain invalidation pub/sub
  const listenersRef = useRef<DomainInvalidationListener[]>([]);

  const onDomainInvalidation = useCallback(
    (listener: DomainInvalidationListener) => {
      listenersRef.current.push(listener);
      return () => {
        const index = listenersRef.current.indexOf(listener);
        if (index >= 0) {
          listenersRef.current.splice(index, 1);
        }
      };
    },
    [],
  );

  const notifyDomainInvalidation = useCallback(
    (domain: string, tenant: string) => {
      for (const listener of [...listenersRef.current]) {
        listener(domain, tenant);
      }
    },
    [],
  );

  // Subscribe to command-complete events from the event bus
  const { commandEventBus } = useCqrs("QueryProvider");

  useEffect(() => {
    const unsubscribe = commandEventBus.onCommandCompleted((event) => {
      notifyDomainInvalidation(event.domain, event.tenant);
    });
    return unsubscribe;
  }, [commandEventBus, notifyDomainInvalidation]);

  const value = useMemo(
    () => ({ fetchClient, etagCache, onDomainInvalidation, notifyDomainInvalidation }),
    [fetchClient, etagCache, onDomainInvalidation, notifyDomainInvalidation],
  );

  return (
    <QueryContext.Provider value={value}>{children}</QueryContext.Provider>
  );
}

export function useQueryClient(): QueryContextValue {
  const ctx = useContext(QueryContext);
  if (!ctx) {
    throw new Error("useQueryClient must be used within QueryProvider");
  }
  return ctx;
}

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ConnectionState = "connected" | "reconnecting" | "disconnected";
export type TransportType = "polling" | "signalr";

interface ConnectionStateContextValue {
  state: ConnectionState;
  transport: TransportType;
  reportSuccess: () => void;
  reportFailure: () => void;
  /** Hub closed or failed to start — terminal for SignalR; does not use the query retry failure ladder. */
  reportSignalRHubDisconnected: () => void;
  setTransport: (transport: TransportType) => void;
}

const ConnectionStateContext =
  createContext<ConnectionStateContextValue | null>(null);

const MAX_CONSECUTIVE_FAILURES = 3;

export function ConnectionStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<ConnectionState>("connected");
  const [transport, setTransport] = useState<TransportType>("polling");
  const failureCountRef = useRef(0);

  const reportSuccess = useCallback(() => {
    failureCountRef.current = 0;
    setState("connected");
  }, []);

  const reportFailure = useCallback(() => {
    failureCountRef.current += 1;
    const count = failureCountRef.current;
    if (count >= MAX_CONSECUTIVE_FAILURES) {
      setState("disconnected");
    } else {
      setState("reconnecting");
    }
  }, []);

  const reportSignalRHubDisconnected = useCallback(() => {
    setState("disconnected");
  }, []);

  const value = useMemo(
    () => ({
      state,
      transport,
      reportSuccess,
      reportFailure,
      reportSignalRHubDisconnected,
      setTransport,
    }),
    [
      state,
      transport,
      reportSuccess,
      reportFailure,
      reportSignalRHubDisconnected,
      setTransport,
    ],
  );

  return (
    <ConnectionStateContext.Provider value={value}>
      {children}
    </ConnectionStateContext.Provider>
  );
}

export function useConnectionState(): {
  state: ConnectionState;
  transport: TransportType;
} {
  const ctx = useContext(ConnectionStateContext);
  if (!ctx) {
    throw new Error(
      "useConnectionState must be used within ConnectionStateProvider",
    );
  }
  return { state: ctx.state, transport: ctx.transport };
}

export function useConnectionReporter(): {
  reportSuccess: () => void;
  reportFailure: () => void;
  reportSignalRHubDisconnected: () => void;
  setTransport: (transport: TransportType) => void;
} {
  const ctx = useContext(ConnectionStateContext);
  if (!ctx) {
    throw new Error(
      "useConnectionReporter must be used within ConnectionStateProvider",
    );
  }
  return {
    reportSuccess: ctx.reportSuccess,
    reportFailure: ctx.reportFailure,
    reportSignalRHubDisconnected: ctx.reportSignalRHubDisconnected,
    setTransport: ctx.setTransport,
  };
}

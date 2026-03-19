import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { SignalRHub } from "./SignalRHub";
import { useConnectionReporter } from "../connection/ConnectionStateProvider";

import type { ISignalRHub } from "../mocks/MockSignalRHub";

const SignalRContext = createContext<ISignalRHub | null>(null);

export interface SignalRProviderProps {
  hubUrl: string;
  accessTokenFactory: () => Promise<string>;
  children: ReactNode;
  /** Override the hub instance (for testing with MockSignalRHub). */
  hub?: ISignalRHub;
}

export function SignalRProvider({
  hubUrl,
  accessTokenFactory,
  children,
  hub: injectedHub,
}: SignalRProviderProps) {
  const {
    reportSuccess,
    reportFailure,
    reportSignalRHubDisconnected,
    setTransport,
  } = useConnectionReporter();
  const hubRef = useRef<SignalRHub | null>(null);
  const resolvedHub: ISignalRHub =
    injectedHub ?? getOrCreateHub(hubRef, hubUrl, accessTokenFactory);

  useEffect(() => {
    const currentHub = resolvedHub;
    const unsub = currentHub.onConnectionStateChange((state) => {
      if (state === "connected") {
        reportSuccess();
        setTransport("signalr");
      } else if (state === "disconnected") {
        reportSignalRHubDisconnected();
        setTransport("polling");
      } else {
        reportFailure();
      }
    });

    // Start the real hub (no-op if injectedHub is provided since it has no start)
    if (!injectedHub && hubRef.current) {
      hubRef.current.start();
    }

    return () => {
      // Unsubscribe from state changes FIRST to prevent updates on unmounted component
      unsub();
      // Then stop the connection
      if (!injectedHub && hubRef.current) {
        hubRef.current.stop();
      }
    };
  }, [
    resolvedHub,
    injectedHub,
    reportSuccess,
    reportFailure,
    reportSignalRHubDisconnected,
    setTransport,
  ]);

  return (
    <SignalRContext.Provider value={resolvedHub}>
      {children}
    </SignalRContext.Provider>
  );
}

function getOrCreateHub(
  ref: React.RefObject<SignalRHub | null>,
  hubUrl: string,
  accessTokenFactory: () => Promise<string>,
): SignalRHub {
  if (!ref.current) {
    ref.current = new SignalRHub(hubUrl, accessTokenFactory);
  }
  return ref.current;
}

export function useSignalRHub(): ISignalRHub {
  const ctx = useContext(SignalRContext);
  if (!ctx) {
    throw new Error("useSignalRHub must be used within SignalRProvider");
  }
  return ctx;
}

/** Direct access to context (returns null if no provider). Used internally by useProjectionSubscription. */
export { SignalRContext };

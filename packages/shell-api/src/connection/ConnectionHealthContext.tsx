import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { ConnectionHealth, ConnectionHealthContextValue } from "../types";

export const ConnectionHealthContext =
  createContext<ConnectionHealthContextValue | null>(null);

const BASE_DELAY = 2000;
const MAX_DELAY = 30_000;
const POLL_INTERVAL = 30_000;
const FETCH_TIMEOUT = 5000;
const FAILURES_TO_DISCONNECT = 3;

export function ConnectionHealthProvider({
  backendUrl,
  children,
}: {
  backendUrl: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const [health, setHealth] = useState<ConnectionHealth>("reconnecting");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const failureCountRef = useRef(0);
  const wasEverConnectedRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHiddenRef = useRef(false);

  const performCheck = useCallback(async () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Abort any in-flight request
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, FETCH_TIMEOUT);

    try {
      await fetch(backendUrl, {
        method: "HEAD",
        mode: "cors",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // ANY HTTP response (including 4xx/5xx) means server is reachable
      failureCountRef.current = 0;
      wasEverConnectedRef.current = true;
      setHealth("connected");
      setLastChecked(new Date());
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      // AbortError is NOT a connection failure (unmount or timeout abort)
      if (
        error instanceof DOMException &&
        error.name === "AbortError" &&
        !didTimeout
      ) {
        return;
      }

      failureCountRef.current += 1;
      setLastChecked(new Date());

      // If never connected, disconnect immediately on first failure.
      // If previously connected, allow multiple failures before disconnecting
      // to tolerate transient network blips.
      const threshold = wasEverConnectedRef.current
        ? FAILURES_TO_DISCONNECT
        : 1;

      if (failureCountRef.current >= threshold) {
        setHealth("disconnected");
      } else {
        setHealth("reconnecting");

        // Schedule retry with exponential backoff
        const delay = Math.min(
          BASE_DELAY * Math.pow(2, failureCountRef.current - 1),
          MAX_DELAY,
        );

        retryTimeoutRef.current = setTimeout(() => {
          performCheck();
        }, delay);
      }
    }
  }, [backendUrl]);

  useEffect(() => {
    // Initial health check
    performCheck();

    // Periodic polling
    intervalRef.current = setInterval(() => {
      if (!isHiddenRef.current) {
        performCheck();
      }
    }, POLL_INTERVAL);

    // Visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        isHiddenRef.current = true;
      } else {
        isHiddenRef.current = false;
        // Fire immediate check when returning to tab
        performCheck();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      // Cleanup: interval, in-flight fetch, retry timeout, visibility listener
      if (intervalRef.current) clearInterval(intervalRef.current);
      controllerRef.current?.abort();
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [performCheck]);

  const checkNow = useCallback(() => {
    performCheck();
  }, [performCheck]);

  const value: ConnectionHealthContextValue = { health, lastChecked, checkNow };

  return (
    <ConnectionHealthContext.Provider value={value}>
      {children}
    </ConnectionHealthContext.Provider>
  );
}

export function useConnectionHealth(): ConnectionHealthContextValue {
  const ctx = useContext(ConnectionHealthContext);
  if (!ctx)
    throw new Error(
      "useConnectionHealth must be used within ConnectionHealthProvider",
    );
  return ctx;
}

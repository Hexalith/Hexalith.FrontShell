import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";

import { useAuth, useTenant } from "@hexalith/shell-api";

import {
  createModuleErrorEvent,
  emitModuleErrorEvent,
} from "./moduleErrorEvents";
import { sessionId } from "./sessionId";

import type {
  ErrorEventContext,
  ModuleErrorEvent,
} from "./moduleErrorEvents";

interface ErrorMonitoringContextValue {
  context: ErrorEventContext;
  emit: (event: ModuleErrorEvent) => void;
}

export const ErrorMonitoringContext =
  createContext<ErrorMonitoringContextValue | null>(null);

export function useErrorMonitoring(): ErrorMonitoringContextValue {
  const ctx = useContext(ErrorMonitoringContext);
  if (!ctx)
    throw new Error(
      "useErrorMonitoring must be used within ErrorMonitoringProvider",
    );
  return ctx;
}

interface ErrorMonitoringProviderProps {
  onModuleError?: (event: ModuleErrorEvent) => void;
  children: React.ReactNode;
}

export function ErrorMonitoringProvider({
  onModuleError,
  children,
}: ErrorMonitoringProviderProps): React.JSX.Element {
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const callbackRef = useRef(onModuleError);
  callbackRef.current = onModuleError;

  const buildVersion =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_VERSION
      ? (import.meta.env.VITE_APP_VERSION as string)
      : "dev";

  const context: ErrorEventContext = useMemo(
    () => ({
      userId: user?.sub ?? "anonymous",
      tenantId: activeTenant ?? "none",
      sessionId,
      buildVersion,
    }),
    [user?.sub, activeTenant, buildVersion],
  );

  const emit = useMemo(
    () => (event: ModuleErrorEvent) =>
      emitModuleErrorEvent(event, callbackRef.current),
    [],
  );

  // Global error handlers (AC6)
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      const error =
        e.error instanceof Error
          ? e.error
          : new Error(e.message || "Unknown global error");

      const event = createModuleErrorEvent(
        "shell",
        error,
        undefined,
        context,
        "global-handler",
      );
      emit(event);
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      const error =
        e.reason instanceof Error ? e.reason : new Error(String(e.reason));
      const event = createModuleErrorEvent(
        "shell",
        error,
        undefined,
        context,
        "global-handler",
      );
      emit(event);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [context, emit]);

  const value = useMemo(() => ({ context, emit }), [context, emit]);

  return (
    <ErrorMonitoringContext.Provider value={value}>
      {children}
    </ErrorMonitoringContext.Provider>
  );
}

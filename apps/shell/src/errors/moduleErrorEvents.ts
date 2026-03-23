import { ApiError } from "@hexalith/cqrs-client";

export type ModuleErrorClassification =
  | "chunk-load-failure"
  | "network-error"
  | "render-error";

export type ErrorEventSource = "error-boundary" | "global-handler";
export type ErrorSeverity = "warning" | "error";

export function classifySeverity(
  classification: ModuleErrorClassification,
): ErrorSeverity {
  return classification === "render-error" ? "error" : "warning";
}

export interface ModuleErrorEvent {
  timestamp: string;
  moduleName: string;
  classification: ModuleErrorClassification;
  errorCode: string;
  severity: ErrorSeverity;
  errorMessage: string;
  stackTrace: string | undefined;
  componentStack: string | undefined;
  userId: string;
  tenantId: string;
  route: string;
  sessionId: string;
  buildVersion: string;
  source: ErrorEventSource;
  count: number;
}

export interface ErrorEventContext {
  userId: string;
  tenantId: string;
  sessionId: string;
  buildVersion: string;
}

/**
 * Classify an error into a module error category.
 *
 * ORDER IS LOAD-BEARING:
 *   1. chunk-load-failure (checked first — messages often contain "fetch")
 *   2. network-error
 *   3. render-error (safe fallback)
 */
export function classifyError(error: unknown): ModuleErrorClassification {
  if (!(error instanceof Error)) return "render-error";

  const msg = error.message;

  // 1. CHECK CHUNK-LOAD FIRST — messages contain "fetch" which also matches network pattern
  if (/dynamically imported module|Loading chunk/i.test(msg))
    return "chunk-load-failure";

  // 2. CHECK NETWORK SECOND — browser-variant messages
  if (error instanceof TypeError && /fetch|network/i.test(msg))
    return "network-error";
  if (error instanceof ApiError && error.statusCode >= 500)
    return "network-error";

  // 3. FALLBACK — always safe
  return "render-error";
}

export function getErrorDisplayMessage(
  classification: ModuleErrorClassification,
  moduleName: string,
): string {
  switch (classification) {
    case "chunk-load-failure":
      return `Unable to load ${moduleName}. Check your connection and try again. Other sections continue to work normally.`;
    case "network-error":
      return `${moduleName} data is temporarily unavailable. Other sections of the application continue to work normally.`;
    case "render-error":
      return `Unable to load ${moduleName}. Other sections continue to work normally.`;
  }
}

export function createModuleErrorEvent(
  moduleName: string,
  error: Error,
  componentStack?: string,
  context?: ErrorEventContext,
  source: ErrorEventSource = "error-boundary",
): ModuleErrorEvent {
  const classification = classifyError(error);
  return {
    timestamp: new Date().toISOString(),
    moduleName,
    classification,
    errorCode: classification,
    severity: classifySeverity(classification),
    errorMessage: error.message,
    stackTrace: error.stack,
    componentStack: componentStack ?? undefined,
    userId: context?.userId ?? "anonymous",
    tenantId: context?.tenantId ?? "none",
    route: typeof window !== "undefined" ? window.location.pathname : "/",
    sessionId: context?.sessionId ?? "unknown",
    buildVersion: context?.buildVersion ?? "dev",
    source,
    count: 1,
  };
}

const MAX_ERROR_LOG_SIZE = 100;
const moduleErrorLog: ModuleErrorEvent[] = [];

const DEDUP_WINDOW_MS = 5_000;

let isEmitting = false;

/** @internal — for testing only */
export function _resetEmittingFlag(): void {
  isEmitting = false;
}

export function emitModuleErrorEvent(
  event: ModuleErrorEvent,
  onModuleError?: (event: ModuleErrorEvent) => void,
  now: () => number = Date.now,
): void {
  if (isEmitting) return;
  isEmitting = true;

  try {
    const currentTime = now();
    const existing = moduleErrorLog.find(
      (e) =>
        e.moduleName === event.moduleName &&
        e.errorCode === event.errorCode &&
        currentTime - new Date(e.timestamp).getTime() < DEDUP_WINDOW_MS,
    );

    if (existing) {
      existing.count += 1;
      return;
    }

    console.error("[ModuleError]", event);
    moduleErrorLog.push(event);
    if (moduleErrorLog.length > MAX_ERROR_LOG_SIZE) {
      moduleErrorLog.shift();
    }

    if (onModuleError) {
      try {
        onModuleError(event);
      } catch {
        console.error("[ModuleError] onModuleError callback threw");
      }
    }
  } finally {
    isEmitting = false;
  }
}

export function getModuleErrorLog(): readonly ModuleErrorEvent[] {
  return [...moduleErrorLog];
}

/** @internal — for testing only */
export function _clearModuleErrorLog(): void {
  moduleErrorLog.length = 0;
}

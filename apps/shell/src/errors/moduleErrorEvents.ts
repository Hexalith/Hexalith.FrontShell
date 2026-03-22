import { ApiError } from "@hexalith/cqrs-client";

export type ModuleErrorClassification =
  | "chunk-load-failure"
  | "network-error"
  | "render-error";

export interface ModuleErrorEvent {
  timestamp: string;
  moduleName: string;
  classification: ModuleErrorClassification;
  errorMessage: string;
  stackTrace: string | undefined;
  componentStack: string | undefined;
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
): ModuleErrorEvent {
  return {
    timestamp: new Date().toISOString(),
    moduleName,
    classification: classifyError(error),
    errorMessage: error.message,
    stackTrace: error.stack,
    componentStack: componentStack ?? undefined,
  };
}

const MAX_ERROR_LOG_SIZE = 50;
const moduleErrorLog: ModuleErrorEvent[] = [];

export function emitModuleErrorEvent(event: ModuleErrorEvent): void {
  console.error("[ModuleError]", event);
  moduleErrorLog.push(event);
  if (moduleErrorLog.length > MAX_ERROR_LOG_SIZE) {
    moduleErrorLog.shift();
  }
}

export function getModuleErrorLog(): readonly ModuleErrorEvent[] {
  return [...moduleErrorLog];
}

/** @internal — for testing only */
export function _clearModuleErrorLog(): void {
  moduleErrorLog.length = 0;
}

import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export interface LazyWithRetryOptions {
  retries?: number;
  retryDelayMs?: number;
}

const CHUNK_LOAD_ERROR_PATTERN =
  /dynamically imported module|Loading chunk|Failed to fetch/i;

function isChunkLoadError(error: unknown): boolean {
  if (error instanceof Error) {
    return CHUNK_LOAD_ERROR_PATTERN.test(error.message);
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a dynamic import loader on chunk load failure.
 * Non-chunk-load errors are thrown immediately without retry.
 */
export async function retryImport<T>(
  loader: () => Promise<T>,
  options?: LazyWithRetryOptions,
): Promise<T> {
  const { retries = 2, retryDelayMs = 1000 } = options ?? {};
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await loader();
    } catch (error) {
      lastError = error;

      // Only retry chunk load errors — throw everything else immediately
      if (!isChunkLoadError(error)) {
        throw error;
      }

      // If we've exhausted all retries, throw
      if (attempt >= retries) {
        break;
      }

      await delay(retryDelayMs);
    }
  }

  throw lastError;
}

/**
 * Wraps React.lazy() with retry logic for chunk load failures.
 * On chunk load failure, retries up to `retries` times with a delay between attempts.
 * Non-chunk-load errors are thrown immediately without retry.
 */
export function lazyWithRetry(
  loader: () => Promise<{ default: ComponentType }>,
  options?: LazyWithRetryOptions,
): LazyExoticComponent<ComponentType> {
  return lazy(() => retryImport(loader, options));
}

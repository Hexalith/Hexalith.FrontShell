import { useCallback, useEffect, useRef, useState } from "react";

import { useTenant } from "@hexalith/shell-api";

import { useConnectionReporter } from "../connection/ConnectionStateProvider";
import {
  ApiError,
  AuthError,
  ForbiddenError,
  RateLimitError,
  ValidationError,
  type HexalithError,
} from "../errors";
import { buildCacheKey } from "./etagCache";
import { useQueryClient } from "./QueryProvider";
import { useProjectionSubscription } from "../notifications/useProjectionSubscription";

import type { SubmitQueryResponse } from "../core/types";
import type { z } from "zod";

export interface QueryParams {
  domain: string;
  queryType: string;
  aggregateId?: string;
  entityId?: string;
}

export interface QueryOptions {
  /** Controls whether the query is active. Default: `true`. */
  enabled?: boolean;
  /** Background polling interval in ms. `undefined` = no polling. */
  refetchInterval?: number;
  /** Re-query when tab returns to foreground. Default: `true`. */
  refetchOnWindowFocus?: boolean;
}

export interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: HexalithError | null;
  refetch: () => void;
}

const BACKOFF_SCHEDULE = [1000, 3000, 5000, 10000, 30000] as const;

function getBackoffDelay(attempt: number): number {
  const base = BACKOFF_SCHEDULE[Math.min(attempt, BACKOFF_SCHEDULE.length - 1)];
  // Jitter: +-25% randomization to prevent thundering herd
  const jitter = base * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, base + jitter);
}

function isRetryableError(err: unknown): boolean {
  // Do NOT retry business/client errors
  if (err instanceof ValidationError) return false;
  if (err instanceof AuthError) return false;
  if (err instanceof ForbiddenError) return false;
  if (err instanceof RateLimitError) return false;
  // Retry ApiError only if 5xx
  if (err instanceof ApiError) return err.statusCode >= 500;
  // Network errors (TypeError: Failed to fetch, etc.) are retryable
  return true;
}

/**
 * Queries projection data with automatic ETag caching, type safety, and runtime Zod validation.
 *
 * @remarks The `schema` parameter must be a stable reference — define Zod schemas at module scope,
 * not inside component bodies. Passing a schema created inline causes infinite re-fetches.
 *
 * @remarks `queryParams` should be a stable reference (useMemo) or a static object.
 * Passing an inline object literal will cause unnecessary re-fetches on every render.
 */
export function useQuery<T>(
  schema: z.ZodType<T>,
  queryParams: QueryParams,
  options?: QueryOptions,
): UseQueryResult<T> {
  const { fetchClient, etagCache, onDomainInvalidation } = useQueryClient();
  const { activeTenant } = useTenant();
  const { reportSuccess, reportFailure } = useConnectionReporter();

  // Subscribe to real-time projection changes via SignalR (no-op if no SignalRProvider)
  useProjectionSubscription(queryParams.domain, activeTenant ?? "");

  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<HexalithError | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const isFetchingRef = useRef(false);

  const enabled = options?.enabled ?? true;
  const refetchInterval = options?.refetchInterval;
  const refetchOnWindowFocus = options?.refetchOnWindowFocus ?? true;

  // Stabilize queryParams into a string key to avoid infinite useCallback re-creation
  const paramsKey = `${queryParams.domain}:${queryParams.queryType}:${queryParams.aggregateId ?? ""}:${queryParams.entityId ?? ""}`;

  const cancelRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const fetchData = useCallback(
    async (isInitial: boolean) => {
      if (!activeTenant) {
        setError(
          new ApiError(0, "No active tenant") as unknown as HexalithError,
        );
        return;
      }

      // Prevent concurrent requests (don't stack retries with polling)
      if (isFetchingRef.current && !isInitial) return;

      if (isInitial) setIsLoading(true);
      isFetchingRef.current = true;

      // Abort previous request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Cancel pending retry since we're starting a new fetch
      cancelRetry();

      // Timeout: abort after 30s to prevent hanging on slow backends
      const timeoutId = setTimeout(() => controller.abort("timeout"), 30_000);
      const signal = controller.signal;

      const cacheKey = buildCacheKey(activeTenant, queryParams);
      const cached = etagCache.get(cacheKey);
      const headers: Record<string, string> = {};
      if (cached) {
        headers["If-None-Match"] = cached.etag;
      }

      const body = {
        tenant: activeTenant,
        domain: queryParams.domain,
        queryType: queryParams.queryType,
        aggregateId: queryParams.aggregateId ?? "",
        entityId: queryParams.entityId,
      };

      try {
        const response = await fetchClient.postForQuery<SubmitQueryResponse>(
          "/api/v1/queries",
          { body, headers, signal },
        );

        clearTimeout(timeoutId);
        isFetchingRef.current = false;

        // Ignore response if this request was aborted (stale)
        if (controller.signal.aborted) return;

        reportSuccess();
        retryCountRef.current = 0;

        if (response.status === 304 && cached) {
          setData(cached.data as T);
        } else if (response.status === 200) {
          const result = schema.safeParse(response.data.payload);
          if (!result.success) {
            setError(new ValidationError(result.error.issues));
            if (isInitial) setIsLoading(false);
            return;
          }

          if (response.etag) {
            etagCache.set(cacheKey, {
              data: result.data,
              etag: response.etag,
            });
          }
          setData(result.data);
        }

        setError(null);
      } catch (err) {
        clearTimeout(timeoutId);
        isFetchingRef.current = false;

        // AbortError from manual abort or timeout
        if (err instanceof DOMException && err.name === "AbortError") {
          // Check if this was a timeout abort
          if (controller.signal.reason === "timeout") {
            setError(
              new ApiError(
                0,
                "Query timed out after 30 seconds",
              ) as unknown as HexalithError,
            );
            if (isInitial) setIsLoading(false);
          }
          return;
        }

        setError(err as HexalithError);

        // Retry logic: only for transient/network errors
        if (isRetryableError(err)) {
          reportFailure();
          const attempt = retryCountRef.current;
          retryCountRef.current = attempt + 1;
          const delay = getBackoffDelay(attempt);
          retryTimeoutRef.current = setTimeout(() => {
            retryTimeoutRef.current = null;
            fetchData(false);
          }, delay);
        }
      } finally {
        if (isInitial) setIsLoading(false);
      }
    },
    // paramsKey (string) instead of queryParams (object) prevents infinite re-renders
    [activeTenant, paramsKey, fetchClient, etagCache, schema, cancelRetry, reportSuccess, reportFailure],
  );

  // Initial fetch + refetch on param change
  useEffect(() => {
    if (!enabled) return;

    // Reset retry state on param change
    retryCountRef.current = 0;
    cancelRetry();

    fetchData(true);

    return () => {
      abortRef.current?.abort();
      cancelRetry();
    };
  }, [enabled, fetchData, cancelRetry]);

  // Polling interval
  useEffect(() => {
    if (!enabled || !refetchInterval) return;
    intervalRef.current = setInterval(() => fetchData(false), refetchInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refetchInterval, fetchData]);

  // Refetch on window focus
  useEffect(() => {
    if (!enabled || !refetchOnWindowFocus) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchData(false);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enabled, refetchOnWindowFocus, fetchData]);

  // Subscribe to domain invalidation (command-complete → refetch)
  useEffect(() => {
    if (!enabled || !onDomainInvalidation) return;

    const unsubscribe = onDomainInvalidation((domain, tenant) => {
      if (domain === queryParams.domain && tenant === activeTenant) {
        fetchData(false);
      }
    });
    return unsubscribe;
  }, [enabled, onDomainInvalidation, queryParams.domain, activeTenant, fetchData]);

  const refetch = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  return { data, isLoading, error, refetch };
}

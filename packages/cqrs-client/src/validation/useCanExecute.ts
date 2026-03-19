import { useEffect, useRef, useState } from "react";

import { useTenant } from "@hexalith/shell-api";

import { useCqrs } from "../CqrsProvider";
import { ApiError, AuthError, HexalithError, RateLimitError } from "../errors";
import { buildPreflightCacheKey } from "./preflightCache";

import type { PreflightValidationResult } from "../core/types";

export interface CanExecuteCommandParams {
  domain: string;
  commandType: string;
  aggregateId?: string;
}

export interface CanExecuteQueryParams {
  domain: string;
  queryType: string;
  aggregateId?: string;
}

export interface UseCanExecuteResult {
  isAuthorized: boolean;
  reason: string | undefined;
  isLoading: boolean;
  error: HexalithError | null;
}

const NO_TENANT_RESULT: UseCanExecuteResult = {
  isAuthorized: false,
  reason: "No active tenant",
  isLoading: false,
  error: null,
};

function useCanExecute(
  endpoint: string,
  params: { domain: string; type: string; aggregateId?: string },
  body: Record<string, unknown>,
): UseCanExecuteResult {
  const { fetchClient, preflightCache } = useCqrs("useCanExecute");
  const { activeTenant } = useTenant();

  const cacheKey = activeTenant
    ? buildPreflightCacheKey(activeTenant, endpoint, params)
    : null;

  const [result, setResult] = useState<UseCanExecuteResult>(() => {
    if (!activeTenant) return NO_TENANT_RESULT;

    if (cacheKey) {
      const cached = preflightCache.get(cacheKey);
      if (cached) {
        return {
          isAuthorized: cached.isAuthorized,
          reason: cached.reason,
          isLoading: false,
          error: null,
        };
      }
    }

    // Fail-closed + request-in-flight signal. `isLoading` should only be true
    // when we'll actually perform the network request.
    return {
      isAuthorized: false,
      reason: undefined,
      isLoading: true,
      error: null,
    };
  });

  // Propagate AuthError/RateLimitError to React error boundary via throw-during-render
  const throwRef = useRef<Error | null>(null);

  const paramsKey = `${params.domain}:${params.type}:${params.aggregateId ?? ""}`;

  useEffect(() => {
    if (!activeTenant) {
      setResult(NO_TENANT_RESULT);
      return;
    }

    const cacheKey = buildPreflightCacheKey(activeTenant, endpoint, params);
    const cached = preflightCache.get(cacheKey);
    if (cached) {
      setResult({
        isAuthorized: cached.isAuthorized,
        reason: cached.reason,
        isLoading: false,
        error: null,
      });
      return;
    }

    const controller = new AbortController();
    setResult({
      isAuthorized: false,
      reason: undefined,
      isLoading: true,
      error: null,
    });

    fetchClient
      .post<PreflightValidationResult>(`/api/v1/${endpoint}`, {
        body: { ...body, tenant: activeTenant },
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) return;
        preflightCache.set(cacheKey, response);
        setResult({
          isAuthorized: response.isAuthorized,
          reason: response.reason,
          isLoading: false,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof AuthError || err instanceof RateLimitError) {
          // Store for throw during next render — propagates to error boundary / auth layer
          throwRef.current = err;
          setResult((prev) => ({ ...prev, isLoading: false }));
          return;
        }
        const hexError =
          err instanceof HexalithError ? err : new ApiError(503, err);
        setResult({
          isAuthorized: false,
          reason: "Authorization service unavailable",
          isLoading: false,
          error: hexError,
        });
      });

    return () => {
      controller.abort();
    };
  }, [activeTenant, endpoint, paramsKey, fetchClient, preflightCache]);

  // Throw AuthError/RateLimitError during render so React error boundary catches it
  if (throwRef.current) {
    const err = throwRef.current;
    throwRef.current = null;
    throw err;
  }

  return result;
}

export function useCanExecuteCommand(
  params: CanExecuteCommandParams,
): UseCanExecuteResult {
  return useCanExecute(
    "commands/validate",
    { domain: params.domain, type: params.commandType, aggregateId: params.aggregateId },
    { domain: params.domain, commandType: params.commandType, aggregateId: params.aggregateId },
  );
}

export function useCanExecuteQuery(
  params: CanExecuteQueryParams,
): UseCanExecuteResult {
  return useCanExecute(
    "queries/validate",
    { domain: params.domain, type: params.queryType, aggregateId: params.aggregateId },
    { domain: params.domain, queryType: params.queryType, aggregateId: params.aggregateId },
  );
}

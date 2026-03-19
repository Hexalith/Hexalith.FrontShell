import { ApiError } from "../errors";
import { generateCorrelationId } from "./correlationId";
import { parseProblemDetails } from "./problemDetails";

export interface FetchClientConfig {
  baseUrl: string;
  tokenGetter: () => Promise<string | null>;
}

export interface FetchRequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  correlationId?: string;
}

/** Discriminated union for query responses — check `status` before accessing `data`. */
export type QueryResponse<T> =
  | { status: 200; data: T; etag: string | null }
  | { status: 304; data: null; etag: null };

export interface FetchClient {
  post<T>(path: string, options?: FetchRequestOptions): Promise<T>;
  get<T>(path: string, options?: FetchRequestOptions): Promise<T>;
  postForQuery<T>(
    path: string,
    options?: FetchRequestOptions,
  ): Promise<QueryResponse<T>>;
}

/**
 * Creates a configured fetch client that injects auth and correlation headers.
 *
 * The client injects `Authorization: Bearer {token}` and `X-Correlation-ID`
 * headers on every request. If `tokenGetter()` returns `null`, the
 * `Authorization` header is omitted (allows pre-auth or public endpoints).
 *
 * Tenant injection is NOT this client's responsibility — tenant is a body
 * field populated by hooks in Stories 2.3-2.4 via `useTenant()` directly.
 */
export function createFetchClient(config: FetchClientConfig): FetchClient {
  const normalizedBaseUrl = config.baseUrl.replace(/\/+$/, "");
  const { tokenGetter } = config;

  async function request<T>(
    method: "GET" | "POST",
    path: string,
    options?: FetchRequestOptions,
  ): Promise<T> {
    // Header priority: custom headers < X-Correlation-ID/Content-Type < Authorization (never overridable)
    const headers: Record<string, string> = {
      ...options?.headers,
      "X-Correlation-ID": options?.correlationId ?? generateCorrelationId(),
    };

    if (method === "POST") {
      headers["Content-Type"] = "application/json";
    }

    // Authorization is set LAST — cannot be overridden by custom headers
    const token = await tokenGetter();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${normalizedBaseUrl}${path}`, {
      method,
      headers,
      body:
        method === "POST" && options?.body != null
          ? JSON.stringify(options.body)
          : undefined,
      signal: options?.signal,
    });

    if (!response.ok) {
      const error = await parseProblemDetails(response);
      throw error;
    }

    return response.json() as Promise<T>;
  }

  async function postForQuery<T>(
    path: string,
    options?: FetchRequestOptions,
  ): Promise<QueryResponse<T>> {
    const headers: Record<string, string> = {
      ...options?.headers,
      "Content-Type": "application/json",
      "X-Correlation-ID": options?.correlationId ?? generateCorrelationId(),
    };

    const token = await tokenGetter();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${normalizedBaseUrl}${path}`, {
      method: "POST",
      headers,
      body: options?.body != null ? JSON.stringify(options.body) : undefined,
      signal: options?.signal,
    });

    // 304 — data unchanged, caller uses cache
    if (response.status === 304) {
      return { status: 304, data: null, etag: null };
    }

    // Non-OK (except 304 handled above) — delegate to error parsing
    if (!response.ok) {
      throw await parseProblemDetails(response);
    }

    // Only 200 is expected — guard against unexpected OK statuses (202, 201, etc.)
    if (response.status !== 200) {
      throw new ApiError(
        response.status,
        `Unexpected status from query endpoint: ${response.status}`,
      );
    }

    // 200 — parse body, extract ETag
    const data = (await response.json()) as T;
    const etag = response.headers.get("ETag");
    return { status: 200, data, etag };
  }

  return {
    post: <T>(path: string, options?: FetchRequestOptions) =>
      request<T>("POST", path, options),
    get: <T>(path: string, options?: FetchRequestOptions) =>
      request<T>("GET", path, options),
    postForQuery,
  };
}

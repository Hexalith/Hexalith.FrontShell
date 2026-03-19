import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  ApiError,
  AuthError,
  ForbiddenError,
  RateLimitError,
} from "../errors";
import { createFetchClient, type FetchClientConfig } from "./fetchClient";

vi.mock("./correlationId", () => ({
  generateCorrelationId: vi.fn(() => "TEST-CORRELATION-ID"),
}));

vi.mock("./problemDetails", () => ({
  parseProblemDetails: vi.fn(),
}));

function createMockResponse(
  status: number,
  body?: unknown,
  headers?: Record<string, string>,
): Response {
  const headersObj = new Headers(headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headersObj,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(
      body !== undefined ? JSON.stringify(body) : "",
    ),
  } as unknown as Response;
}

function defaultConfig(
  overrides?: Partial<FetchClientConfig>,
): FetchClientConfig {
  return {
    baseUrl: "https://api.example.com",
    tokenGetter: vi.fn().mockResolvedValue("test-token"),
    ...overrides,
  };
}

describe("createFetchClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  describe("POST requests", () => {
    it("includes Authorization, Content-Type, X-Correlation-ID, and JSON body", async () => {
      const mockResponse = createMockResponse(200, { id: 1 });
      fetchMock.mockResolvedValue(mockResponse);
      const config = defaultConfig();
      const client = createFetchClient(config);

      await client.post("/api/v1/commands", {
        body: { command: "test" },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/api/v1/commands",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
            "X-Correlation-ID": "TEST-CORRELATION-ID",
          }),
          body: JSON.stringify({ command: "test" }),
        }),
      );
    });
  });

  describe("GET requests", () => {
    it("includes Authorization and X-Correlation-ID, no Content-Type, no body", async () => {
      const mockResponse = createMockResponse(200, { data: "ok" });
      fetchMock.mockResolvedValue(mockResponse);
      const config = defaultConfig();
      const client = createFetchClient(config);

      await client.get("/api/v1/commands/status/abc");

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[0]).toBe(
        "https://api.example.com/api/v1/commands/status/abc",
      );
      expect(callArgs[1].method).toBe("GET");
      expect(callArgs[1].headers).toEqual(
        expect.objectContaining({
          Authorization: "Bearer test-token",
          "X-Correlation-ID": "TEST-CORRELATION-ID",
        }),
      );
      expect(callArgs[1].headers["Content-Type"]).toBeUndefined();
      expect(callArgs[1].body).toBeUndefined();
    });
  });

  describe("correlation ID", () => {
    it("uses custom correlationId when provided", async () => {
      const mockResponse = createMockResponse(200, {});
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      await client.post("/test", { correlationId: "CUSTOM-ID" });

      expect(fetchMock.mock.calls[0][1].headers["X-Correlation-ID"]).toBe(
        "CUSTOM-ID",
      );
    });

    it("auto-generates correlationId when not provided", async () => {
      const mockResponse = createMockResponse(200, {});
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      await client.get("/test");

      expect(fetchMock.mock.calls[0][1].headers["X-Correlation-ID"]).toBe(
        "TEST-CORRELATION-ID",
      );
    });
  });

  describe("token handling", () => {
    it("omits Authorization header when tokenGetter returns null", async () => {
      const mockResponse = createMockResponse(200, {});
      fetchMock.mockResolvedValue(mockResponse);
      const config = defaultConfig({
        tokenGetter: vi.fn().mockResolvedValue(null),
      });
      const client = createFetchClient(config);

      await client.get("/test");

      expect(
        fetchMock.mock.calls[0][1].headers["Authorization"],
      ).toBeUndefined();
    });
  });

  describe("error responses", () => {
    it("throws AuthError for 401 response", async () => {
      const { parseProblemDetails } = await import("./problemDetails");
      const mockParse = vi.mocked(parseProblemDetails);
      const authError = new AuthError("Unauthorized");
      mockParse.mockResolvedValue(authError);

      const mockResponse = createMockResponse(401);
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      await expect(client.get("/test")).rejects.toThrow(authError);
      await expect(client.get("/test")).rejects.toBeInstanceOf(AuthError);
    });

    it("throws ForbiddenError for 403 response", async () => {
      const { parseProblemDetails } = await import("./problemDetails");
      const mockParse = vi.mocked(parseProblemDetails);
      const forbiddenError = new ForbiddenError("Forbidden");
      mockParse.mockResolvedValue(forbiddenError);

      const mockResponse = createMockResponse(403);
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      await expect(client.get("/test")).rejects.toThrow(forbiddenError);
      await expect(client.get("/test")).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("throws RateLimitError with Retry-After for 429 response via parseProblemDetails", async () => {
      const { parseProblemDetails } = await import("./problemDetails");
      const mockParse = vi.mocked(parseProblemDetails);
      const rateLimitError = new RateLimitError("30");
      mockParse.mockResolvedValue(rateLimitError);

      const mockResponse = createMockResponse(429, undefined, {
        "Retry-After": "30",
      });
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      try {
        await client.get("/test");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBe("30");
      }

      expect(mockParse).toHaveBeenCalledWith(mockResponse);
    });

    it("delegates 429 to parseProblemDetails (preserves ProblemDetails context)", async () => {
      const { parseProblemDetails } = await import("./problemDetails");
      const mockParse = vi.mocked(parseProblemDetails);
      const rateLimitError = new RateLimitError(undefined);
      mockParse.mockResolvedValue(rateLimitError);

      const mockResponse = createMockResponse(429);
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      try {
        await client.get("/test");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBeUndefined();
      }

      // Verify parseProblemDetails receives the full Response (for body + header parsing)
      expect(mockParse).toHaveBeenCalledWith(mockResponse);
    });

    it("throws ApiError for 400 response", async () => {
      const { parseProblemDetails } = await import("./problemDetails");
      const mockParse = vi.mocked(parseProblemDetails);
      const apiError = new ApiError(400, { detail: "Bad request" });
      mockParse.mockResolvedValue(apiError);

      const mockResponse = createMockResponse(400);
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      await expect(client.get("/test")).rejects.toThrow(apiError);
      await expect(client.get("/test")).rejects.toBeInstanceOf(ApiError);
    });

    it("throws ApiError for 500 response", async () => {
      const { parseProblemDetails } = await import("./problemDetails");
      const mockParse = vi.mocked(parseProblemDetails);
      const apiError = new ApiError(500, { detail: "Internal error" });
      mockParse.mockResolvedValue(apiError);

      const mockResponse = createMockResponse(500);
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      await expect(client.get("/test")).rejects.toThrow(apiError);
      await expect(client.get("/test")).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe("successful responses", () => {
    it("returns parsed JSON for 200 response", async () => {
      const mockResponse = createMockResponse(200, {
        data: "success",
        count: 42,
      });
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      const result = await client.get<{ data: string; count: number }>("/test");

      expect(result).toEqual({ data: "success", count: 42 });
    });

    it("returns parsed JSON for 202 response", async () => {
      const mockResponse = createMockResponse(202, {
        correlationId: "cmd-123",
      });
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      const result = await client.post<{ correlationId: string }>(
        "/api/v1/commands",
        { body: { command: "create" } },
      );

      expect(result).toEqual({ correlationId: "cmd-123" });
    });
  });

  describe("AbortSignal", () => {
    it("forwards AbortSignal to fetch", async () => {
      const mockResponse = createMockResponse(200, {});
      fetchMock.mockResolvedValue(mockResponse);
      const controller = new AbortController();
      const client = createFetchClient(defaultConfig());

      await client.get("/test", { signal: controller.signal });

      expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
    });
  });

  describe("token getter rejection", () => {
    it("propagates error when tokenGetter throws", async () => {
      const tokenError = new Error("Token refresh failed");
      const config = defaultConfig({
        tokenGetter: vi.fn().mockRejectedValue(tokenError),
      });
      const client = createFetchClient(config);

      await expect(client.get("/test")).rejects.toThrow("Token refresh failed");
    });
  });

  describe("URL construction", () => {
    it("concatenates baseUrl and path correctly", async () => {
      const mockResponse = createMockResponse(200, {});
      fetchMock.mockResolvedValue(mockResponse);
      const config = defaultConfig({
        baseUrl: "https://api.hexalith.com",
      });
      const client = createFetchClient(config);

      await client.get("/api/v1/commands/status/abc-123");

      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://api.hexalith.com/api/v1/commands/status/abc-123",
      );
    });

    it("strips trailing slash from baseUrl to prevent double-slash URLs", async () => {
      const mockResponse = createMockResponse(200, {});
      fetchMock.mockResolvedValue(mockResponse);
      const config = defaultConfig({
        baseUrl: "https://api.example.com/",
      });
      const client = createFetchClient(config);

      await client.get("/api/v1/commands");

      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://api.example.com/api/v1/commands",
      );
    });
  });

  describe("custom headers", () => {
    it("allows custom headers like If-None-Match", async () => {
      const mockResponse = createMockResponse(200, {});
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      await client.get("/test", {
        headers: { "If-None-Match": '"etag-abc"' },
      });

      expect(fetchMock.mock.calls[0][1].headers["If-None-Match"]).toBe(
        '"etag-abc"',
      );
    });

    it("does not allow custom headers to override X-Correlation-ID", async () => {
      const mockResponse = createMockResponse(200, {});
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      await client.get("/test", {
        headers: { "X-Correlation-ID": "SPOOFED-ID" },
      });

      // Auto-generated ID (from mock) takes precedence over custom header
      expect(fetchMock.mock.calls[0][1].headers["X-Correlation-ID"]).toBe(
        "TEST-CORRELATION-ID",
      );
    });

    it("does not allow custom headers to override X-Correlation-ID when correlationId option is set", async () => {
      const mockResponse = createMockResponse(200, {});
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      await client.get("/test", {
        headers: { "X-Correlation-ID": "SPOOFED-ID" },
        correlationId: "CALLER-PROVIDED-ID",
      });

      // options.correlationId takes precedence over custom header
      expect(fetchMock.mock.calls[0][1].headers["X-Correlation-ID"]).toBe(
        "CALLER-PROVIDED-ID",
      );
    });

    it("does not allow custom headers to override Authorization", async () => {
      const mockResponse = createMockResponse(200, {});
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      await client.post("/test", {
        headers: { Authorization: "Bearer malicious-token" },
      });

      expect(fetchMock.mock.calls[0][1].headers["Authorization"]).toBe(
        "Bearer test-token",
      );
    });
  });

  describe("postForQuery", () => {
    it("returns data and etag on 200 response", async () => {
      const body = { correlationId: "q-1", payload: { id: "order-1" } };
      const mockResponse = createMockResponse(200, body, {
        ETag: '"etag-abc"',
      });
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      const result = await client.postForQuery("/api/v1/queries", {
        body: { domain: "Orders" },
      });

      expect(result).toEqual({
        status: 200,
        data: body,
        etag: '"etag-abc"',
      });
    });

    it("returns null etag when ETag header is missing on 200", async () => {
      const body = { correlationId: "q-2", payload: {} };
      const mockResponse = createMockResponse(200, body);
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      const result = await client.postForQuery("/api/v1/queries");

      expect(result.status).toBe(200);
      if (result.status === 200) {
        expect(result.data).toEqual(body);
        expect(result.etag).toBeNull();
      }
    });

    it("returns status 304 with null data on 304 response", async () => {
      const mockResponse = createMockResponse(304);
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      const result = await client.postForQuery("/api/v1/queries");

      expect(result).toEqual({ status: 304, data: null, etag: null });
    });

    it("throws via parseProblemDetails on 4xx/5xx error", async () => {
      const { parseProblemDetails } = await import("./problemDetails");
      const mockParse = vi.mocked(parseProblemDetails);
      const apiError = new ApiError(400, { detail: "Bad query" });
      mockParse.mockResolvedValue(apiError);

      const mockResponse = createMockResponse(400);
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      await expect(client.postForQuery("/api/v1/queries")).rejects.toThrow(
        apiError,
      );
    });

    it("throws ApiError on unexpected OK status (e.g. 202)", async () => {
      const mockResponse = createMockResponse(202, {
        correlationId: "q-3",
      });
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      await expect(
        client.postForQuery("/api/v1/queries"),
      ).rejects.toBeInstanceOf(ApiError);

      try {
        await client.postForQuery("/api/v1/queries");
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(202);
      }
    });

    it("sends POST with auth and correlation headers", async () => {
      const mockResponse = createMockResponse(200, { payload: {} });
      fetchMock.mockResolvedValue(mockResponse);
      const client = createFetchClient(defaultConfig());

      await client.postForQuery("/api/v1/queries", {
        body: { domain: "Test" },
        headers: { "If-None-Match": '"etag-123"' },
      });

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[1].headers).toEqual(
        expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
          "X-Correlation-ID": "TEST-CORRELATION-ID",
          "If-None-Match": '"etag-123"',
        }),
      );
      expect(callArgs[1].body).toBe(JSON.stringify({ domain: "Test" }));
    });

    it("forwards AbortSignal to fetch", async () => {
      const mockResponse = createMockResponse(200, {});
      fetchMock.mockResolvedValue(mockResponse);
      const controller = new AbortController();
      const client = createFetchClient(defaultConfig());

      await client.postForQuery("/test", { signal: controller.signal });

      expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  ApiError,
  AuthError,
  ForbiddenError,
  RateLimitError,
} from "../errors";
import { parseProblemDetails } from "./problemDetails";

function createJsonResponse(
  status: number,
  body?: unknown,
  headers?: Record<string, string>,
): Response {
  const responseHeaders = new Headers(headers);
  if (body !== undefined && !responseHeaders.has("Content-Type")) {
    responseHeaders.set("Content-Type", "application/json");
  }

  return new Response(
    body === undefined ? null : JSON.stringify(body),
    {
      status,
      headers: responseHeaders,
    },
  );
}

function createTextResponse(
  status: number,
  text: string,
  headers?: Record<string, string>,
): Response {
  return new Response(text, {
    status,
    headers: new Headers(headers),
  });
}

function createFailingResponse(
  status: number,
  headers?: Record<string, string>,
): Response {
  return {
    status,
    headers: new Headers(headers),
    json: () => Promise.reject(new Error("Connection reset")),
    text: () => Promise.reject(new Error("Connection reset")),
  } as Response;
}

describe("parseProblemDetails — RFC 9457 Parser Tests", () => {
  describe("AC #4 — HTTP status code mapping", () => {
    it("maps 400 to ApiError", async () => {
      const response = createJsonResponse(400, {
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "Invalid request",
        instance: "/api/commands",
      });

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.code).toBe("API_ERROR");
      expect((error as ApiError).statusCode).toBe(400);
    });

    it("maps 401 to AuthError", async () => {
      const response = createJsonResponse(401, {
        type: "about:blank",
        title: "Unauthorized",
        status: 401,
        detail: "Token expired",
        instance: "/api/commands",
      });

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(AuthError);
      expect(error.code).toBe("AUTH_ERROR");
      expect(error.message).toBe("Token expired");
    });

    it("maps 403 to ForbiddenError", async () => {
      const response = createJsonResponse(403, {
        type: "about:blank",
        title: "Forbidden",
        status: 403,
        detail: "Tenant not authorized",
        instance: "/api/commands",
      });

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toBe("Tenant not authorized");
    });

    it("maps 429 to RateLimitError", async () => {
      const response = createJsonResponse(
        429,
        {
          type: "about:blank",
          title: "Too Many Requests",
          status: 429,
          detail: "Rate limit exceeded",
          instance: "/api/commands",
        },
        { "Retry-After": "60" },
      );

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.code).toBe("RATE_LIMIT");
      expect((error as RateLimitError).retryAfter).toBe("60");
    });

    it("maps 404 to ApiError", async () => {
      const response = createJsonResponse(404, {
        type: "about:blank",
        title: "Not Found",
        status: 404,
        detail: "Resource not found",
        instance: "/api/queries/123",
      });

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(404);
    });

    it("maps 409 to ApiError", async () => {
      const response = createJsonResponse(409, {
        type: "about:blank",
        title: "Conflict",
        status: 409,
        detail: "Command replay conflict",
        instance: "/api/commands",
      });

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(409);
    });

    it("maps 503 to ApiError", async () => {
      const response = createJsonResponse(503, {
        type: "about:blank",
        title: "Service Unavailable",
        status: 503,
        detail: "Backend down",
        instance: "/api/commands",
      });

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(503);
    });

    it("maps unknown 4xx to ApiError", async () => {
      const response = createJsonResponse(418, {
        type: "about:blank",
        title: "I'm a teapot",
        status: 418,
        detail: "Teapot",
        instance: "/api/tea",
      });

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(418);
    });

    it("maps unknown 5xx to ApiError", async () => {
      const response = createJsonResponse(502, {
        type: "about:blank",
        title: "Bad Gateway",
        status: 502,
        detail: "Upstream error",
        instance: "/api/commands",
      });

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(502);
    });
  });

  describe("AC #4 — correlationId and tenantId preservation", () => {
    it("preserves correlationId from ProblemDetails body", async () => {
      const response = createJsonResponse(400, {
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "Invalid",
        instance: "/api/commands",
        correlationId: "corr-123-abc",
      });

      const error = await parseProblemDetails(response);
      expect((error as ApiError & { correlationId: string }).correlationId).toBe(
        "corr-123-abc",
      );
    });

    it("preserves tenantId from ProblemDetails body", async () => {
      const response = createJsonResponse(400, {
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "Invalid",
        instance: "/api/commands",
        tenantId: "tenant-xyz",
      });

      const error = await parseProblemDetails(response);
      expect((error as ApiError & { tenantId: string }).tenantId).toBe(
        "tenant-xyz",
      );
    });

    it("preserves both correlationId and tenantId", async () => {
      const response = createJsonResponse(403, {
        type: "about:blank",
        title: "Forbidden",
        status: 403,
        detail: "Not allowed",
        instance: "/api/commands",
        correlationId: "corr-456",
        tenantId: "tenant-abc",
      });

      const error = await parseProblemDetails(response);
      const errorWithFields = error as ForbiddenError & {
        correlationId: string;
        tenantId: string;
      };
      expect(errorWithFields.correlationId).toBe("corr-456");
      expect(errorWithFields.tenantId).toBe("tenant-abc");
    });

    it("serializes preserved metadata for structured logging", async () => {
      const response = createJsonResponse(403, {
        type: "about:blank",
        title: "Forbidden",
        status: 403,
        detail: "Not allowed",
        instance: "/api/commands",
        correlationId: "corr-456",
        tenantId: "tenant-abc",
      });

      const error = await parseProblemDetails(response);

      expect(JSON.parse(JSON.stringify(error))).toEqual({
        code: "FORBIDDEN",
        message: "Not allowed",
        correlationId: "corr-456",
        tenantId: "tenant-abc",
      });
    });

    it("handles missing correlationId and tenantId gracefully", async () => {
      const response = createJsonResponse(400, {
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "Invalid",
        instance: "/api/commands",
      });

      const error = await parseProblemDetails(response);
      expect((error as Record<string, unknown>).correlationId).toBeUndefined();
      expect((error as Record<string, unknown>).tenantId).toBeUndefined();
    });
  });

  describe("AC #4 — Retry-After header extraction", () => {
    it("extracts Retry-After header for 429 responses", async () => {
      const response = createJsonResponse(
        429,
        {
          type: "about:blank",
          title: "Too Many Requests",
          status: 429,
          detail: "Slow down",
          instance: "/api/commands",
        },
        { "Retry-After": "120" },
      );

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).retryAfter).toBe("120");
    });

    it("handles 429 without Retry-After header", async () => {
      const response = createJsonResponse(429, {
        type: "about:blank",
        title: "Too Many Requests",
        status: 429,
        detail: "Slow down",
        instance: "/api/commands",
      });

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).retryAfter).toBeUndefined();
    });
  });

  describe("AC #4 — non-JSON error response handling", () => {
    it("falls back to ApiError with text body for HTML responses", async () => {
      const response = createTextResponse(
        502,
        "<html><body>Bad Gateway</body></html>",
      );

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(502);
      expect((error as ApiError).body).toBe(
        "<html><body>Bad Gateway</body></html>",
      );
    });

    it("preserves text fallback with a real Response body stream", async () => {
      const response = new Response("<html><body>Bad Gateway</body></html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      });

      const error = await parseProblemDetails(response);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).body).toBe(
        "<html><body>Bad Gateway</body></html>",
      );
    });

    it("handles empty body responses", async () => {
      const response = createTextResponse(500, "");

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(500);
    });

    it("handles connection reset (both json and text fail)", async () => {
      const response = createFailingResponse(503);

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(503);
      expect((error as ApiError).body).toBeNull();
    });
  });

  describe("AC #4 — edge cases", () => {
    it("handles malformed ProblemDetails (missing fields)", async () => {
      const response = createJsonResponse(400, {
        status: 400,
      });

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(400);
    });

    it("uses default message when detail is missing for AuthError", async () => {
      const response = createJsonResponse(401, {
        status: 401,
      });

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(AuthError);
      expect(error.message).toBe("Authentication required");
    });

    it("uses default message when detail is missing for ForbiddenError", async () => {
      const response = createJsonResponse(403, {
        status: 403,
      });

      const error = await parseProblemDetails(response);
      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe("Access forbidden");
    });

    it("ApiError body contains the full ProblemDetails object", async () => {
      const problemDetails = {
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "Validation failed",
        instance: "/api/commands",
      };
      const response = createJsonResponse(400, problemDetails);

      const error = await parseProblemDetails(response);
      expect((error as ApiError).body).toEqual(problemDetails);
    });
  });
});

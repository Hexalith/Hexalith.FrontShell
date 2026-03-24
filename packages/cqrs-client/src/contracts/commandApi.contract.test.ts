// AC: 6-6#5 — Consumer contract tests for CommandApi HTTP interactions
// AC: 6-6#6 — Contract verification CI gate coverage

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createFetchClient } from "../core/fetchClient";

import type { FetchClient } from "../core/fetchClient";
import type {
  CommandStatusResponse,
  ProblemDetails,
  SubmitCommandRequest,
  SubmitCommandResponse,
} from "../core/types";

// These tests define what the frontend EXPECTS from the backend API.
// They validate that the frontend's HTTP client code sends correct
// requests and handles responses according to the contract.
// The fetch layer is mocked — we're testing the contract shape,
// not network connectivity.

function createJsonResponse(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

describe("CommandApi Consumer Contract", () => {
  let client: FetchClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    client = createFetchClient({
      baseUrl: "https://hexalith-api",
      tokenGetter: () => Promise.resolve("test-token"),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("POST /api/v1/commands", () => {
    const testCommand: SubmitCommandRequest = {
      tenant: "test-tenant",
      domain: "TestDomain",
      aggregateId: "agg-001",
      commandType: "CreateTenant",
      payload: { name: "New Tenant" },
    };

    it("sends command payload in expected format", async () => {
      // Contract: request body must be { tenant, domain, aggregateId, commandType, payload }
      // Contract: Content-Type must be application/json
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ correlationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV" }, 202),
      );

      await client.post("/api/v1/commands", { body: testCommand });

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, init] = mockFetch.mock.calls[0] as [
        string,
        RequestInit & { headers: Record<string, string> },
      ];
      expect(url).toBe("https://hexalith-api/api/v1/commands");
      expect(init.method).toBe("POST");
      expect(init.headers["Content-Type"]).toBe("application/json");
      expect(init.headers["Authorization"]).toBe("Bearer test-token");
      expect(init.headers["X-Correlation-ID"]).toMatch(
        /^[0-9A-HJKMNP-TV-Z]{26}$/i,
      );

      const sentBody = JSON.parse(init.body as string) as SubmitCommandRequest;
      expect(sentBody).toHaveProperty("tenant");
      expect(sentBody).toHaveProperty("domain");
      expect(sentBody).toHaveProperty("aggregateId");
      expect(sentBody).toHaveProperty("commandType");
      expect(sentBody).toHaveProperty("payload");
      expect(sentBody).toEqual(testCommand);
    });

    it("expects 202 Accepted with correlationId", async () => {
      // Contract: response body { correlationId: string (ULID format) }
      // Contract: status 202 (not 200, not 201)
      const responseBody: SubmitCommandResponse = {
        correlationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      };
      mockFetch.mockResolvedValueOnce(createJsonResponse(responseBody, 202));

      const result = await client.post<SubmitCommandResponse>(
        "/api/v1/commands",
        { body: testCommand },
      );

      expect(result).toHaveProperty("correlationId");
      expect(typeof result.correlationId).toBe("string");
    });

    it("expects ProblemDetails on 400 error", async () => {
      // Contract: error response { type, title, status, detail }
      // Contract: status maps to ApiError
      const problemDetails: ProblemDetails = {
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "Invalid command payload",
        instance: "/api/v1/commands",
      };
      mockFetch.mockResolvedValueOnce(createJsonResponse(problemDetails, 400));

      await expect(
        client.post("/api/v1/commands", { body: testCommand }),
      ).rejects.toThrow();
    });

    it("expects ProblemDetails on 500 error", async () => {
      // Contract: server error returns ProblemDetails
      const problemDetails: ProblemDetails = {
        type: "about:blank",
        title: "Internal Server Error",
        status: 500,
        detail: "Event store unavailable",
        instance: "/api/v1/commands",
      };
      mockFetch.mockResolvedValueOnce(createJsonResponse(problemDetails, 500));

      await expect(
        client.post("/api/v1/commands", { body: testCommand }),
      ).rejects.toThrow();
    });

    it("supports optional extensions field", async () => {
      // Contract: request body can include optional extensions map
      const commandWithExtensions: SubmitCommandRequest = {
        ...testCommand,
        extensions: { "x-source": "admin-panel" },
      };
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ correlationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV" }, 202),
      );

      await client.post("/api/v1/commands", { body: commandWithExtensions });

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const sentBody = JSON.parse(init.body as string) as SubmitCommandRequest;
      expect(sentBody.extensions).toEqual({ "x-source": "admin-panel" });
    });
  });

  describe("GET /api/v1/commands/status/{id} (status polling)", () => {
    it("expects polling response with status field", async () => {
      // Contract: response body { correlationId, status, statusCode, timestamp, ... }
      // Contract: status is one of the 8 CommandStatus values
      const statusResponse: CommandStatusResponse = {
        correlationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        status: "Completed",
        statusCode: 200,
        timestamp: "2026-03-23T10:00:00Z",
        aggregateId: "agg-001",
        eventCount: 1,
      };
      mockFetch.mockResolvedValueOnce(createJsonResponse(statusResponse));

      const result = await client.get<CommandStatusResponse>(
        "/api/v1/commands/status/01ARZ3NDEKTSV4RRFFQ69G5FAV",
      );

      expect(result).toHaveProperty("correlationId");
      expect(result).toHaveProperty("status");
      expect([
        "Received",
        "Processing",
        "EventsStored",
        "EventsPublished",
        "Completed",
        "Rejected",
        "PublishFailed",
        "TimedOut",
      ]).toContain(result.status);
    });

    it("expects completed status to include eventCount", async () => {
      // Contract: completed status includes eventCount
      const statusResponse: CommandStatusResponse = {
        correlationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        status: "Completed",
        statusCode: 200,
        timestamp: "2026-03-23T10:00:00Z",
        eventCount: 2,
      };
      mockFetch.mockResolvedValueOnce(createJsonResponse(statusResponse));

      const result = await client.get<CommandStatusResponse>(
        "/api/v1/commands/status/01ARZ3NDEKTSV4RRFFQ69G5FAV",
      );

      expect(result.status).toBe("Completed");
      expect(result.eventCount).toBeGreaterThan(0);
    });

    it("expects rejected status to include rejectionEventType", async () => {
      // Contract: rejected status includes rejectionEventType
      const statusResponse: CommandStatusResponse = {
        correlationId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        status: "Rejected",
        statusCode: 200,
        timestamp: "2026-03-23T10:00:00Z",
        rejectionEventType: "TenantAlreadyExists",
      };
      mockFetch.mockResolvedValueOnce(createJsonResponse(statusResponse));

      const result = await client.get<CommandStatusResponse>(
        "/api/v1/commands/status/01ARZ3NDEKTSV4RRFFQ69G5FAV",
      );

      expect(result.status).toBe("Rejected");
      expect(result.rejectionEventType).toBeTruthy();
    });

    it("expects 404 for unknown correlationId", async () => {
      // Contract: returns 404 ProblemDetails, not 200 with empty body
      const problemDetails: ProblemDetails = {
        type: "about:blank",
        title: "Not Found",
        status: 404,
        detail: "Command status not found",
        instance: "/api/v1/commands/status/unknown-id",
      };
      mockFetch.mockResolvedValueOnce(createJsonResponse(problemDetails, 404));

      await expect(
        client.get("/api/v1/commands/status/unknown-id"),
      ).rejects.toThrow();
    });
  });
});

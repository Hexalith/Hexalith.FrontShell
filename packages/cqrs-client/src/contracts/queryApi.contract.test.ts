// AC: 6-6#5 — Consumer contract tests for QueryApi HTTP interactions
// AC: 6-6#6 — Contract verification CI gate coverage

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

import { createFetchClient } from "../core/fetchClient";

import type { FetchClient } from "../core/fetchClient";
import type { ProblemDetails, SubmitQueryRequest } from "../core/types";

// These tests define what the frontend EXPECTS from the backend query API.
// Validates HTTP request/response shapes using the actual fetchClient
// with a mocked fetch boundary.

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

describe("QueryApi Consumer Contract", () => {
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

  describe("POST /api/v1/queries", () => {
    const testQuery: SubmitQueryRequest = {
      tenant: "test-tenant",
      domain: "TestDomain",
      aggregateId: "agg-001",
      queryType: "GetTenantList",
    };

    it("sends query in expected format", async () => {
      // Contract: request body { tenant, domain, aggregateId, queryType, entityId? }
      // Contract: Content-Type must be application/json
      const responseBody = [{ id: "1", name: "Tenant A" }];
      mockFetch.mockResolvedValueOnce(
        createJsonResponse(responseBody, 200, { ETag: '"abc123"' }),
      );

      await client.postForQuery("/api/v1/queries", { body: testQuery });

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, init] = mockFetch.mock.calls[0] as [
        string,
        RequestInit & { headers: Record<string, string> },
      ];
      expect(url).toBe("https://hexalith-api/api/v1/queries");
      expect(init.method).toBe("POST");
      expect(init.headers["Content-Type"]).toBe("application/json");

      const sentBody = JSON.parse(init.body as string) as SubmitQueryRequest;
      expect(sentBody).toHaveProperty("tenant");
      expect(sentBody).toHaveProperty("domain");
      expect(sentBody).toHaveProperty("queryType");
    });

    it("expects 200 OK with Zod-validatable body", async () => {
      // Contract: response is JSON that matches the provided Zod schema
      const TenantSchema = z.object({ id: z.string(), name: z.string() });
      const TenantListSchema = z.array(TenantSchema);

      const responseBody = [
        { id: "1", name: "Tenant A" },
        { id: "2", name: "Tenant B" },
      ];
      mockFetch.mockResolvedValueOnce(
        createJsonResponse(responseBody, 200, { ETag: '"abc123"' }),
      );

      const result = await client.postForQuery<z.infer<typeof TenantListSchema>>(
        "/api/v1/queries",
        { body: testQuery },
      );

      expect(result.status).toBe(200);
      if (result.status === 200) {
        const parsed = TenantListSchema.safeParse(result.data);
        expect(parsed.success).toBe(true);
        expect(result.etag).toBe('"abc123"');
      }
    });

    it("expects ProblemDetails on errors", async () => {
      // Contract: error format matches command API error contract
      const problemDetails: ProblemDetails = {
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "Invalid query parameters",
        instance: "/api/v1/queries",
      };
      mockFetch.mockResolvedValueOnce(createJsonResponse(problemDetails, 400));

      await expect(
        client.postForQuery("/api/v1/queries", { body: testQuery }),
      ).rejects.toThrow();
    });

    it("supports entityId-scoped queries", async () => {
      // Contract: request body can include optional entityId field
      const scopedQuery: SubmitQueryRequest = {
        ...testQuery,
        entityId: "entity-42",
      };
      const responseBody = { id: "42", name: "Scoped Entity" };
      mockFetch.mockResolvedValueOnce(
        createJsonResponse(responseBody, 200, { ETag: '"xyz"' }),
      );

      await client.postForQuery("/api/v1/queries", { body: scopedQuery });

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const sentBody = JSON.parse(init.body as string) as SubmitQueryRequest;
      expect(sentBody).toHaveProperty("entityId", "entity-42");
    });

    it("handles 304 Not Modified for cached queries", async () => {
      // Contract: 304 response means data unchanged, use cached version
      mockFetch.mockResolvedValueOnce(
        new Response(null, { status: 304 }),
      );

      const result = await client.postForQuery("/api/v1/queries", {
        body: testQuery,
      });

      expect(result.status).toBe(304);
      expect(result.data).toBeNull();
    });
  });
});

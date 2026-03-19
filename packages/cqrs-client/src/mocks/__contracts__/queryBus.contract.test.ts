import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ValidationError } from "../../errors";

import type { IQueryBus } from "../../core/IQueryBus";
import type { SubmitQueryRequest } from "../../core/types";

/** Valid test query fixture */
export const TEST_QUERY: SubmitQueryRequest = {
  tenant: "test-tenant",
  domain: "TestDomain",
  aggregateId: "agg-001",
  queryType: "GetList",
};

const TestItemSchema = z.object({ id: z.string(), name: z.string() });
const TestListSchema = z.array(TestItemSchema);

/**
 * Parameterized contract test suite for IQueryBus implementations.
 * Run against MockQueryBus now; run against DaprQueryBus when it exists.
 */
export function queryBusContractTests(
  name: string,
  createBus: () => IQueryBus,
  configureResponse?: {
    setValidResponse: (bus: IQueryBus) => void;
    setInvalidSchemaResponse: (bus: IQueryBus) => void;
  },
): void {
  describe(`IQueryBus contract: ${name}`, () => {
    it("returns validated data for valid response", async () => {
      const bus = createBus();
      configureResponse?.setValidResponse(bus);
      const result = await bus.query(TEST_QUERY, TestListSchema);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("name");
    });

    it("simulates async delay (not instant)", async () => {
      const bus = createBus();
      configureResponse?.setValidResponse(bus);
      const start = performance.now();
      await bus.query(TEST_QUERY, TestListSchema);
      expect(performance.now() - start).toBeGreaterThan(0);
    });

    if (configureResponse) {
      it("throws ValidationError for schema mismatch", async () => {
        const bus = createBus();
        configureResponse.setInvalidSchemaResponse(bus);
        await expect(bus.query(TEST_QUERY, TestListSchema)).rejects.toBeInstanceOf(
          ValidationError,
        );
      });
    }

    it("supports entityId-scoped queries", async () => {
      const bus = createBus();
      const scopedQuery: SubmitQueryRequest = {
        ...TEST_QUERY,
        entityId: "entity-42",
      };
      configureResponse?.setValidResponse(bus);

      // For mock, we need to configure the scoped key too
      if ("setResponse" in bus) {
        (bus as { setResponse: (key: string, data: unknown) => void }).setResponse(
          `test-tenant:TestDomain:GetList:agg-001:entity-42`,
          [{ id: "42", name: "Scoped Item" }],
        );
      }

      const result = await bus.query(scopedQuery, TestListSchema);
      expect(Array.isArray(result)).toBe(true);
    });
  });
}

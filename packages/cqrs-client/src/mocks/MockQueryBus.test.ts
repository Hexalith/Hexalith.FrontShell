import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ApiError, ValidationError } from "../errors";
import { queryBusContractTests, TEST_QUERY } from "./__contracts__/queryBus.contract.test";
import { MockQueryBus } from "./MockQueryBus";

const RESPONSE_KEY = "test-tenant:TestDomain:GetList:agg-001:";
const VALID_RESPONSE = [{ id: "1", name: "Test" }];

// Contract tests
queryBusContractTests(
  "MockQueryBus",
  () => {
    const bus = new MockQueryBus();
    bus.setResponse(RESPONSE_KEY, VALID_RESPONSE);
    return bus;
  },
  {
    setValidResponse: (bus) =>
      (bus as MockQueryBus).setResponse(RESPONSE_KEY, VALID_RESPONSE),
    setInvalidSchemaResponse: (bus) =>
      (bus as MockQueryBus).setResponse(RESPONSE_KEY, { invalid: true }),
  },
);

const TestListSchema = z.array(z.object({ id: z.string(), name: z.string() }));

// Mock-specific tests
describe("MockQueryBus specifics", () => {
  it("throws ApiError(404) for unconfigured response key", async () => {
    const bus = new MockQueryBus();

    try {
      await bus.query(TEST_QUERY, TestListSchema);
      expect.fail("Expected ApiError");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const apiError = e as ApiError;
      expect(apiError.statusCode).toBe(404);
      const body = apiError.body as Record<string, unknown>;
      expect(body.title).toBe("Not Found");
      expect(body.detail).toBe("No projection data found");
    }
  });

  it("validates response against Zod schema", async () => {
    const bus = new MockQueryBus();
    bus.setResponse(RESPONSE_KEY, VALID_RESPONSE);

    const result = await bus.query(TEST_QUERY, TestListSchema);
    expect(result).toEqual(VALID_RESPONSE);
  });

  it("throws ValidationError on schema mismatch", async () => {
    const bus = new MockQueryBus();
    bus.setResponse(RESPONSE_KEY, { invalid: true });

    await expect(bus.query(TEST_QUERY, TestListSchema)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("records all query() calls", async () => {
    const bus = new MockQueryBus();
    bus.setResponse(RESPONSE_KEY, VALID_RESPONSE);

    await bus.query(TEST_QUERY, TestListSchema);
    await bus.query(TEST_QUERY, TestListSchema);
    expect(bus.getCalls()).toHaveLength(2);
  });

  it("getLastCall() returns the most recent call", async () => {
    const bus = new MockQueryBus();
    bus.setResponse(RESPONSE_KEY, VALID_RESPONSE);

    await bus.query(TEST_QUERY, TestListSchema);
    const call = bus.getLastCall();
    expect(call?.request.queryType).toBe("GetList");
  });

  it("getLastCall() returns undefined when no calls made", () => {
    const bus = new MockQueryBus();
    expect(bus.getLastCall()).toBeUndefined();
  });

  it("reset() clears responses and calls", async () => {
    const bus = new MockQueryBus();
    bus.setResponse(RESPONSE_KEY, VALID_RESPONSE);
    await bus.query(TEST_QUERY, TestListSchema);
    bus.reset();

    expect(bus.getCalls()).toHaveLength(0);
    // Response was cleared, should throw 404
    await expect(bus.query(TEST_QUERY, TestListSchema)).rejects.toBeInstanceOf(ApiError);
  });

  it("throws configured error for specific key", async () => {
    const bus = new MockQueryBus();
    const customError = new Error("Query failed");
    bus.setError(RESPONSE_KEY, customError);

    await expect(bus.query(TEST_QUERY, TestListSchema)).rejects.toBe(customError);
  });

  it("clearResponses() clears responses and errors but not calls", async () => {
    const bus = new MockQueryBus();
    bus.setResponse(RESPONSE_KEY, VALID_RESPONSE);
    await bus.query(TEST_QUERY, TestListSchema);
    bus.clearResponses();

    expect(bus.getCalls()).toHaveLength(1); // calls preserved
    await expect(bus.query(TEST_QUERY, TestListSchema)).rejects.toBeInstanceOf(ApiError);
  });

  it("respects custom delay", async () => {
    const bus = new MockQueryBus({ delay: 100 });
    bus.setResponse(RESPONSE_KEY, VALID_RESPONSE);

    const start = performance.now();
    await bus.query(TEST_QUERY, TestListSchema);
    expect(performance.now() - start).toBeGreaterThanOrEqual(90);
  });

  it("enforces minimum positive delay even when misconfigured", async () => {
    const bus = new MockQueryBus({ delay: 0 });
    bus.setResponse(RESPONSE_KEY, VALID_RESPONSE);

    const start = performance.now();
    await bus.query(TEST_QUERY, TestListSchema);
    expect(performance.now() - start).toBeGreaterThan(0);
  });
});

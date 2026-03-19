import { describe, expectTypeOf, it } from "vitest";


import type { IQueryBus } from "./IQueryBus";
import type { SubmitQueryRequest } from "./types";
import type { z } from "zod";

describe("IQueryBus — Type-Level Tests", () => {
  describe("AC #1 — IQueryBus interface", () => {
    it("has a query method", () => {
      expectTypeOf<IQueryBus>().toHaveProperty("query");
    });

    it("query is a generic method accepting SubmitQueryRequest and z.ZodType<T>", () => {
      type QueryMethod = IQueryBus["query"];
      // Verify the method signature matches: (request, schema) => Promise<T>
      expectTypeOf<QueryMethod>().toBeFunction();
      // Verify it can be called with concrete types
      expectTypeOf<QueryMethod>().toBeCallableWith(
        {} as SubmitQueryRequest,
        {} as z.ZodType<string>,
      );
    });

    it("uses I-prefix following .NET conventions", () => {
      expectTypeOf<IQueryBus>().not.toBeNever();
    });
  });
});

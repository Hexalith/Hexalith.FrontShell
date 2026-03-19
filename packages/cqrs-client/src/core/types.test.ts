import { describe, expectTypeOf, it } from "vitest";

import type {
  CommandStatus,
  CommandStatusResponse,
  ProblemDetails,
  PreflightValidationResult,
  SubmitCommandRequest,
  SubmitCommandResponse,
  SubmitQueryRequest,
  SubmitQueryResponse,
  ValidateCommandRequest,
} from "./types";

describe("types — Type Assertion Tests", () => {
  describe("AC #3 — SubmitCommandRequest", () => {
    it("has required fields", () => {
      expectTypeOf<SubmitCommandRequest>().toHaveProperty("tenant");
      expectTypeOf<SubmitCommandRequest>().toHaveProperty("domain");
      expectTypeOf<SubmitCommandRequest>().toHaveProperty("aggregateId");
      expectTypeOf<SubmitCommandRequest>().toHaveProperty("commandType");
      expectTypeOf<SubmitCommandRequest>().toHaveProperty("payload");
    });

    it("has optional extensions field", () => {
      expectTypeOf<SubmitCommandRequest>().toHaveProperty("extensions");
    });

    it("has correct field types", () => {
      expectTypeOf<SubmitCommandRequest["tenant"]>().toBeString();
      expectTypeOf<SubmitCommandRequest["domain"]>().toBeString();
      expectTypeOf<SubmitCommandRequest["aggregateId"]>().toBeString();
      expectTypeOf<SubmitCommandRequest["commandType"]>().toBeString();
      expectTypeOf<SubmitCommandRequest["payload"]>().toBeUnknown();
    });
  });

  describe("AC #3 — SubmitCommandResponse", () => {
    it("has correlationId field", () => {
      expectTypeOf<SubmitCommandResponse>().toHaveProperty("correlationId");
      expectTypeOf<SubmitCommandResponse["correlationId"]>().toBeString();
    });
  });

  describe("AC #3 — CommandStatusResponse", () => {
    it("has required fields", () => {
      expectTypeOf<CommandStatusResponse>().toHaveProperty("correlationId");
      expectTypeOf<CommandStatusResponse>().toHaveProperty("status");
      expectTypeOf<CommandStatusResponse>().toHaveProperty("statusCode");
      expectTypeOf<CommandStatusResponse>().toHaveProperty("timestamp");
    });

    it("has optional fields", () => {
      expectTypeOf<CommandStatusResponse>().toHaveProperty("aggregateId");
      expectTypeOf<CommandStatusResponse>().toHaveProperty("eventCount");
      expectTypeOf<CommandStatusResponse>().toHaveProperty("rejectionEventType");
      expectTypeOf<CommandStatusResponse>().toHaveProperty("failureReason");
      expectTypeOf<CommandStatusResponse>().toHaveProperty("timeoutDuration");
    });

    it("status field uses CommandStatus union type", () => {
      expectTypeOf<CommandStatusResponse["status"]>().toEqualTypeOf<CommandStatus>();
    });
  });

  describe("AC #3 — SubmitQueryRequest", () => {
    it("has required fields", () => {
      expectTypeOf<SubmitQueryRequest>().toHaveProperty("tenant");
      expectTypeOf<SubmitQueryRequest>().toHaveProperty("domain");
      expectTypeOf<SubmitQueryRequest>().toHaveProperty("aggregateId");
      expectTypeOf<SubmitQueryRequest>().toHaveProperty("queryType");
    });

    it("has optional entityId field", () => {
      expectTypeOf<SubmitQueryRequest>().toHaveProperty("entityId");
    });

    it("has optional payload field", () => {
      expectTypeOf<SubmitQueryRequest>().toHaveProperty("payload");
    });
  });

  describe("AC #3 — SubmitQueryResponse", () => {
    it("has required fields", () => {
      expectTypeOf<SubmitQueryResponse>().toHaveProperty("correlationId");
      expectTypeOf<SubmitQueryResponse>().toHaveProperty("payload");
    });
  });

  describe("AC #3 — ValidateCommandRequest", () => {
    it("has required fields", () => {
      expectTypeOf<ValidateCommandRequest>().toHaveProperty("tenant");
      expectTypeOf<ValidateCommandRequest>().toHaveProperty("domain");
      expectTypeOf<ValidateCommandRequest>().toHaveProperty("commandType");
    });

    it("has optional aggregateId", () => {
      expectTypeOf<ValidateCommandRequest>().toHaveProperty("aggregateId");
    });
  });

  describe("AC #3 — PreflightValidationResult", () => {
    it("has required isAuthorized field", () => {
      expectTypeOf<PreflightValidationResult>().toHaveProperty("isAuthorized");
      expectTypeOf<PreflightValidationResult["isAuthorized"]>().toBeBoolean();
    });

    it("has optional reason field", () => {
      expectTypeOf<PreflightValidationResult>().toHaveProperty("reason");
    });
  });

  describe("AC #3 — ProblemDetails", () => {
    it("has required fields", () => {
      expectTypeOf<ProblemDetails>().toHaveProperty("type");
      expectTypeOf<ProblemDetails>().toHaveProperty("title");
      expectTypeOf<ProblemDetails>().toHaveProperty("status");
      expectTypeOf<ProblemDetails>().toHaveProperty("detail");
      expectTypeOf<ProblemDetails>().toHaveProperty("instance");
    });

    it("has optional correlationId and tenantId", () => {
      expectTypeOf<ProblemDetails>().toHaveProperty("correlationId");
      expectTypeOf<ProblemDetails>().toHaveProperty("tenantId");
    });

    it("status is number", () => {
      expectTypeOf<ProblemDetails["status"]>().toBeNumber();
    });
  });

  describe("AC #3 — CommandStatus union type", () => {
    it("accepts all 8 valid status values", () => {
      expectTypeOf<"Received">().toMatchTypeOf<CommandStatus>();
      expectTypeOf<"Processing">().toMatchTypeOf<CommandStatus>();
      expectTypeOf<"EventsStored">().toMatchTypeOf<CommandStatus>();
      expectTypeOf<"EventsPublished">().toMatchTypeOf<CommandStatus>();
      expectTypeOf<"Completed">().toMatchTypeOf<CommandStatus>();
      expectTypeOf<"Rejected">().toMatchTypeOf<CommandStatus>();
      expectTypeOf<"PublishFailed">().toMatchTypeOf<CommandStatus>();
      expectTypeOf<"TimedOut">().toMatchTypeOf<CommandStatus>();
    });

    it("rejects invalid status values", () => {
      expectTypeOf<"Invalid">().not.toMatchTypeOf<CommandStatus>();
    });

    it("is not an enum (is a string literal union)", () => {
      expectTypeOf<CommandStatus>().toMatchTypeOf<string>();
    });
  });
});

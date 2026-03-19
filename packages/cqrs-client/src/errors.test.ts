import { describe, expect, it } from "vitest";

import {
  ApiError,
  AuthError,
  CommandRejectedError,
  CommandTimeoutError,
  ForbiddenError,
  HexalithError,
  RateLimitError,
  ValidationError,
} from "./errors";

import type { ZodIssue } from "zod";


describe("errors — Error Hierarchy Tests", () => {
  describe("AC #2 — HexalithError base class", () => {
    it("all error subclasses extend HexalithError", () => {
      expect(new ApiError(400)).toBeInstanceOf(HexalithError);
      expect(new ValidationError([])).toBeInstanceOf(HexalithError);
      expect(new CommandRejectedError("type", "id")).toBeInstanceOf(HexalithError);
      expect(new CommandTimeoutError("PT30S", "id")).toBeInstanceOf(HexalithError);
      expect(new AuthError()).toBeInstanceOf(HexalithError);
      expect(new ForbiddenError()).toBeInstanceOf(HexalithError);
      expect(new RateLimitError()).toBeInstanceOf(HexalithError);
    });

    it("all error subclasses extend Error", () => {
      expect(new ApiError(400)).toBeInstanceOf(Error);
      expect(new AuthError()).toBeInstanceOf(Error);
    });
  });

  describe("AC #2 — unique code values", () => {
    it("each error class has a unique code identifier", () => {
      const codes = [
        new ApiError(400).code,
        new ValidationError([]).code,
        new CommandRejectedError("type", "id").code,
        new CommandTimeoutError("PT30S", "id").code,
        new AuthError().code,
        new ForbiddenError().code,
        new RateLimitError().code,
      ];
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it("has correct code values", () => {
      expect(new ApiError(400).code).toBe("API_ERROR");
      expect(new ValidationError([]).code).toBe("VALIDATION_ERROR");
      expect(new CommandRejectedError("type", "id").code).toBe("COMMAND_REJECTED");
      expect(new CommandTimeoutError("PT30S", "id").code).toBe("COMMAND_TIMEOUT");
      expect(new AuthError().code).toBe("AUTH_ERROR");
      expect(new ForbiddenError().code).toBe("FORBIDDEN");
      expect(new RateLimitError().code).toBe("RATE_LIMIT");
    });
  });

  describe("AC #2 — instanceof checks", () => {
    it("ApiError is instanceof ApiError and HexalithError", () => {
      const error = new ApiError(500, { detail: "Server error" });
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(HexalithError);
      expect(error).not.toBeInstanceOf(AuthError);
    });

    it("ValidationError is instanceof ValidationError and HexalithError", () => {
      const error = new ValidationError([]);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(HexalithError);
      expect(error).not.toBeInstanceOf(ApiError);
    });
  });

  describe("AC #2 — toJSON() serialization", () => {
    it("HexalithError subclasses serialize with JSON.stringify", () => {
      const error = new ApiError(404, { detail: "Not found" });
      const json = JSON.stringify(error);
      const parsed = JSON.parse(json) as Record<string, unknown>;
      expect(parsed.code).toBe("API_ERROR");
      expect(parsed.message).toBe("API error: 404");
      expect(parsed.statusCode).toBe(404);
      expect(parsed.body).toEqual({ detail: "Not found" });
    });

    it("ApiError toJSON includes statusCode and body", () => {
      const error = new ApiError(400, "bad request");
      const json = error.toJSON();
      expect(json).toEqual({
        code: "API_ERROR",
        message: "API error: 400",
        statusCode: 400,
        body: "bad request",
      });
    });

    it("ValidationError toJSON includes issues", () => {
      const issues: ZodIssue[] = [
        { code: "invalid_type", expected: "string", received: "number", path: ["name"], message: "Expected string" },
      ];
      const error = new ValidationError(issues);
      const json = error.toJSON();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.issues).toEqual(issues);
    });

    it("CommandRejectedError toJSON includes rejectionEventType and correlationId", () => {
      const error = new CommandRejectedError("OrderRejected", "corr-123");
      const json = error.toJSON();
      expect(json).toEqual({
        code: "COMMAND_REJECTED",
        message: "Command rejected: OrderRejected",
        rejectionEventType: "OrderRejected",
        correlationId: "corr-123",
      });
    });

    it("CommandTimeoutError toJSON includes duration and correlationId", () => {
      const error = new CommandTimeoutError("PT30S", "corr-456");
      const json = error.toJSON();
      expect(json).toEqual({
        code: "COMMAND_TIMEOUT",
        message: "Command timed out after PT30S",
        duration: "PT30S",
        correlationId: "corr-456",
      });
    });

    it("AuthError toJSON includes code and message", () => {
      const error = new AuthError();
      const json = error.toJSON();
      expect(json).toEqual({
        code: "AUTH_ERROR",
        message: "Authentication required",
      });
    });

    it("ForbiddenError toJSON includes code and message", () => {
      const error = new ForbiddenError();
      const json = error.toJSON();
      expect(json).toEqual({
        code: "FORBIDDEN",
        message: "Access forbidden",
      });
    });

    it("RateLimitError toJSON includes retryAfter", () => {
      const error = new RateLimitError("60");
      const json = error.toJSON();
      expect(json).toEqual({
        code: "RATE_LIMIT",
        message: "Rate limited, retry after 60",
        retryAfter: "60",
      });
    });

    it("RateLimitError toJSON without retryAfter", () => {
      const error = new RateLimitError();
      const json = error.toJSON();
      expect(json).toEqual({
        code: "RATE_LIMIT",
        message: "Rate limited",
        retryAfter: undefined,
      });
    });

    it("serializes dynamically attached metadata fields", () => {
      const error = new AuthError("Token expired") as AuthError & {
        correlationId?: string;
        tenantId?: string;
      };

      error.correlationId = "corr-789";
      error.tenantId = "tenant-xyz";

      expect(error.toJSON()).toEqual({
        code: "AUTH_ERROR",
        message: "Token expired",
        correlationId: "corr-789",
        tenantId: "tenant-xyz",
      });
    });

    it("JSON.stringify produces non-empty output for all errors", () => {
      const errors = [
        new ApiError(500),
        new ValidationError([]),
        new CommandRejectedError("type", "id"),
        new CommandTimeoutError("PT30S", "id"),
        new AuthError(),
        new ForbiddenError(),
        new RateLimitError(),
      ];
      for (const error of errors) {
        const json = JSON.stringify(error);
        expect(json).not.toBe("{}");
        const parsed = JSON.parse(json) as Record<string, unknown>;
        expect(parsed.code).toBeDefined();
        expect(parsed.message).toBeDefined();
      }
    });
  });

  describe("AC #2 — constructor arguments", () => {
    it("ApiError stores statusCode and body", () => {
      const error = new ApiError(503, { retry: true });
      expect(error.statusCode).toBe(503);
      expect(error.body).toEqual({ retry: true });
    });

    it("ApiError body is optional", () => {
      const error = new ApiError(500);
      expect(error.statusCode).toBe(500);
      expect(error.body).toBeUndefined();
    });

    it("ValidationError stores issues", () => {
      const issues: ZodIssue[] = [
        { code: "invalid_type", expected: "string", received: "number", path: ["field"], message: "Bad" },
      ];
      const error = new ValidationError(issues);
      expect(error.issues).toBe(issues);
    });

    it("CommandRejectedError stores rejectionEventType and correlationId", () => {
      const error = new CommandRejectedError("OrderDenied", "abc");
      expect(error.rejectionEventType).toBe("OrderDenied");
      expect(error.correlationId).toBe("abc");
    });

    it("CommandTimeoutError stores duration and correlationId", () => {
      const error = new CommandTimeoutError("PT1M", "xyz");
      expect(error.duration).toBe("PT1M");
      expect(error.correlationId).toBe("xyz");
    });

    it("RateLimitError stores retryAfter", () => {
      const error = new RateLimitError("120");
      expect(error.retryAfter).toBe("120");
    });

    it("RateLimitError retryAfter is optional", () => {
      const error = new RateLimitError();
      expect(error.retryAfter).toBeUndefined();
    });
  });
});

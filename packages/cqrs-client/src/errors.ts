import type { ZodIssue } from "zod";

const NON_SERIALIZED_ERROR_FIELDS = new Set(["code", "message", "name", "stack"]);

/**
 * Abstract base class for all Hexalith errors.
 * Implements toJSON() because JS Error properties are not enumerable —
 * JSON.stringify(new Error('x')) returns '{}' without it.
 */
export abstract class HexalithError extends Error {
  abstract readonly code: string;

  toJSON(): Record<string, unknown> {
    const fields = Object.fromEntries(
      Object.entries(this).filter(
        ([key]) => !NON_SERIALIZED_ERROR_FIELDS.has(key),
      ),
    );

    return { code: this.code, message: this.message, ...fields };
  }
}

export class ApiError extends HexalithError {
  readonly code = "API_ERROR";

  constructor(
    public readonly statusCode: number,
    public readonly body?: unknown,
  ) {
    super(`API error: ${statusCode}`);
    this.name = "ApiError";
  }
}

export class ValidationError extends HexalithError {
  readonly code = "VALIDATION_ERROR";

  constructor(public readonly issues: ZodIssue[]) {
    super(`Validation failed: ${issues.length} issue(s)`);
    this.name = "ValidationError";
  }
}

export class CommandRejectedError extends HexalithError {
  readonly code = "COMMAND_REJECTED";

  constructor(
    public readonly rejectionEventType: string,
    public readonly correlationId: string,
  ) {
    super(`Command rejected: ${rejectionEventType}`);
    this.name = "CommandRejectedError";
  }
}

export class CommandTimeoutError extends HexalithError {
  readonly code = "COMMAND_TIMEOUT";

  constructor(
    public readonly duration: string,
    public readonly correlationId: string,
  ) {
    super(`Command timed out after ${duration}`);
    this.name = "CommandTimeoutError";
  }
}

export class AuthError extends HexalithError {
  readonly code = "AUTH_ERROR";

  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends HexalithError {
  readonly code = "FORBIDDEN";

  constructor(message = "Access forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class RateLimitError extends HexalithError {
  readonly code = "RATE_LIMIT";

  constructor(public readonly retryAfter?: string) {
    super(
      retryAfter
        ? `Rate limited, retry after ${retryAfter}`
        : "Rate limited",
    );
    this.name = "RateLimitError";
  }
}

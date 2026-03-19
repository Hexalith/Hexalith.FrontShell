import {
  ApiError,
  AuthError,
  ForbiddenError,
  RateLimitError,
} from "../errors";

import type { HexalithError } from "../errors";
import type { ProblemDetails } from "./types";

/**
 * Parses an HTTP error response as RFC 9457 ProblemDetails and maps it
 * to the appropriate HexalithError subclass.
 *
 * Does NOT throw — the caller decides when to throw.
 */
export async function parseProblemDetails(
  response: Response,
): Promise<HexalithError> {
  const retryAfterHeader = response.headers.get("Retry-After");
  const textBody = await readResponseText(response);

  if (textBody === null) {
    return mapStatusToError(response.status, undefined, null, retryAfterHeader);
  }

  const body = tryParseJsonBody(textBody);

  if (body === undefined) {
    return mapStatusToError(response.status, undefined, textBody, retryAfterHeader);
  }

  const problemDetails = isProblemDetailsBody(body)
    ? body
    : undefined;

  return mapStatusToError(response.status, problemDetails, body, retryAfterHeader);
}

async function readResponseText(response: Response): Promise<string | null> {
  try {
    return await response.text();
  } catch {
    return null;
  }
}

function tryParseJsonBody(textBody: string): unknown | undefined {
  if (textBody.trim() === "") {
    return undefined;
  }

  try {
    return JSON.parse(textBody) as unknown;
  } catch {
    return undefined;
  }
}

function isProblemDetailsBody(body: unknown): body is Partial<ProblemDetails> {
  return typeof body === "object" && body !== null;
}

function mapStatusToError(
  status: number,
  problemDetails: Partial<ProblemDetails> | undefined,
  body: unknown,
  retryAfterHeader: string | null,
): HexalithError {
  const correlationId = problemDetails?.correlationId;
  const tenantId = problemDetails?.tenantId;

  switch (status) {
    case 401: {
      const error = new AuthError(
        problemDetails?.detail ?? "Authentication required",
      );
      assignOptionalFields(error, correlationId, tenantId);
      return error;
    }

    case 403: {
      const error = new ForbiddenError(
        problemDetails?.detail ?? "Access forbidden",
      );
      assignOptionalFields(error, correlationId, tenantId);
      return error;
    }

    case 429: {
      const error = new RateLimitError(retryAfterHeader ?? undefined);
      assignOptionalFields(error, correlationId, tenantId);
      return error;
    }

    default: {
      const error = new ApiError(status, body);
      assignOptionalFields(error, correlationId, tenantId);
      return error;
    }
  }
}

function assignOptionalFields(
  error: HexalithError,
  correlationId?: string,
  tenantId?: string,
): void {
  if (correlationId) {
    (error as HexalithError & { correlationId: string }).correlationId =
      correlationId;
  }
  if (tenantId) {
    (error as HexalithError & { tenantId: string }).tenantId = tenantId;
  }
}

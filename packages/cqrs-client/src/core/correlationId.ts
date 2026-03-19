import { ulid } from "ulidx";

export const CORRELATION_ID_HEADER = "X-Correlation-ID";

/**
 * Generates a ULID-based correlation ID.
 * ULIDs are lexicographically sortable and timestamp-embedded for debugging.
 */
export function generateCorrelationId(): string {
  return ulid();
}

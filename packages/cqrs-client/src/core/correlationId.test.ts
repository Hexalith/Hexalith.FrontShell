import { describe, expect, it } from "vitest";

import { CORRELATION_ID_HEADER, generateCorrelationId } from "./correlationId";

const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

describe("correlationId — ULID Generation Tests", () => {
  describe("AC #5 — ULID format", () => {
    it("generates a valid ULID string", () => {
      const id = generateCorrelationId();
      expect(id).toMatch(ULID_REGEX);
    });

    it("generates 26-character strings", () => {
      const id = generateCorrelationId();
      expect(id).toHaveLength(26);
    });
  });

  describe("AC #5 — lexicographic ordering", () => {
    it("later IDs sort after earlier IDs", async () => {
      const first = generateCorrelationId();
      // Small delay to ensure different timestamp component
      await new Promise((resolve) => {
        setTimeout(resolve, 2);
      });
      const second = generateCorrelationId();

      expect(second > first).toBe(true);
    });
  });

  describe("AC #5 — uniqueness", () => {
    it("generates unique IDs across multiple calls", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateCorrelationId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe("CORRELATION_ID_HEADER constant", () => {
    it("exports the correct header name", () => {
      expect(CORRELATION_ID_HEADER).toBe("X-Correlation-ID");
    });
  });
});

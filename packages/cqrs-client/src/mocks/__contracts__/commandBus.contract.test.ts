import { describe, expect, it } from "vitest";

import { CommandRejectedError, CommandTimeoutError } from "../../errors";

import type { ICommandBus } from "../../core/ICommandBus";
import type { SubmitCommandRequest } from "../../core/types";

// AC: 2-6#1 — Mock/real command bus contract parity

/** Valid test command fixture */
export const TEST_COMMAND: SubmitCommandRequest = {
  tenant: "test-tenant",
  domain: "TestDomain",
  aggregateId: "agg-001",
  commandType: "TestCommand",
  payload: { value: "test" },
};

/**
 * Parameterized contract test suite for ICommandBus implementations.
 * Run against MockCommandBus now; run against DaprCommandBus when it exists.
 * Expectations derived from Architecture § API & Communication Patterns.
 */
export function commandBusContractTests(
  name: string,
  createBus: () => ICommandBus,
  configureBehavior?: {
    configureReject: (bus: ICommandBus) => void;
    configureTimeout: (bus: ICommandBus) => void;
  },
): void {
  describe(`ICommandBus contract: ${name}`, () => {
    it("returns correlationId as ULID string on successful send", async () => {
      const bus = createBus();
      const result = await bus.send(TEST_COMMAND);
      expect(result.correlationId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/i);
    });

    it("simulates async delay (not instant)", async () => {
      const bus = createBus();
      const start = performance.now();
      await bus.send(TEST_COMMAND);
      expect(performance.now() - start).toBeGreaterThan(0);
    });

    if (configureBehavior) {
      it("surfaces rejection as CommandRejectedError", async () => {
        const bus = createBus();
        configureBehavior.configureReject(bus);
        await expect(bus.send(TEST_COMMAND)).rejects.toBeInstanceOf(
          CommandRejectedError,
        );
      });

      it("surfaces timeout as CommandTimeoutError", async () => {
        const bus = createBus();
        configureBehavior.configureTimeout(bus);
        await expect(bus.send(TEST_COMMAND)).rejects.toBeInstanceOf(
          CommandTimeoutError,
        );
      });

      it("rejected error includes correlationId", async () => {
        const bus = createBus();
        configureBehavior.configureReject(bus);
        try {
          await bus.send(TEST_COMMAND);
          expect.fail("Expected CommandRejectedError");
        } catch (e) {
          expect(e).toBeInstanceOf(CommandRejectedError);
          expect((e as CommandRejectedError).correlationId).toBeTruthy();
        }
      });

      it("timeout error includes correlationId", async () => {
        const bus = createBus();
        configureBehavior.configureTimeout(bus);
        try {
          await bus.send(TEST_COMMAND);
          expect.fail("Expected CommandTimeoutError");
        } catch (e) {
          expect(e).toBeInstanceOf(CommandTimeoutError);
          expect((e as CommandTimeoutError).correlationId).toBeTruthy();
        }
      });
    }
  });
}

import { describe, expectTypeOf, it } from "vitest";

import type { ICommandBus } from "./ICommandBus";
import type { SubmitCommandRequest, SubmitCommandResponse } from "./types";

describe("ICommandBus — Type-Level Tests", () => {
  describe("AC #1 — ICommandBus interface", () => {
    it("has a send method", () => {
      expectTypeOf<ICommandBus>().toHaveProperty("send");
    });

    it("send accepts SubmitCommandRequest and returns Promise<SubmitCommandResponse>", () => {
      expectTypeOf<ICommandBus["send"]>().toEqualTypeOf<
        (command: SubmitCommandRequest) => Promise<SubmitCommandResponse>
      >();
    });

    it("uses I-prefix following .NET conventions", () => {
      // Compile-time check: ICommandBus exists as an interface name
      expectTypeOf<ICommandBus>().not.toBeNever();
    });
  });
});

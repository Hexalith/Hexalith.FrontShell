import { createMockFn } from "./createMockFn";

import type { ConnectionHealthContextValue } from "../types";

export function createMockConnectionHealthContext(
  overrides?: Partial<ConnectionHealthContextValue>,
): ConnectionHealthContextValue {
  return {
    health: "connected",
    lastChecked: new Date(),
    checkNow: createMockFn(),
    ...overrides,
  };
}

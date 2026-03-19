import { createMockFn } from "./createMockFn";

import type { TenantContextValue } from "../types";

export function createMockTenantContext(
  overrides?: Partial<TenantContextValue>,
): TenantContextValue {
  return {
    activeTenant: "test-tenant",
    availableTenants: ["test-tenant"],
    switchTenant: createMockFn<[string], void>(),
    ...overrides,
  };
}

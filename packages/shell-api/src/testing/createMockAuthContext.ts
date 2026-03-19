import { createMockFn } from "./createMockFn";

import type { AuthContextValue } from "../types";

export function createMockAuthContext(
  overrides?: Partial<AuthContextValue>,
): AuthContextValue {
  return {
    user: {
      sub: "test-user",
      tenantClaims: ["test-tenant"],
      name: "Test User",
      email: "test@test.com",
    },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    signinRedirect: createMockFn(async () => {}),
    signoutRedirect: createMockFn(async () => {}),
    ...overrides,
  };
}

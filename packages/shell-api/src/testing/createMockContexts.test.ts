import { describe, expect, it } from "vitest";

import { createMockAuthContext } from "./createMockAuthContext";
import { createMockTenantContext } from "./createMockTenantContext";

describe("mock context factories", () => {
  it("creates auth callbacks that are spy-capable and callable", async () => {
    const context = createMockAuthContext();

    await context.signinRedirect();
    await context.signoutRedirect();

    expect("callCount" in context.signinRedirect).toBe(true);
    expect("callCount" in context.signoutRedirect).toBe(true);

    const signinRedirect = context.signinRedirect as typeof context.signinRedirect & {
      callCount: number;
      calls: unknown[][];
    };
    const signoutRedirect = context.signoutRedirect as typeof context.signoutRedirect & {
      callCount: number;
      calls: unknown[][];
    };

    expect(signinRedirect.callCount).toBe(1);
    expect(signoutRedirect.callCount).toBe(1);
    expect(signinRedirect.calls).toEqual([[]]);
    expect(signoutRedirect.calls).toEqual([[]]);
  });

  it("creates tenant switch callback that records requested tenant ids", () => {
    const context = createMockTenantContext();

    context.switchTenant("tenant-b");

    expect("callCount" in context.switchTenant).toBe(true);

    const switchTenant = context.switchTenant as typeof context.switchTenant & {
      callCount: number;
      calls: unknown[][];
    };

    expect(switchTenant.callCount).toBe(1);
    expect(switchTenant.calls).toEqual([["tenant-b"]]);
  });
});
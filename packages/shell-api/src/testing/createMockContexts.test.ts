import { describe, expect, it } from "vitest";

import { createMockAuthContext } from "./createMockAuthContext";
import { createMockTenantContext } from "./createMockTenantContext";

describe("mock context factories", () => {
  it("creates auth callbacks that are spy-capable and callable", async () => {
    const context = createMockAuthContext();

    await context.signinRedirect();
    await context.signoutRedirect();

    expect(context.signinRedirect.callCount).toBe(1);
    expect(context.signoutRedirect.callCount).toBe(1);
    expect(context.signinRedirect.calls).toEqual([[]]);
    expect(context.signoutRedirect.calls).toEqual([[]]);
  });

  it("creates tenant switch callback that records requested tenant ids", () => {
    const context = createMockTenantContext();

    context.switchTenant("tenant-b");

    expect(context.switchTenant.callCount).toBe(1);
    expect(context.switchTenant.calls).toEqual([["tenant-b"]]);
  });
});
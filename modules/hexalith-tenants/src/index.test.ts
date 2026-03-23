import { describe, expect, it } from "vitest";

import TenantRootPage, {
  CreateTenantCommandSchema,
  DisableTenantCommandSchema,
  TenantDetailSchema,
  TenantItemSchema,
  TenantListSchema,
  UpdateTenantCommandSchema,
  manifest,
  routes,
} from "./index";

describe("index exports", () => {
  it("re-exports the module entry points and schemas", () => {
    expect(TenantRootPage).toBeTypeOf("function");
    expect(manifest.name).toBe("tenants");
    expect(routes).toHaveLength(4);
    expect(TenantItemSchema).toBeDefined();
    expect(TenantListSchema).toBeDefined();
    expect(TenantDetailSchema).toBeDefined();
    expect(CreateTenantCommandSchema).toBeDefined();
    expect(UpdateTenantCommandSchema).toBeDefined();
    expect(DisableTenantCommandSchema).toBeDefined();
  });
});
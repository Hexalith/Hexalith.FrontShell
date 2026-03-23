import { describe, expect, it } from "vitest";

import { manifest } from "./manifest";

describe("manifest", () => {
  it("declares the expected module metadata and routes", () => {
    expect(manifest.name).toBe("tenants");
    expect(manifest.displayName).toBe("Tenants");
    expect(manifest.manifestVersion).toBe(1);
    expect(manifest.routes.map((route) => route.path)).toEqual([
      "/",
      "/detail/:id",
      "/create",
      "/edit/:id",
    ]);
    expect(manifest.navigation).toEqual([
      expect.objectContaining({
        label: "Tenants",
        path: "/",
        category: "Administration",
      }),
    ]);
  });
});
import { describe, expect, it } from "vitest";

import { manifest } from "./manifest.js";

// AC: 7-3#1

describe("manifest", () => {
  it("has required fields", () => {
    expect(manifest).toHaveProperty("manifestVersion");
    expect(manifest).toHaveProperty("name");
    expect(manifest).toHaveProperty("displayName");
    expect(manifest).toHaveProperty("version");
    expect(manifest).toHaveProperty("routes");
    expect(manifest).toHaveProperty("navigation");
  });

  it("name is kebab-case", () => {
    expect(manifest.name).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it("version is semver", () => {
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("routes start with /", () => {
    for (const route of manifest.routes) {
      expect(route.path).toMatch(/^\//);
    }
  });

  it("navigation paths match declared routes", () => {
    const routePaths = new Set(manifest.routes.map((r) => r.path));
    for (const nav of manifest.navigation) {
      expect(routePaths.has(nav.path)).toBe(true);
    }
  });

  it("has correct module identity", () => {
    expect(manifest.name).toBe("orders");
    expect(manifest.displayName).toBe("Orders");
    expect(manifest.manifestVersion).toBe(1);
  });

  it("declares expected routes", () => {
    const paths = manifest.routes.map((r) => r.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/detail/:id");
    expect(paths).toContain("/create");
  });
});

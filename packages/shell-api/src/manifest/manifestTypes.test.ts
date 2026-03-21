import { describe, it, expect } from "vitest";

import type {
  ModuleManifest,
  ModuleRoute,
  ModuleNavigation,
} from "./manifestTypes";

describe("ModuleManifest types — Acceptance Tests", () => {
  // ─── AC #4: ModuleManifest type enforcement ────────────────────
  describe("AC #4 — ModuleManifest enforces required fields", () => {
    it("valid ModuleManifest compiles", () => {
      const manifest: ModuleManifest = {
        manifestVersion: 1,
        name: "tenants",
        displayName: "Tenant Management",
        version: "0.1.0",
        routes: [{ path: "/tenants" }],
        navigation: [{ label: "Tenants", path: "/tenants" }],
      };
      expect(manifest).toBeDefined();
      expect(manifest.manifestVersion).toBe(1);
    });

    it("rejects manifest missing required name field", () => {
      // @ts-expect-error — missing required 'name' field
      const bad: ModuleManifest = {
        manifestVersion: 1,
        displayName: "Test",
        version: "0.1.0",
        routes: [],
        navigation: [],
      };
      expect(bad).toBeDefined();
    });

    it("rejects unknown manifestVersion", () => {
      const bad: ModuleManifest = {
        // @ts-expect-error — manifestVersion: 2 is not a valid version
        manifestVersion: 2,
        name: "test",
        displayName: "Test",
        version: "0.1.0",
        routes: [],
        navigation: [],
      };
      expect(bad).toBeDefined();
    });

    it("ModuleRoute requires path", () => {
      const route: ModuleRoute = { path: "/test" };
      expect(route.path).toBe("/test");
    });

    it("ModuleNavigation requires label and path", () => {
      const nav: ModuleNavigation = { label: "Test", path: "/test" };
      expect(nav.label).toBe("Test");
      expect(nav.path).toBe("/test");
    });

    it("ModuleNavigation allows optional icon and category", () => {
      const nav: ModuleNavigation = {
        label: "Test",
        path: "/test",
        icon: "settings",
        category: "admin",
      };
      expect(nav.icon).toBe("settings");
      expect(nav.category).toBe("admin");
    });

    it("manifest supports discriminated union via manifestVersion", () => {
      const m: ModuleManifest = {
        manifestVersion: 1,
        name: "test",
        displayName: "Test",
        version: "0.1.0",
        routes: [{ path: "/" }],
        navigation: [{ label: "Test", path: "/" }],
      };
      // manifestVersion acts as discriminant for future union variants
      expect(m.manifestVersion).toBe(1);
    });

    it("rejects manifest with missing version field", () => {
      // @ts-expect-error — missing required 'version' field
      const bad: ModuleManifest = {
        manifestVersion: 1,
        name: "test",
        displayName: "Test",
        routes: [{ path: "/" }],
        navigation: [{ label: "Test", path: "/" }],
      };
      expect(bad).toBeDefined();
    });

    it("rejects manifest with missing displayName", () => {
      // @ts-expect-error — missing required 'displayName' field
      const bad: ModuleManifest = {
        manifestVersion: 1,
        name: "test",
        version: "0.1.0",
        routes: [{ path: "/" }],
        navigation: [{ label: "Test", path: "/" }],
      };
      expect(bad).toBeDefined();
    });

    it("rejects manifest with missing routes", () => {
      // @ts-expect-error — missing required 'routes' field
      const bad: ModuleManifest = {
        manifestVersion: 1,
        name: "test",
        displayName: "Test",
        version: "0.1.0",
        navigation: [{ label: "Test", path: "/" }],
      };
      expect(bad).toBeDefined();
    });

    it("rejects manifest with missing navigation", () => {
      // @ts-expect-error — missing required 'navigation' field
      const bad: ModuleManifest = {
        manifestVersion: 1,
        name: "test",
        displayName: "Test",
        version: "0.1.0",
        routes: [{ path: "/" }],
      };
      expect(bad).toBeDefined();
    });

    it("ModuleRoute only requires path", () => {
      const route: ModuleRoute = { path: "/" };
      expect(Object.keys(route)).toEqual(["path"]);
    });
  });
});

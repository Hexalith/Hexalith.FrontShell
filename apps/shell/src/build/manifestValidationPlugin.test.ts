// @vitest-environment node
import { describe, it, expect } from "vitest";

import {
  loadManifestFromSource,
  validateManifestSet,
} from "./manifestValidationPlugin";

describe("loadManifestFromSource", () => {
  it("correctly parses a valid TypeScript manifest string", async () => {
    const source = `
      import type { ModuleManifest } from "@hexalith/shell-api";

      export const manifest: ModuleManifest = {
        manifestVersion: 1,
        name: "demo-tasks",
        displayName: "Demo Tasks",
        version: "0.1.0",
        routes: [{ path: "/" }, { path: "/detail/:id" }],
        navigation: [
          { label: "Demo Tasks", path: "/", icon: "list", category: "Demos" },
        ],
      };
    `;

    const manifest = await loadManifestFromSource(source);
    expect(manifest).toBeDefined();

    const m = manifest as Record<string, unknown>;
    expect(m.manifestVersion).toBe(1);
    expect(m.name).toBe("demo-tasks");
    expect(m.displayName).toBe("Demo Tasks");
    expect(m.version).toBe("0.1.0");
    expect(Array.isArray(m.routes)).toBe(true);
    expect((m.routes as unknown[]).length).toBe(2);
    expect(Array.isArray(m.navigation)).toBe(true);
  });

  it("handles manifest with type-only imports — type imports stripped, data extracted", async () => {
    const source = `
      import type { ModuleManifest } from "@hexalith/shell-api";
      import type { ModuleRoute } from "@hexalith/shell-api";

      const routes: ModuleRoute[] = [{ path: "/" }];

      export const manifest: ModuleManifest = {
        manifestVersion: 1,
        name: "typed-module",
        displayName: "Typed Module",
        version: "1.0.0",
        routes,
        navigation: [{ label: "Typed", path: "/" }],
      };
    `;

    const manifest = await loadManifestFromSource(source);
    expect(manifest).toBeDefined();
    const m = manifest as Record<string, unknown>;
    expect(m.name).toBe("typed-module");
  });

  it("fails gracefully on syntax errors", async () => {
    const source = `
      export const manifest = {{{
    `;

    await expect(loadManifestFromSource(source)).rejects.toThrow();
  });

  it("fails for manifest that uses a runtime import value", async () => {
    const source = `
      import { computeName } from "@nonexistent/library-that-does-not-exist";

      export const manifest = {
        manifestVersion: 1,
        name: computeName(),
        displayName: "Runtime Import",
        version: "1.0.0",
        routes: [{ path: "/" }],
        navigation: [{ label: "Test", path: "/" }],
      };
    `;

    // The require() call fails because the module doesn't exist
    await expect(loadManifestFromSource(source)).rejects.toThrow(/Hint/);
  });
});

describe("validateManifestSet", () => {
  it("detects duplicate module names", () => {
    const result = validateManifestSet([
      {
        name: "module-a",
        manifest: {
          manifestVersion: 1,
          name: "tasks",
          displayName: "Tasks A",
          version: "1.0.0",
          routes: [{ path: "/" }],
          navigation: [{ label: "Tasks", path: "/" }],
        },
      },
      {
        name: "module-b",
        manifest: {
          manifestVersion: 1,
          name: "tasks",
          displayName: "Tasks B",
          version: "1.0.0",
          routes: [{ path: "/" }],
          navigation: [{ label: "Tasks", path: "/" }],
        },
      },
    ]);

    expect(result.errors.some((e) => e.includes("Duplicate module name") && e.includes("tasks"))).toBe(true);
  });

  it("detects duplicate effective routes", () => {
    const result = validateManifestSet([
      {
        name: "module-a",
        manifest: {
          manifestVersion: 1,
          name: "shared",
          displayName: "Shared A",
          version: "1.0.0",
          routes: [{ path: "/" }],
          navigation: [{ label: "Shared", path: "/" }],
        },
      },
      {
        name: "module-b",
        manifest: {
          manifestVersion: 1,
          name: "shared",
          displayName: "Shared B",
          version: "1.0.0",
          routes: [{ path: "/" }],
          navigation: [{ label: "Shared", path: "/" }],
        },
      },
    ]);

    // Duplicate names => duplicate effective routes
    expect(result.errors.some((e) => e.includes("Duplicate"))).toBe(true);
  });

  it("passes with valid unique manifests", () => {
    const result = validateManifestSet([
      {
        name: "module-a",
        manifest: {
          manifestVersion: 1,
          name: "tasks",
          displayName: "Tasks",
          version: "1.0.0",
          routes: [{ path: "/" }],
          navigation: [{ label: "Tasks", path: "/" }],
        },
      },
      {
        name: "module-b",
        manifest: {
          manifestVersion: 1,
          name: "settings",
          displayName: "Settings",
          version: "1.0.0",
          routes: [{ path: "/" }],
          navigation: [{ label: "Settings", path: "/" }],
        },
      },
    ]);

    expect(result.errors).toHaveLength(0);
  });

  it("reports individual manifest field errors", () => {
    const result = validateManifestSet([
      {
        name: "bad-module",
        manifest: {
          manifestVersion: 1,
          name: "",
          displayName: "",
          version: "not-semver",
          routes: [],
          navigation: [],
        },
      },
    ]);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("name"))).toBe(true);
  });

  it("handles empty manifest set", () => {
    const result = validateManifestSet([]);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("detects invalid manifestVersion with guidance message", () => {
    const result = validateManifestSet([
      {
        name: "bad-version",
        manifest: {
          manifestVersion: 99,
          name: "test",
          displayName: "Test",
          version: "1.0.0",
          routes: [{ path: "/" }],
          navigation: [{ label: "Test", path: "/" }],
        },
      },
    ]);

    expect(result.errors.some((e) => e.includes("manifestVersion"))).toBe(true);
  });
});

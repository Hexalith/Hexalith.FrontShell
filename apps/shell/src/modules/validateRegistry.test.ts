import type React from "react";
import { describe, it, expect } from "vitest";

import type { ModuleManifest } from "@hexalith/shell-api";

import { validateRegisteredModules } from "./validateRegistry";

import type { RegisteredModule } from "./registry";

function createMockModule(
  overrides: Partial<{
    manifest: Partial<ModuleManifest>;
    basePath: string;
  }> = {},
): RegisteredModule {
  const manifest: ModuleManifest = {
    manifestVersion: 1,
    name: "test",
    displayName: "Test",
    version: "1.0.0",
    routes: [{ path: "/" }],
    navigation: [{ label: "Test", path: "/" }],
    ...overrides.manifest,
  };

  return {
    manifest,
    component: (() => null) as unknown as React.LazyExoticComponent<React.ComponentType>,
    basePath: overrides.basePath ?? manifest.name,
  };
}

describe("validateRegisteredModules", () => {
  it("passes validation with unique modules", () => {
    const modules = [
      createMockModule({
        manifest: { name: "tasks", displayName: "Tasks" },
        basePath: "tasks",
      }),
      createMockModule({
        manifest: { name: "settings", displayName: "Settings" },
        basePath: "settings",
      }),
    ];

    const result = validateRegisteredModules(modules);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("detects duplicate module names", () => {
    const modules = [
      createMockModule({
        manifest: { name: "tasks", displayName: "Tasks A" },
        basePath: "tasks",
      }),
      createMockModule({
        manifest: { name: "tasks", displayName: "Tasks B" },
        basePath: "tasks",
      }),
    ];

    const result = validateRegisteredModules(modules);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate module name") && e.includes("tasks"))).toBe(true);
  });

  it("detects duplicate basePaths (equivalent to duplicate names)", () => {
    const modules = [
      createMockModule({
        manifest: { name: "tasks", displayName: "Tasks A" },
        basePath: "tasks",
      }),
      createMockModule({
        manifest: { name: "tasks", displayName: "Tasks B" },
        basePath: "tasks",
      }),
    ];

    const result = validateRegisteredModules(modules);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate route"))).toBe(true);
  });

  it("aggregates individual manifest validation errors", () => {
    const modules = [
      createMockModule({
        manifest: { name: "" as unknown as string, displayName: "Bad Module" },
        basePath: "bad",
      }),
    ];

    const result = validateRegisteredModules(modules);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("name"))).toBe(true);
  });

  it("reports warnings from validateManifest", () => {
    const modules = [
      createMockModule({
        manifest: {
          name: "tasks",
          displayName: "Tasks",
          routes: [{ path: "/" }],
          navigation: [{ label: "Tasks", path: "/nonexistent" }],
        },
        basePath: "tasks",
      }),
    ];

    const result = validateRegisteredModules(modules);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes("does not match any declared route"))).toBe(true);
  });

  it("handles empty modules array gracefully", () => {
    const result = validateRegisteredModules([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("handles single module", () => {
    const modules = [
      createMockModule({
        manifest: { name: "solo", displayName: "Solo Module" },
        basePath: "solo",
      }),
    ];

    const result = validateRegisteredModules(modules);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("invalid manifestVersion produces error with guidance", () => {
    const modules = [
      createMockModule({
        manifest: { manifestVersion: 99 as unknown as 1, name: "bad-version" },
        basePath: "bad-version",
      }),
    ];

    const result = validateRegisteredModules(modules);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("manifestVersion"))).toBe(true);
  });
});

import { describe, it, expect } from "vitest";

import { validateManifest } from "@hexalith/shell-api";
import type { ModuleManifest } from "@hexalith/shell-api";

import { createRegisteredModules, modules } from "./registry";
import { validateRegisteredModules } from "./validateRegistry";

function createManifest(overrides?: Partial<ModuleManifest>): ModuleManifest {
  return {
    manifestVersion: 1,
    name: "tasks",
    displayName: "Tasks",
    version: "1.0.0",
    routes: [{ path: "/" }],
    navigation: [{ label: "Tasks", path: "/", icon: "list" }],
    ...overrides,
  };
}

describe("module registry", () => {
  it("exports a modules array", () => {
    expect(Array.isArray(modules)).toBe(true);
  });

  it("creates registered modules from discovered manifests and entry loaders", () => {
    const registeredModules = createRegisteredModules(
      {
        "../../../../modules/hexalith-demo-tasks/src/manifest.ts":
          createManifest(),
      },
      {
        "../../../../modules/hexalith-demo-tasks/src/index.ts": async () => ({
          default: () => null,
        }),
      },
    );

    expect(registeredModules).toHaveLength(1);
    expect(registeredModules[0].manifest.displayName).toBe("Tasks");
    expect(registeredModules[0].basePath).toBe("tasks");
    expect(registeredModules[0].component).toBeTruthy();
  });

  it("ignores discovered manifests that do not have a matching entry loader", () => {
    const registeredModules = createRegisteredModules(
      {
        "../../../../modules/hexalith-demo-tasks/src/manifest.ts":
          createManifest(),
      },
      {},
    );

    expect(registeredModules).toHaveLength(0);
  });

  it("sorts discovered modules by basePath for stable registration order", () => {
    const registeredModules = createRegisteredModules(
      {
        "../../../../modules/zebra/src/manifest.ts": createManifest({
          name: "zebra",
          displayName: "Zebra",
        }),
        "../../../../modules/alpha/src/manifest.ts": createManifest({
          name: "alpha",
          displayName: "Alpha",
        }),
      },
      {
        "../../../../modules/zebra/src/index.ts": async () => ({
          default: () => null,
        }),
        "../../../../modules/alpha/src/index.ts": async () => ({
          default: () => null,
        }),
      },
    );

    expect(registeredModules.map((module) => module.basePath)).toEqual([
      "alpha",
      "zebra",
    ]);
  });

  it("all registered modules have valid manifests", () => {
    for (const mod of modules) {
      const result = validateManifest(mod.manifest);
      expect(result.valid).toBe(true);
    }
  });

  it("each module has a lazy component and basePath", () => {
    for (const mod of modules) {
      expect(mod.component).toBeTruthy();
      expect(typeof mod.basePath).toBe("string");
      expect(mod.basePath.length).toBeGreaterThan(0);
    }
  });

  it("module names are unique", () => {
    const names = modules.map((m) => m.manifest.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("module basePaths are unique", () => {
    const paths = modules.map((m) => m.basePath);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("validateRegisteredModules passes for the exported modules", () => {
    const result = validateRegisteredModules(modules);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

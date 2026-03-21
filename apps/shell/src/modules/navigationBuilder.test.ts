import { lazy } from "react";
import { describe, it, expect } from "vitest";

import type { ModuleManifest } from "@hexalith/shell-api";

import { buildNavigationItems } from "./navigationBuilder";

import type { RegisteredModule } from "./registry";

function makeMockModule(overrides?: Partial<ModuleManifest>): RegisteredModule {
  const manifest: ModuleManifest = {
    manifestVersion: 1,
    name: "tasks",
    displayName: "Tasks",
    version: "1.0.0",
    routes: [{ path: "/" }, { path: "/detail/:id" }],
    navigation: [
      { label: "Tasks", path: "/", icon: "list", category: "Modules" },
    ],
    ...overrides,
  };

  return {
    manifest,
    component: lazy(() => Promise.resolve({ default: () => null })),
    basePath: manifest.name,
  };
}

describe("buildNavigationItems", () => {
  it("generates navigation items from manifests", () => {
    const modules = [makeMockModule()];
    const items = buildNavigationItems(modules);

    expect(items).toHaveLength(1);
    expect(items[0].label).toBe("Tasks");
    expect(items[0].icon).toBe("list");
  });

  it("prefixes paths with module basePath", () => {
    const modules = [makeMockModule()];
    const items = buildNavigationItems(modules);

    expect(items[0].to).toBe("/tasks");
  });

  it("handles non-root navigation paths", () => {
    const modules = [
      makeMockModule({
        navigation: [
          { label: "Detail", path: "/detail", icon: "info" },
        ],
      }),
    ];
    const items = buildNavigationItems(modules);

    expect(items[0].to).toBe("/tasks/detail");
  });

  it("defaults category to 'Modules' when not specified", () => {
    const modules = [
      makeMockModule({
        navigation: [{ label: "Tasks", path: "/" }],
      }),
    ];
    const items = buildNavigationItems(modules);

    expect(items[0].category).toBe("Modules");
  });

  it("preserves explicit category from manifest", () => {
    const modules = [
      makeMockModule({
        navigation: [
          { label: "Tasks", path: "/", category: "Operations" },
        ],
      }),
    ];
    const items = buildNavigationItems(modules);

    expect(items[0].category).toBe("Operations");
  });

  it("empty modules array produces empty navigation", () => {
    const items = buildNavigationItems([]);
    expect(items).toHaveLength(0);
  });
});

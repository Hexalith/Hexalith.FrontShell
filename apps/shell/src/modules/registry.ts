import type React from "react";

import type { ModuleManifest } from "@hexalith/shell-api";

import { lazyWithRetry } from "./lazyWithRetry";
import { validateRegisteredModules } from "./validateRegistry";

interface ModuleEntryExports {
  default: React.ComponentType;
}

type DiscoveredManifestMap = Record<string, ModuleManifest>;
type DiscoveredModuleLoaderMap = Record<
  string,
  () => Promise<ModuleEntryExports>
>;

export interface RegisteredModule {
  manifest: ModuleManifest;
  component: React.LazyExoticComponent<React.ComponentType>;
  basePath: string;
}

const discoveredManifests = import.meta.glob<ModuleManifest>(
  "../../../../modules/*/src/manifest.ts",
  {
    eager: true,
    import: "manifest",
  },
);

const discoveredModuleLoaders = import.meta.glob<ModuleEntryExports>(
  "../../../../modules/*/src/index.ts",
);

function toEntryPath(manifestPath: string): string {
  return manifestPath.replace(/\/manifest\.[tj]s$/, "/index.ts");
}

export function createRegisteredModules(
  manifestModules: DiscoveredManifestMap,
  componentLoaders: DiscoveredModuleLoaderMap,
): RegisteredModule[] {
  return Object.entries(manifestModules)
    .map(([manifestPath, manifest]) => {
      const entryPath = toEntryPath(manifestPath);
      const loadModule = componentLoaders[entryPath];

      if (!loadModule) {
        return null;
      }

      return {
        manifest,
        component: lazyWithRetry(async () => {
          const moduleEntry = await loadModule();

          return { default: moduleEntry.default };
        }),
        basePath: manifest.name,
      } satisfies RegisteredModule;
    })
    .filter((module): module is RegisteredModule => module !== null)
    .sort((left, right) => left.basePath.localeCompare(right.basePath));
}

const rawModules = createRegisteredModules(
  discoveredManifests,
  discoveredModuleLoaders,
);

const validationResult = validateRegisteredModules(rawModules);
if (validationResult.warnings.length > 0) {
  for (const warning of validationResult.warnings) {
    console.warn(`[module-registry] ${warning}`);
  }
}
if (!validationResult.valid) {
  throw new Error(
    `Module registry validation failed:\n${validationResult.errors.join("\n")}`,
  );
}

export const modules = rawModules;

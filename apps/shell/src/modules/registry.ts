import { lazy } from "react";
import type React from "react";

import type { ModuleManifest } from "@hexalith/shell-api";

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
        component: lazy(async () => {
          const moduleEntry = await loadModule();

          return { default: moduleEntry.default };
        }),
        basePath: manifest.name,
      } satisfies RegisteredModule;
    })
    .filter((module): module is RegisteredModule => module !== null)
    .sort((left, right) => left.basePath.localeCompare(right.basePath));
}

export const modules = createRegisteredModules(
  discoveredManifests,
  discoveredModuleLoaders,
);

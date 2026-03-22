import React from "react";

import { ModuleErrorBoundary, ModuleRenderGuard, ModuleSkeleton } from "../errors";

import type { RegisteredModule } from "./registry";
import type { RouteObject } from "react-router";

/**
 * Builds react-router v7 route objects from registered modules.
 * Each module gets ONE wildcard route — the module's default export
 * handles its own internal sub-routing.
 */
export function buildModuleRoutes(
  registeredModules: RegisteredModule[],
): RouteObject[] {
  return registeredModules.map((mod) => ({
    path: `${mod.basePath}/*`,
    element: React.createElement(
      ModuleErrorBoundary,
      { name: mod.manifest.displayName },
      React.createElement(
        React.Suspense,
        { fallback: React.createElement(ModuleSkeleton) },
        // MUST be inside Suspense — guard checks post-load render, not pre-load suspension
        React.createElement(
          ModuleRenderGuard,
          { moduleName: mod.manifest.displayName },
          React.createElement(mod.component),
        ),
      ),
    ),
  }));
}

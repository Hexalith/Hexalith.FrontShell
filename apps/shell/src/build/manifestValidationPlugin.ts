import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { transform } from "esbuild";
import fg from "fast-glob";

import { validateManifest } from "@hexalith/shell-api";

import type { Plugin, ResolvedConfig } from "vite";

/**
 * Loads a TypeScript manifest source string into a manifest object.
 * Uses esbuild.transform (stateless string-to-string) to strip type annotations,
 * then executes the result in an isolated function scope.
 *
 * Manifest loaded via esbuild.transform — should match import.meta.glob({ eager: true }) result.
 *
 * SECURITY NOTE: The manifest files are developer-authored TypeScript committed to the
 * repository — they are trusted build-time inputs, not user-provided data. This is the
 * same pattern used by Vite's own config file loading (packages/vite/src/node/config.ts).
 */
export async function loadManifestFromSource(
  source: string,
): Promise<unknown> {
  const result = await transform(source, {
    loader: "ts",
    format: "cjs",
  });

  const mod = { exports: {} as Record<string, unknown> };
  try {
    const fn = new Function("module", "exports", result.code);
    fn(mod, mod.exports);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to evaluate manifest: ${message}. ` +
        "Hint: manifest.ts may contain runtime imports (not type-only) that cannot be evaluated at build time. " +
        "Manifests must be pure data with only 'import type' statements.",
    );
  }

  return mod.exports.manifest;
}

/**
 * Validates a set of loaded manifests for individual and cross-manifest errors.
 */
export function validateManifestSet(
  manifests: Array<{ name: string; manifest: unknown }>,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Individual manifest validation
  for (const entry of manifests) {
    const result = validateManifest(entry.manifest);
    for (const error of result.errors) {
      errors.push(`[${entry.name}] ${error.field}: ${error.message}`);
    }
    for (const warning of result.warnings) {
      warnings.push(`[${entry.name}] ${warning.field}: ${warning.message}`);
    }
  }

  // Cross-manifest: duplicate module names
  const nameOwners = new Map<string, string[]>();
  for (const entry of manifests) {
    if (entry.manifest == null || typeof entry.manifest !== "object") continue;
    const m = entry.manifest as Record<string, unknown>;
    if (typeof m.name === "string" && m.name.length > 0) {
      const owners = nameOwners.get(m.name);
      if (owners) {
        owners.push(entry.name);
      } else {
        nameOwners.set(m.name, [entry.name]);
      }
    }
  }
  for (const [name, owners] of nameOwners) {
    if (owners.length > 1) {
      errors.push(
        `Duplicate module name '${name}' declared by: ${owners.join(", ")}`,
      );
    }
  }

  // Cross-manifest: duplicate effective routes
  const routeOwners = new Map<string, string>();
  for (const entry of manifests) {
    if (entry.manifest == null || typeof entry.manifest !== "object") continue;
    const m = entry.manifest as Record<string, unknown>;
    if (typeof m.name !== "string" || !Array.isArray(m.routes)) continue;

    const basePath = `/${m.name}`;
    for (const route of m.routes as Array<Record<string, unknown>>) {
      if (route == null || typeof route.path !== "string") continue;
      const effectiveRoute = `${basePath}${route.path === "/" ? "" : route.path}`;
      const existingOwner = routeOwners.get(effectiveRoute);
      if (existingOwner && existingOwner !== m.name) {
        errors.push(
          `Duplicate route '${effectiveRoute}': declared by both '${existingOwner}' and '${m.name}'`,
        );
      } else {
        routeOwners.set(effectiveRoute, m.name);
      }
    }
  }

  return { errors, warnings };
}

export function manifestValidationPlugin(): Plugin {
  let projectRoot = "";

  return {
    name: "hexalith-manifest-validation",
    enforce: "pre",

    configResolved(config: ResolvedConfig) {
      projectRoot = resolve(config.root, "../..");

      if (!existsSync(resolve(projectRoot, "modules"))) {
        config.logger.warn(
          `[manifest-validation] Warning: 'modules/' directory not found at ${projectRoot}. Verify project root calculation.`,
        );
      }
    },

    async buildStart() {
      // Discover manifest files
      const manifestPaths = fg.globSync("modules/*/src/manifest.ts", {
        cwd: projectRoot,
        absolute: true,
      });

      if (manifestPaths.length === 0) {
        this.info("[manifest-validation] No module manifests found — skipping validation");
        return;
      }

      // Load each manifest via esbuild transform
      const loadedManifests: Array<{ name: string; manifest: unknown }> = [];

      for (const manifestPath of manifestPaths) {
        const source = readFileSync(manifestPath, "utf-8");
        try {
          const manifest = await loadManifestFromSource(source);
          // Extract module directory name for error identification
          const pathSegments = manifestPath.replace(/\\/g, "/").split("/");
          const modulesIdx = pathSegments.lastIndexOf("modules");
          const moduleDirName =
            modulesIdx >= 0 && modulesIdx + 1 < pathSegments.length
              ? pathSegments[modulesIdx + 1]
              : manifestPath;

          loadedManifests.push({ name: moduleDirName, manifest });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          this.error(
            `[manifest-validation] Failed to load ${manifestPath}:\n  ${message}`,
          );
          return;
        }
      }

      // Validate manifests (individual + cross-manifest)
      const { errors, warnings } = validateManifestSet(loadedManifests);

      // Check module package.json for cross-module dependencies
      const packageJsonPaths = fg.globSync("modules/*/package.json", {
        cwd: projectRoot,
        absolute: true,
      });

      // Collect all module package names
      const modulePackageNames = new Set<string>();
      const modulePackages: Array<{
        dirName: string;
        packageName: string;
        deps: Record<string, string>;
      }> = [];

      for (const pkgPath of packageJsonPaths) {
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
            name?: string;
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
          };
          const pathSegments = pkgPath.replace(/\\/g, "/").split("/");
          const modulesIdx = pathSegments.lastIndexOf("modules");
          const dirName =
            modulesIdx >= 0 && modulesIdx + 1 < pathSegments.length
              ? pathSegments[modulesIdx + 1]
              : pkgPath;

          if (pkg.name) {
            modulePackageNames.add(pkg.name);
          }
          modulePackages.push({
            dirName,
            packageName: pkg.name ?? dirName,
            deps: { ...pkg.dependencies, ...pkg.devDependencies },
          });
        } catch {
          // Skip malformed package.json
        }
      }

      for (const mod of modulePackages) {
        for (const depName of Object.keys(mod.deps)) {
          if (modulePackageNames.has(depName) && depName !== mod.packageName) {
            errors.push(
              `Module '${mod.dirName}' lists '${depName}' as a dependency. Cross-module dependencies are forbidden.`,
            );
          }
        }
      }

      // Report results
      for (const warning of warnings) {
        this.warn(`[manifest-validation] ${warning}`);
      }

      if (errors.length > 0) {
        this.error(
          `[manifest-validation] Build failed with ${errors.length} error(s):\n\n  ${errors.join("\n  ")}`,
        );
        return;
      }

      // Count total routes across all manifests
      let routeCount = 0;
      for (const entry of loadedManifests) {
        if (entry.manifest != null && typeof entry.manifest === "object") {
          const m = entry.manifest as Record<string, unknown>;
          if (Array.isArray(m.routes)) {
            routeCount += m.routes.length;
          }
        }
      }

      this.info(
        `[manifest-validation] ✓ ${loadedManifests.length} module(s), ${routeCount} route(s)${warnings.length > 0 ? `, ${warnings.length} warning(s)` : ""}`,
      );
    },
  };
}

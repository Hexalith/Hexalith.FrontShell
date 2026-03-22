import { validateManifest } from "@hexalith/shell-api";

import type { RegisteredModule } from "./registry";

export interface RegistryValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateRegisteredModules(
  modules: RegisteredModule[],
): RegistryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Run validateManifest() on each module's manifest
  for (const mod of modules) {
    const result = validateManifest(mod.manifest);
    for (const error of result.errors) {
      errors.push(`[${mod.manifest.name || mod.basePath}] ${error.field}: ${error.message}`);
    }
    for (const warning of result.warnings) {
      warnings.push(`[${mod.manifest.name || mod.basePath}] ${warning.field}: ${warning.message}`);
    }
  }

  // Step 2: Check for duplicate module names
  const nameIndices = new Map<string, number[]>();
  for (let i = 0; i < modules.length; i++) {
    const name = modules[i].manifest.name;
    const indices = nameIndices.get(name);
    if (indices) {
      indices.push(i);
    } else {
      nameIndices.set(name, [i]);
    }
  }
  for (const [name, indices] of nameIndices) {
    if (indices.length > 1) {
      errors.push(
        `Duplicate module name '${name}' declared by modules at indices ${indices.join(", ")}`,
      );
    }
  }

  // Step 3: Check for duplicate routes across modules
  // Each module's routes are prefixed with /${manifest.name} (the basePath)
  const routeOwners = new Map<string, string>();
  for (const mod of modules) {
    const basePath = `/${mod.manifest.name}`;

    // Check basePath uniqueness (already caught by duplicate name check, but explicit)
    const wildcardRoute = `${basePath}/*`;
    const existingOwner = routeOwners.get(wildcardRoute);
    if (existingOwner) {
      errors.push(
        `Duplicate route '${wildcardRoute}': declared by both '${existingOwner}' and '${mod.manifest.name}'`,
      );
    } else {
      routeOwners.set(wildcardRoute, mod.manifest.name);
    }
  }

  // Step 4: Aggregate warnings from individual validateManifest() results
  // (already done in Step 1)

  return { valid: errors.length === 0, errors, warnings };
}

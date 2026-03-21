export interface ManifestValidationError {
  field: string;
  message: string;
}

export interface ManifestValidationResult {
  valid: boolean;
  errors: ManifestValidationError[];
  warnings: ManifestValidationError[];
}

const KEBAB_CASE_RE = /^[a-z][a-z0-9-]*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+/;

function validateV1(m: Record<string, unknown>): ManifestValidationResult {
  const errors: ManifestValidationError[] = [];
  const warnings: ManifestValidationError[] = [];

  // name
  if (typeof m.name !== "string" || m.name.length === 0) {
    errors.push({ field: "name", message: "name must be a non-empty string" });
  } else if (!KEBAB_CASE_RE.test(m.name)) {
    errors.push({
      field: "name",
      message: "name must be lowercase kebab-case (e.g., my-module)",
    });
  }

  // displayName
  if (typeof m.displayName !== "string" || m.displayName.length === 0) {
    errors.push({
      field: "displayName",
      message: "displayName must be a non-empty string",
    });
  }

  // version
  if (typeof m.version !== "string" || !SEMVER_RE.test(m.version)) {
    errors.push({
      field: "version",
      message: "version must be a valid semver string (e.g., 1.0.0)",
    });
  }

  // routes
  if (!Array.isArray(m.routes) || m.routes.length === 0) {
    errors.push({
      field: "routes",
      message: "routes must be a non-empty array",
    });
  } else {
    for (let i = 0; i < m.routes.length; i++) {
      const route = m.routes[i] as Record<string, unknown> | undefined;
      if (
        route == null ||
        typeof route.path !== "string" ||
        !route.path.startsWith("/")
      ) {
        errors.push({
          field: `routes[${i}].path`,
          message: "Each route path must be a string starting with /",
        });
      }
    }
  }

  // navigation
  if (!Array.isArray(m.navigation) || m.navigation.length === 0) {
    errors.push({
      field: "navigation",
      message: "navigation must be a non-empty array",
    });
  } else {
    const routePaths = new Set(
      Array.isArray(m.routes)
        ? (m.routes as Array<Record<string, unknown>>)
            .filter((r) => r != null && typeof r.path === "string")
            .map((r) => r.path as string)
        : [],
    );

    for (let i = 0; i < m.navigation.length; i++) {
      const nav = m.navigation[i] as Record<string, unknown> | undefined;
      if (nav == null) {
        errors.push({
          field: `navigation[${i}]`,
          message: "Navigation item must be an object",
        });
        continue;
      }

      if (typeof nav.label !== "string" || nav.label.length === 0) {
        errors.push({
          field: `navigation[${i}].label`,
          message: "Navigation label must be a non-empty string",
        });
      }

      if (typeof nav.path !== "string" || nav.path.length === 0) {
        errors.push({
          field: `navigation[${i}].path`,
          message: "Navigation path must be a non-empty string",
        });
      } else if (!nav.path.startsWith("/")) {
        errors.push({
          field: `navigation[${i}].path`,
          message: "Navigation path must start with /",
        });
      } else if (!routePaths.has(nav.path)) {
        warnings.push({
          field: `navigation[${i}].path`,
          message: `Navigation path "${nav.path}" does not match any declared route`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateManifest(
  manifest: unknown,
): ManifestValidationResult {
  if (manifest == null || typeof manifest !== "object") {
    return {
      valid: false,
      errors: [
        {
          field: "manifest",
          message: "Manifest must be a non-null object",
        },
      ],
      warnings: [],
    };
  }

  const m = manifest as Record<string, unknown>;

  switch (m.manifestVersion) {
    case 1:
      return validateV1(m);
    default:
      return {
        valid: false,
        errors: [
          {
            field: "manifestVersion",
            message: `Unknown manifestVersion: ${String(m.manifestVersion)}`,
          },
        ],
        warnings: [],
      };
  }
}

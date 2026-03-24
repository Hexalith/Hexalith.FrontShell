# ModuleManifest Guide

Source: `packages/shell-api/src/manifest/manifestTypes.ts` and `validateManifest.ts`

## Purpose

Every Hexalith module exports a `ModuleManifestV1` object describing its identity, routes, and navigation. The shell reads manifests at build time to compose the application.

## Fields

### Required

| Field | Type | Description |
|-------|------|-------------|
| `manifestVersion` | `1` (const) | Schema version discriminator. Always `1` for V1 manifests. Enables future schema evolution without breaking existing modules. |
| `name` | `string` | Module identifier. Must be lowercase kebab-case (`^[a-z][a-z0-9-]*$`). Used for routing prefix, package naming, and directory names. |
| `displayName` | `string` | Human-readable name for UI display. Must be non-empty. |
| `version` | `string` | Semver version (`^\d+\.\d+\.\d+`). Must match `package.json` version. |
| `routes` | `ModuleRoute[]` | Non-empty array of route definitions. Each route has a `path` starting with `/`. |
| `navigation` | `ModuleNavigation[]` | Non-empty array of sidebar navigation entries. |

### Optional

| Field | Type | Description |
|-------|------|-------------|
| `migrationStatus` | `'native' \| 'coexisting' \| 'migrating'` | Migration state for modules transitioning from legacy systems. Omit for new modules. |

### ModuleRoute

```typescript
interface ModuleRoute {
  path: string; // Must start with "/"
}
```

### ModuleNavigation

```typescript
interface ModuleNavigation {
  label: string;    // Non-empty display label
  path: string;     // Must start with "/" and should match a declared route
  icon?: string;    // Optional icon identifier
  category?: string; // Optional sidebar grouping
}
```

## Validation Rules

The `validateManifest()` function enforces these rules (source: `validateManifest.ts`):

1. **Manifest must be a non-null object** — null or non-object inputs are rejected.
2. **`manifestVersion` must equal `1`** — unknown versions produce an error with the received value.
3. **`name` must be a non-empty kebab-case string** — validated with regex `^[a-z][a-z0-9-]*$`.
4. **`displayName` must be a non-empty string**.
5. **`version` must be a valid semver string** — validated with regex `^\d+\.\d+\.\d+`.
6. **`routes` must be a non-empty array** — each route's `path` must be a string starting with `/`.
7. **`navigation` must be a non-empty array** — each item must have:
   - `label`: non-empty string
   - `path`: non-empty string starting with `/`
8. **Navigation-route cross-reference** (warning, not error): if a navigation item's `path` does not match any declared route, a warning is emitted: `Navigation path "/foo" does not match any declared route`.

### Validation Result

```typescript
interface ManifestValidationResult {
  valid: boolean;
  errors: ManifestValidationError[];  // Blocking issues
  warnings: ManifestValidationError[]; // Non-blocking issues (e.g., unmatched nav paths)
}
```

## Complete Example

A fictional "orders" module manifest:

```typescript
import type { ModuleManifestV1 } from '@hexalith/shell-api';

export const manifest: ModuleManifestV1 = {
  manifestVersion: 1,
  name: 'orders',
  displayName: 'Order Management',
  version: '1.0.0',
  routes: [
    { path: '/' },
    { path: '/detail' },
    { path: '/create' },
  ],
  navigation: [
    { label: 'Orders', path: '/', icon: 'shopping-cart', category: 'Commerce' },
    { label: 'New Order', path: '/create', icon: 'plus', category: 'Commerce' },
  ],
};
```

## Anti-Patterns

| Don't | Do |
|-------|----|
| Use uppercase in `name` (`OrderManagement`) | Use kebab-case (`order-management`) |
| Omit leading `/` in route paths (`detail`) | Always start with `/` (`/detail`) |
| Declare navigation paths that don't match routes | Ensure every navigation `path` appears in `routes` |
| Hardcode `manifestVersion` to anything other than `1` | Always set `manifestVersion: 1` |
| Use non-semver versions (`v1.0` or `1.0`) | Use full semver (`1.0.0`) |
| Declare an empty `routes` or `navigation` array | Include at least one entry in each |

# @hexalith/shell-api

Shared contracts and context providers between the shell and modules. Defines the module manifest schema, authentication, multi-tenancy, theming, and locale contexts.

## Exports

| Export | Purpose |
|--------|---------|
| `useAuth`, `AuthProvider` | OIDC authentication context |
| `useTenant`, `TenantProvider` | Multi-tenant context |
| `useTheme`, `ThemeProvider` | Light/dark theme switching |
| `useLocale`, `LocaleProvider` | Localization context |
| `useConnectionHealth` | Connection health monitoring |
| `useFormDirty` | Unsaved changes tracking |
| `ModuleManifest`, `validateManifest` | Module manifest types and validation |
| `MockShellProvider` | Test wrapper with all providers |

## Module Manifest

Every module declares a manifest describing its routes and navigation:

```ts
import type { ModuleManifest } from '@hexalith/shell-api';

export const manifest: ModuleManifest = {
  id: 'my-module',
  name: 'My Module',
  routes: [{ path: '/' }, { path: '/detail/:id' }],
  navigation: {
    label: 'My Module',
    icon: 'package',
    category: 'Modules',
  },
};
```

## Testing

Use `MockShellProvider` to wrap components in tests:

```tsx
import { MockShellProvider } from '@hexalith/shell-api/testing';

render(
  <MockShellProvider>
    <MyComponent />
  </MockShellProvider>
);
```

## Scripts

```bash
pnpm build    # Build with tsup
pnpm test     # Unit tests (Vitest)
pnpm lint     # ESLint
```

# @hexalith/tenants

Multi-tenant administration module. Provides CRUD pages for managing tenants within the Hexalith shell.

## Pages

| Page | Route | Description |
|------|-------|-------------|
| TenantListPage | `/` | Table with filtering and row actions |
| TenantDetailPage | `/detail/:id` | Read-only tenant details |
| TenantCreatePage | `/create` | New tenant form |
| TenantEditPage | `/edit/:id` | Edit existing tenant |

## Structure

```
src/
├── pages/       # Page components (List, Detail, Create, Edit)
├── schemas/     # Zod domain types (TenantItem, TenantDetail, CreateTenantInput, etc.)
├── data/        # Sample data and mocks
├── testing/     # Test helpers (renderWithProviders)
├── styles/      # Module-scoped CSS
├── manifest.ts  # Module declaration (routes, navigation)
├── routes.tsx   # Route definitions with code-splitting
└── index.ts     # Public exports
```

## Development

```bash
pnpm dev          # Standalone dev server (via dev-host/)
pnpm test         # Unit tests (Vitest)
pnpm test:watch   # Watch mode
pnpm test:ct      # Component tests (Playwright CT)
pnpm lint         # ESLint
pnpm build        # Build with tsup
```

The `dev` script launches this module in isolation using the dev-host, with mock providers for auth, tenants, and CQRS.

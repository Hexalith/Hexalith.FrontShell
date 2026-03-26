# @hexalith/orders

Order management module. Provides pages for viewing, creating, and inspecting orders with line item detail.

## Pages

| Page | Route | Description |
|------|-------|-------------|
| OrderListPage | `/` | Table with sorting and filtering |
| OrderDetailPage | `/detail/:id` | Order details with line items |
| OrderCreatePage | `/create` | New order form |

## Structure

```
src/
├── pages/       # Page components (List, Detail, Create)
├── schemas/     # Zod domain types (OrderItem, OrderDetail, OrderLineItem, CreateOrderCommand)
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

# @hexalith/shell

The main micro-frontend shell application. Hosts and coordinates feature modules, providing authentication, multi-tenancy, theming, routing, and real-time updates.

## Architecture

```
src/
├── auth/          # OIDC authentication setup
├── build/         # Module composition and loading
├── config/        # Environment and runtime configuration
├── errors/        # Error handling and boundary pages
├── layout/        # Shell layout (Sidebar, Header, Main)
├── modules/       # Dynamic module loader and registry
├── navigation/    # Navigation builder and sidebar
├── pages/         # Shell-level pages (Welcome, NotFound)
├── providers/     # Context providers (Auth, CQRS, Theme, Tenant, Locale)
└── styles/        # Global styles and token imports
```

## How it works

1. Shell reads module manifests at build time
2. Each manifest declares routes, navigation items, and icons
3. Shell composes a unified sidebar and router from all registered modules
4. Modules render inside the shell layout, inheriting all context providers

## Scripts

```bash
pnpm dev           # Start dev server (Vite)
pnpm build         # Typecheck + production build
pnpm test          # Unit tests (Vitest)
pnpm test:e2e      # End-to-end tests (Playwright)
pnpm lint          # ESLint
pnpm typecheck     # TypeScript strict check
```

## Dependencies

- **@hexalith/shell-api** — contracts between shell and modules
- **@hexalith/cqrs-client** — command/query buses and SignalR
- **@hexalith/ui** — design system components and tokens
- **react-router** v7 — routing
- **react-oidc-context** — OIDC authentication

# create-hexalith-module

CLI scaffold generator for new Hexalith feature modules.

## Usage

From the monorepo root:

```bash
pnpm create-module my-module-name
```

This creates `modules/hexalith-my-module-name/` with:

- **manifest.ts** — Module declaration (routes, navigation, icon)
- **routes.tsx** — Code-split route definitions
- **pages/** — List, Detail, Create, Edit page components
- **schemas/** — Zod domain types
- **testing/** — `renderWithProviders` helper
- **dev-host/** — Standalone Vite app for isolated development
- **vitest.config.ts** + **playwright-ct.config.ts** — Test configs
- **package.json** — Pre-configured with all peer/dev dependencies

## What gets generated

```
modules/hexalith-{name}/
├── src/
│   ├── index.ts
│   ├── manifest.ts
│   ├── routes.tsx
│   ├── pages/          # 4 page templates + tests
│   ├── schemas/        # Zod schemas
│   ├── components/     # (empty, add yours)
│   ├── hooks/          # (empty, add yours)
│   ├── data/           # Sample data
│   ├── testing/        # Test utilities
│   └── styles/         # Module CSS
├── dev-host/           # Standalone dev server
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── playwright-ct.config.ts
```

## Naming

Module names must be **kebab-case**. The tool transforms the name for different contexts:

| Input | Context | Result |
|-------|---------|--------|
| `my-module` | Directory | `hexalith-my-module` |
| `my-module` | Package | `@hexalith/my-module` |
| `my-module` | Display | `My Module` |

## Scripts

```bash
pnpm build       # Build CLI with tsup
pnpm test        # Unit + integration tests
pnpm lint        # ESLint
```

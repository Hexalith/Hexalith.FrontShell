# Naming Conventions and File Organization

## File Naming

| Pattern | Extension | Example |
|---------|-----------|---------|
| Components | `PascalCase.tsx` | `OrderList.tsx`, `DetailView.tsx` |
| Hooks | `camelCase.ts` | `useSubmitCommand.ts`, `useQuery.ts` |
| Utilities | `camelCase.ts` | `correlationId.ts`, `etagCache.ts` |
| Types (standalone) | `camelCase.ts` or `types.ts` | `types.ts`, `manifestTypes.ts` |
| CSS Modules | `PascalCase.module.css` | `Button.module.css`, `Table.module.css` |
| Unit tests | `.test.ts(x)` | `useQuery.test.ts`, `Button.test.tsx` |
| E2E tests | `.spec.ts(x)` | `navigation.spec.ts` |
| Contract tests | `.contract.test.ts` | `commandBus.contract.test.ts` |
| Storybook stories | `.stories.tsx` | `Button.stories.tsx` |
| Zod schemas | `camelCase.ts` in `schemas/` | `tenantViewSchema.ts` |

## Code Naming

| Category | Convention | Example |
|----------|-----------|---------|
| Components | `PascalCase` | `PageLayout`, `ErrorBoundary` |
| Hooks | `camelCase` with `use` prefix | `useQuery`, `useCommandPipeline` |
| Types/Interfaces | `PascalCase` | `ModuleManifestV1`, `QueryParams` |
| Interfaces (contracts) | `I` prefix | `ICommandBus`, `IQueryBus` |
| Implementations | Descriptive prefix | `MockCommandBus`, `DaprCommandBus` |
| Zod schemas | `PascalCase` + `Schema` suffix | `TenantViewSchema`, `OrderListSchema` |
| Constants | `UPPER_SNAKE_CASE` | `FRESH_THRESHOLD_MS`, `CORRELATION_ID_HEADER` |
| Enums | **Never use TypeScript `enum`** | Use union types: `type Status = 'active' \| 'disabled'` |
| Event handler props | `on` prefix | `onClick`, `onSubmit`, `onValueChange` |
| Internal handlers | `handle` prefix | `handleDelete`, `handleSubmit` |
| Boolean variables | `is`/`has`/`should` prefix | `isLoading`, `hasError`, `shouldRefetch` |
| CSS custom properties | `--hx-` prefix | `--hx-color-primary`, `--hx-space-4` |

## File Organization

### Co-located Tests

Tests live next to source files. **Never use `__tests__/` directories.**

```
useQuery.ts
useQuery.test.ts
Button.tsx
Button.module.css
Button.test.tsx
Button.stories.tsx
```

### Simple vs Complex Components

**Simple component** (1-2 files): flat in parent directory.

```
components/
  Button.tsx
  Button.module.css
  Button.test.tsx
```

**Complex component** (3+ files): folder with `index.ts` re-export.

```
components/
  Table/
    index.ts           # Re-export: export { Table } from './Table'
    Table.tsx
    Table.module.css
    Table.test.tsx
    TablePagination.tsx
    csvExport.ts
```

### Barrel Exports

Barrel exports (`index.ts`) only at **package root** `src/index.ts`. No sub-folder barrels.

```
packages/ui/src/
  index.ts             # YES — package entry point
  components/
    forms/
      index.ts         # NO — no sub-folder barrels
```

### Internal Utilities

`internal/` folder for shared utilities not in public API. Requires 2+ consumers.

```
packages/cqrs-client/src/
  internal/
    fetchClient.ts     # Used by commands/ and queries/
```

## Import Ordering

Enforced by ESLint `import/order`:

```typescript
// 1. React
import { useState, useCallback } from 'react';

// 2. External libraries
import { z } from 'zod';

// 3. @hexalith/* packages
import { useQuery } from '@hexalith/cqrs-client';
import { Table, PageLayout } from '@hexalith/ui';

// 4. Relative imports
import { OrderSchema } from '../schemas/orderSchema';
import { columns } from './columns';

// 5. CSS modules (last)
import styles from './OrderList.module.css';
```

Type-only imports are separated:

```typescript
import { useQuery } from '@hexalith/cqrs-client';
import type { QueryParams } from '@hexalith/cqrs-client';
```

## Formatting Conventions

All data formatting must use `Intl` APIs — never manual date/number formatting. Pass `undefined` as locale to respect the user's browser settings.

| Data Type | Formatter | Example |
|-----------|-----------|---------|
| Date (table) | `new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })` | "Mar 25, 2026" |
| Date (detail) | `new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" })` | "March 25, 2026 at 2:30 PM" |
| Currency | `new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" })` | "$1,247.50" |
| Number | `new Intl.NumberFormat()` | "1,247" |
| Status | CSS module badge with variant mapping | See UX interaction patterns |

## Navigation Conventions

Always use **relative paths** for in-module navigation. Never hardcode absolute module paths.

| Action | Method |
|--------|--------|
| To list (from detail/create/edit) | `navigate("..")` |
| To detail (from list row click) | `navigate(\`detail/${id}\`)` |
| To create (from list button) | `navigate("create")` |
| To edit (from detail button) | `navigate(\`../edit/${id}\`)` |
| Back | `navigate("..")` or `navigate(-1)` |

## Storybook Title Convention

```
@hexalith/{package}/{Category}/{ComponentName}
```

Examples:
- `@hexalith/ui/Forms/Button`
- `@hexalith/ui/Data Display/Table`
- `@hexalith/ui/Feedback/Skeleton`

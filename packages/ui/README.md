# @hexalith/ui

Design system library with accessible React components, design tokens, and a Storybook catalog.

## Components

| Category | Components |
|----------|-----------|
| **Layout** | PageLayout, Stack, Inline, Divider |
| **Forms** | Button, Input, TextArea, Select, Checkbox, DatePicker, Form/FormField |
| **Feedback** | Toast, Skeleton, EmptyState, ErrorDisplay, ErrorBoundary |
| **Navigation** | Sidebar, Tabs |
| **Overlay** | Tooltip, Modal, AlertDialog, DropdownMenu, Popover |
| **Data Display** | Table (sorting, filtering), DetailView |

## Design Tokens

Tokens live in `src/tokens/` and enforce visual consistency:

- `colors.css` — Light/dark theme colors
- `spacing.css` — 12-scale spacing units
- `typography.css` — Font families, sizes, weights
- `radius.css` — Border radius scale
- `motion.css` — Transition timing
- `z-index.css` — Layering strategy

## Usage

```tsx
import { Button, Table, Skeleton } from '@hexalith/ui';
import '@hexalith/ui/tokens'; // import tokens once at app root
```

All components wrap Radix UI primitives. Direct Radix imports are blocked by ESLint — always use `@hexalith/ui`.

## Scripts

```bash
pnpm storybook       # Launch Storybook dev server
pnpm build           # Build with tsup
pnpm test            # Unit tests (Vitest)
pnpm test:ct         # Component tests (Playwright CT)
pnpm health          # Design system health check
pnpm lint            # ESLint
```

## Testing

- **Unit tests** — Vitest with Testing Library
- **Component tests** — Playwright CT with visual regression screenshots
- **Stories** — Variant + dark theme coverage for all components
- **Accessibility** — axe-core integration, WCAG 2.1 AA compliant

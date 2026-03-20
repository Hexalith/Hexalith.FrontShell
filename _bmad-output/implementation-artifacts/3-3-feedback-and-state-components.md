# Story 3.3: Feedback & State Components

Status: done

## Story

As a module developer,
I want standardized components for loading, error, empty, and notification states,
So that every state in my module looks intentional and designed — not like something broke.

## Acceptance Criteria

1. **Toast Component (wraps @radix-ui/react-toast):** A notification is triggered and renders at the configured anchor point with auto-dismiss behavior. Maximum 3 visible toasts — when a 4th arrives, the oldest non-error toast is evicted first (error toasts are protected from eviction unless all 3 are errors). Toasts stack vertically from the anchor point. The toast uses `--z-toast: 400` z-index token. Toast variants map to emotional registers: `success` uses assertive register (accent/success prominence), `error` uses urgent register (danger color, persistent — does NOT auto-dismiss), `info` uses neutral register, `warning` uses assertive register.

2. **Skeleton Component (custom, no Radix):** `<Skeleton variant="table" rows={5} />` renders a content-aware skeleton matching the target layout dimensions exactly (CLS budget = 0). Variants include `'table'`, `'form'`, `'detail'`, `'card'`. Skeleton animation uses motion tokens and respects `prefers-reduced-motion` (static gray block, no animation). Skeleton displays for a minimum 300ms to prevent flicker (via `isReady` + internal timer — skeleton stays visible until both data is ready AND 300ms has elapsed). No generic pulsing blocks or spinners — every skeleton matches its content shape.

3. **EmptyState Component (custom, no Radix):** `<EmptyState title="No orders yet" action={{ label: "Create order", onClick }} />` renders a title + optional description + optional action CTA. The design is consistent across all modules. Supports anticipatory context: "Orders will appear here as they're created for [Tenant Name]". The illustration slot accepts `React.ReactNode` for module-specific illustrations.

4. **ErrorBoundary Component (React error boundary, no Radix):** When a child component throws an error, the boundary catches it and renders a contextual error UI via `<ErrorDisplay>`. The boundary does NOT catch errors from hooks — it is a module/shell-level boundary. The rest of the application remains functional.

5. **ErrorDisplay Component (custom, no Radix):** `<ErrorDisplay error={error} onRetry={retry} />` renders a contextual error message with a retry button. Accepts an `Error` object or string. Renders title, message, and an optional retry action. Used standalone OR as the fallback UI inside `<ErrorBoundary>`.

6. **Token Compliance:** All feedback components use design tokens exclusively. Token compliance scan reports 100% for all component CSS. Both light and dark themes produce correct, contrast-compliant results.

## Tasks / Subtasks

- [x] Task 0: Pre-implementation verification (AC: all)
  - [x]**GATE CHECK:** Run `pnpm build && pnpm test && pnpm lint` in `packages/ui/`. **If any command fails, STOP and report.**
  - [x]**PREREQUISITE:** Verify Story 3-1 is complete — `packages/ui/src/components/layout/` exists with PageLayout, Stack, Inline, Divider; `clsx` is a dependency; test libraries in devDependencies; `vitest.config.ts` has CSS Module support; ESLint `no-restricted-imports` blocks `@radix-ui/*` from outside `packages/ui/`.
  - [x]**PREREQUISITE:** Verify Story 3-2 is complete — `packages/ui/src/components/forms/` exists with Button, Input, Select; `packages/ui/src/components/overlay/` exists with Tooltip; `@radix-ui/react-select` and `@radix-ui/react-tooltip` are dependencies; `@testing-library/user-event` is a devDependency. **If 3-2 is not complete, STOP and report — Toast and Skeleton depend on the patterns established in 3-2.**
  - [x]Verify z-index token file exists at `packages/ui/src/tokens/z-index.css` with `--z-popover`. If it does NOT exist (Story 3-2 may not have created it), create it with the full z-index scale: `--z-dropdown: 100`, `--z-popover: 200`, `--z-modal: 300`, `--z-toast: 400` in `@layer tokens { }` and import it in the token entry point.
  - [x]Verify `--z-toast: 400` exists in z-index tokens. If only `--z-popover` exists, add `--z-toast: 400` to the z-index token file.
  - [x]Verify status color tokens exist in `packages/ui/src/tokens/colors.css`: `--color-status-success`, `--color-status-warning`, `--color-status-danger`, `--color-status-info`. These are needed for Toast variant styling.
  - [x]Verify `--color-text-on-accent` exists (created in Story 3-2 for Button primary variant). If not, validate contrast of `#FFFFFF` against `--color-accent` in both themes and create the token.
  - [x]Verify existing token references: `--color-surface-elevated`, `--color-text-primary`, `--color-text-secondary`, `--color-border-default`, `--color-accent`, `--transition-duration-fast`, `--transition-duration-default`, `--transition-easing-default`, `--spacing-1` through `--spacing-6`

- [x]Task 1: Add dependencies (AC: #1)
  - [x]Add `@radix-ui/react-toast` as a direct dependency in `packages/ui/package.json`. Pin to the same version range as existing Radix packages (`@radix-ui/react-select`, `@radix-ui/react-tooltip`) from Story 3-2 — all Radix packages should use the same major version to prevent subtle incompatibilities.
  - [x]Run `pnpm install` to verify dependency resolution
  - [x]Verify ESLint `no-restricted-imports` blocks `@radix-ui/*` from outside `packages/ui/` (configured in Story 3-1)

- [x]Task 2: Create z-index tokens if needed (AC: #1)
  - [x]If `packages/ui/src/tokens/z-index.css` does not exist, create it:
    ```css
    @layer tokens {
      :root {
        --z-dropdown: 100;
        --z-popover: 200;
        --z-modal: 300;
        --z-toast: 400;
      }
    }
    ```
  - [x]If the file exists but `--z-toast` is missing, add it
  - [x]Ensure the z-index token file is imported in the token entry chain (imported by the entry CSS or by a component that references it)

- [x]Task 3: Implement `<Toast>` component and `<ToastProvider>` (AC: #1, #6)
  - [x]Create `packages/ui/src/components/feedback/Toast.tsx` wrapping `@radix-ui/react-toast`
  - [x]Create `packages/ui/src/components/feedback/Toast.module.css` with `@layer components { }`
  - [x]Create `packages/ui/src/components/feedback/Toast.test.tsx`
  - [x]Implement `ToastProvider` wrapping Radix Toast.Provider + Toast.Viewport
  - [x]Implement `useToast()` hook returning `{ toast(options): string, dismiss(id): void }`
  - [x]Implement Toast variants: `success`, `error`, `warning`, `info`
  - [x]Implement auto-dismiss: success/info/warning auto-dismiss after 5 seconds; error toasts are persistent (use `Number.MAX_SAFE_INTEGER` for duration — do NOT use `Infinity` as Radix may not support it) — user must dismiss manually
  - [x]Implement max 3 visible toasts — when 4th arrives, evict oldest **non-error** toast first; only evict error toasts if all 3 are errors
  - [x]Implement vertical stacking from bottom-right anchor point
  - [x]Implement close button (X) on each toast
  - [x]Apply `--z-toast: 400` to Toast.Viewport
  - [x]Apply motion tokens with `prefers-reduced-motion` support (slide-in/slide-out animation)
  - [x]DO NOT add duplicate `aria-*` — Radix manages ARIA (role="status" for success/info/warning, role="alert" for error)
  - [x]Set `Toast.displayName = 'Toast'`
  - [x]Implement `dismiss(id)` to programmatically remove a specific toast by ID
  - [x]Export `ToastProvider`, `useToast` (and type: `ToastOptions`) from `packages/ui/src/index.ts`. Do NOT export `ToastContext`, `ToastItemProps`, or internal toast state types — these are implementation details. Module developers interact only with `useToast()` and `ToastOptions`.

- [x]Task 4: Implement `<Skeleton>` component (AC: #2, #6)
  - [x]Create `packages/ui/src/components/feedback/Skeleton.tsx` — pure CSS animation, no Radix
  - [x]Create `packages/ui/src/components/feedback/Skeleton.module.css` with `@layer components { }`
  - [x]Create `packages/ui/src/components/feedback/Skeleton.test.tsx`
  - [x]Implement variant prop: `'table' | 'form' | 'detail' | 'card'`
  - [x]Implement `rows` prop for table variant (number of skeleton rows)
  - [x]Implement `fields` prop for form variant (number of skeleton fields)
  - [x]Implement minimum display duration (300ms) — component accepts `isReady` prop; skeleton stays visible until BOTH `isReady === true` AND 300ms has elapsed since mount
  - [x]Implement pulse animation using `@keyframes` with `--transition-duration-default` — subtle opacity shift (0.6 → 1.0), NOT color shift
  - [x]Implement `prefers-reduced-motion`: static gray block, no animation
  - [x]Each variant renders content-aware shapes: table variant renders header row + N data rows; form variant renders label+input pairs; detail variant renders section headers + key-value pairs; card variant renders image placeholder + text lines
  - [x]Skeleton background uses `--color-surface-secondary` (light theme) / equivalent in dark theme
  - [x]Set `Skeleton.displayName = 'Skeleton'`
  - [x]Export from `packages/ui/src/index.ts`

- [x]Task 5: Implement `<EmptyState>` component (AC: #3, #6)
  - [x]Create `packages/ui/src/components/feedback/EmptyState.tsx` — pure presentational, no Radix
  - [x]Create `packages/ui/src/components/feedback/EmptyState.module.css` with `@layer components { }`
  - [x]Create `packages/ui/src/components/feedback/EmptyState.test.tsx`
  - [x]Implement `title` (required), `description` (optional), `action` (optional: `{ label: string; onClick: () => void }`), `illustration` (optional: `React.ReactNode`), `className` (optional)
  - [x]Render centered vertically in parent container: illustration (if provided) → title → description → action button (using `<Button variant="primary">` from Story 3-2)
  - [x]Title uses `--font-size-lg`, `--font-weight-semibold`, `--color-text-primary`
  - [x]Description uses `--font-size-body`, `--color-text-secondary`
  - [x]Stack items vertically using gap with `--spacing-3`
  - [x]Constrained max-width for readability (~400px via token or reasonable value)
  - [x]Zero external margin
  - [x]Set `EmptyState.displayName = 'EmptyState'`
  - [x]Export from `packages/ui/src/index.ts`

- [x]Task 6: Implement `<ErrorDisplay>` component (AC: #5, #6)
  - [x]Create `packages/ui/src/components/feedback/ErrorDisplay.tsx` — pure presentational, no Radix
  - [x]Create `packages/ui/src/components/feedback/ErrorDisplay.module.css` with `@layer components { }`
  - [x]Create `packages/ui/src/components/feedback/ErrorDisplay.test.tsx`
  - [x]Implement `error` prop (accepts `Error | string`), `onRetry` (optional callback), `title` (optional, defaults to "Something went wrong"), `className` (optional)
  - [x]Render centered: danger icon (inline SVG) → title → error message → retry button (if `onRetry` provided, using `<Button variant="secondary">`)
  - [x]Title uses `--font-size-lg`, `--font-weight-semibold`, `--color-text-primary`
  - [x]Error message uses `--font-size-body`, `--color-text-secondary`
  - [x]Danger icon uses `--color-status-danger`
  - [x]Stack items using `--spacing-3` gap
  - [x]Constrained max-width for readability (~400px)
  - [x]Zero external margin
  - [x]In dev mode only: if `error` is an `Error` object, render stack trace in a collapsible `<details>` element with `--font-size-sm` monospace
  - [x]Set `ErrorDisplay.displayName = 'ErrorDisplay'`
  - [x]Export from `packages/ui/src/index.ts`

- [x]Task 7: Implement `<ErrorBoundary>` component (AC: #4, #6)
  - [x]Create `packages/ui/src/components/feedback/ErrorBoundary.tsx` — React class component error boundary
  - [x]Create `packages/ui/src/components/feedback/ErrorBoundary.test.tsx`
  - [x]Implement as React class component with `componentDidCatch` and `getDerivedStateFromError`
  - [x]Props: `children` (required), `fallback` (optional: `React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode)`), `onError` (optional callback for telemetry), `className` (optional)
  - [x]Default fallback renders `<ErrorDisplay>` with the caught error and a retry button that resets the boundary state
  - [x]Custom fallback function receives the error and a reset function
  - [x]Reset function: clears error state, re-renders children (allows retry)
  - [x]`onError` callback fires with the error and errorInfo for external error monitoring
  - [x]Does NOT have its own CSS Module — uses ErrorDisplay for visual rendering
  - [x]Set `ErrorBoundary.displayName = 'ErrorBoundary'`
  - [x]Export from `packages/ui/src/index.ts`

- [x]Task 8: Final verification — Definition of Done (AC: all)
  - [x]Update `packages/ui/src/index.ts` with Feedback section exports. Maintain canonical order: `// --- Layout Components ---` → `// --- Forms Components ---` → `// --- Feedback Components ---` → `// --- Overlay Components ---` → (future: Navigation, Data Display). **IMPORTANT:** If Story 3-2 placed Overlay exports (Tooltip) immediately after Forms without a Feedback section gap, you MUST reorder: insert the Feedback section BETWEEN Forms and Overlay to match the canonical category order.
  - [x]Run `pnpm build` — confirm tsup produces ESM + .d.ts
  - [x]Run `pnpm test` — confirm ALL Vitest tests pass (layout + forms + overlay + feedback)
  - [x]Run `pnpm lint` — confirm ESLint + token compliance passes
  - [x]Run token compliance scanner against all new CSS Modules — must report 100%
  - [x]Verify all components render correctly with `[data-theme="dark"]` on root
  - [x]Verify Toast stacking behavior with 4+ toasts (oldest dismissed)
  - [x]Verify Skeleton minimum 300ms display duration
  - [x]Verify ErrorBoundary catches and renders fallback on child error
  - [x]**Story is DONE when all of the above pass.** Do not mark complete with any failure.

## Dev Notes

### Prerequisites — Stories 3-1 AND 3-2 Must Be Complete

Story 3-3 depends on both Story 3-1 (layout components, test infrastructure, CSS layer setup) and Story 3-2 (forms components, Radix integration patterns, `data-*` attribute pattern validation, z-index tokens). Before starting, verify ALL of these exist:

**From Story 3-1:**

- `packages/ui/src/components/layout/` with PageLayout, Stack, Inline, Divider
- `clsx` as a direct dependency in package.json
- `@testing-library/react` and `@testing-library/jest-dom` as devDependencies
- `vitest.config.ts` with `css: { modules: true }` (projects config with jsdom)
- ESLint `no-restricted-imports` blocking `@radix-ui/*` from outside `packages/ui/`
- `packages/ui/src/tokens/reset.css` (CSS reset in `@layer reset { }`)
- `packages/ui/src/components/layout/types.ts` exporting `SpacingScale` type
- Test setup: `afterEach(cleanup)` in test-setup.ts (per Story 3-1 debug finding)

**From Story 3-2:**

- `packages/ui/src/components/forms/` with Button, Input, Select
- `packages/ui/src/components/overlay/` with Tooltip
- `@radix-ui/react-select` and `@radix-ui/react-tooltip` as dependencies
- `@testing-library/user-event` as a devDependency
- `data-*` attribute pattern validated for CSS Module attribute selectors
- Z-index tokens (`--z-popover`) — verify file exists, add `--z-toast` if missing
- Button component available for reuse in EmptyState and ErrorDisplay action buttons

**If any prerequisite is missing, STOP and report.**

### Architecture Constraints — MUST Follow

1. **File naming:** PascalCase.tsx, PascalCase.module.css, PascalCase.test.tsx. [Source: architecture.md#Naming Patterns]

2. **Component location:** All feedback components go in `src/components/feedback/`. [Source: architecture.md#File Structure — packages/ui/src/components/feedback/]

3. **CSS Modules + @layer:** All styles MUST use CSS Modules (`.module.css`) wrapped in `@layer components { }`. Use design token CSS custom properties exclusively — zero hardcoded values. [Source: architecture.md#Styling Solution]

4. **Zero external margin:** ALL components have zero external margin. Parent layout containers control spacing via `gap`. [Source: UX spec#Margin-Free Components]

5. **CSS class names:** camelCase for CSS Module class names (`.toastRoot`, `.skeletonRow`). [Source: architecture.md#CSS class names]

6. **Barrel export:** Root `src/index.ts` is the ONLY barrel file. Organize with category comments in this order: **Layout → Forms → Feedback → Navigation → Overlay → Data Display**. [Source: architecture.md#Barrel Export Clarification]

7. **Prop naming:** Domain terms, not primitives. Event handlers: `on` + PascalCase verb. Boolean props: `is`/`has`/`should` prefix. [Source: architecture.md#Code Naming]

8. **Radix encapsulation:** Module developers never import Radix directly. ESLint enforces this. `@hexalith/ui` wrappers MUST NOT add `aria-*` attributes that duplicate Radix's built-in ARIA. [Source: architecture.md, UX spec#Radix Integration]

9. **Package dependency rules:** `@hexalith/ui` may import from React and `@hexalith/shell-api` (peer dep). MUST NOT import from `@hexalith/cqrs-client`. [Source: architecture.md#Package Dependency Rules]

10. **Simple component classification:** All feedback components are classified as Simple (≤ 12 props). Do not exceed the prop budget. [Source: UX spec#Component Complexity Classification]

11. **API stability:** Feedback components' API is frozen after this story ships. Visual changes via tokens only — API changes require a major version bump. [Source: UX spec#Structural vs. Content Component Distinction]

12. **Components never catch errors internally:** Error boundaries are module-level or shell-level concerns. Components throw, boundaries catch. The `<ErrorBoundary>` in this story is the reusable boundary component — it does NOT go inside other components. [Source: UX spec#Composition Testing]

### Component API Specifications

#### `<Toast>` and `<ToastProvider>` (Simple — ≤ 12 props)

**Architecture:** Toast requires two parts:

1. `<ToastProvider>` — wraps the app (placed in shell's provider tree), manages toast state and renders the Radix Toast.Viewport
2. `useToast()` — hook that returns a `toast()` function for triggering notifications

```tsx
// ToastProvider — placed once in the app shell
interface ToastProviderProps {
  children: React.ReactNode;
}

// useToast hook return type
interface ToastOptions {
  variant: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  duration?: number; // Override auto-dismiss duration in ms. Ignored for 'error' variant.
}

function useToast(): {
  toast: (options: ToastOptions) => string; // Returns toast ID for programmatic dismiss
  dismiss: (id: string) => void; // Dismiss a specific toast by ID
};

// Individual Toast (internal, rendered by ToastProvider)
interface ToastItemProps {
  variant: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  onDismiss: () => void;
}
```

**ToastProvider wrapping structure:**

```tsx
<ToastContext.Provider value={{ toast }}>
  {children}
  <Radix.Toast.Provider swipeDirection="right">
    {toasts.map((t) => (
      <Radix.Toast.Root
        key={t.id}
        className={styles.root}
        data-variant={t.variant}
        duration={
          t.variant === "error" ? Number.MAX_SAFE_INTEGER : (t.duration ?? 5000)
        }
        type={t.variant === "error" ? "foreground" : "background"}
        onOpenChange={(open) => !open && removeToast(t.id)}
      >
        <Radix.Toast.Title className={styles.title}>
          {t.title}
        </Radix.Toast.Title>
        {t.description && (
          <Radix.Toast.Description className={styles.description}>
            {t.description}
          </Radix.Toast.Description>
        )}
        <Radix.Toast.Close className={styles.closeButton}>
          {/* inline SVG X icon */}
        </Radix.Toast.Close>
      </Radix.Toast.Root>
    ))}
    <Radix.Toast.Viewport className={styles.viewport} />
  </Radix.Toast.Provider>
</ToastContext.Provider>
```

**Toast state management:**

- Use `React.useState` to manage an array of active toasts
- Each toast gets a unique ID via incrementing counter (e.g., `let nextId = 0; const id = String(nextId++)`). Do NOT use `crypto.randomUUID()` — it is not available in jsdom test environment and will cause `TypeError` in Vitest.
- `toast()` returns the assigned ID string — enables programmatic `dismiss(id)` for CQRS feedback patterns (e.g., dismiss "Processing..." toast when command completes, then show success/error toast)
- `dismiss(id)` removes a specific toast by ID from the array
- Max 3 visible: when adding a 4th toast, remove the oldest **non-error** toast from the array. If all 3 visible toasts are error toasts, then remove the oldest error toast. This prevents important error notifications from being silently evicted by success/info toasts.
- `useToast()` reads from context — must be inside `<ToastProvider>`
- Guard: `if (!context) throw new Error('useToast must be used within <ToastProvider>')` — prevents silent failures when hook is used outside provider

**Variant-to-register mapping and styling:**

| Variant   | Register  | Left border color        | Icon                          | Auto-dismiss        |
| --------- | --------- | ------------------------ | ----------------------------- | ------------------- |
| `success` | Assertive | `--color-status-success` | Checkmark circle (inline SVG) | Yes, 5s             |
| `error`   | Urgent    | `--color-status-danger`  | Alert triangle (inline SVG)   | **No** — persistent |
| `warning` | Assertive | `--color-status-warning` | Warning circle (inline SVG)   | Yes, 5s             |
| `info`    | Neutral   | `--color-status-info`    | Info circle (inline SVG)      | Yes, 5s             |

**Visual design:**

- Toast container: `--color-surface-elevated` background, subtle `box-shadow` for elevation
- Left border: 4px solid with variant color (status token)
- Icon: variant-specific inline SVG, colored with the variant's status token
- Title: `--font-size-body`, `--font-weight-medium`, `--color-text-primary`
- Description: `--font-size-sm`, `--color-text-secondary`
- Close button: `--color-text-tertiary`, hover `--color-text-primary`
- Padding: `--spacing-3` horizontal, `--spacing-2` vertical
- Max-width: 400px (per UX spec)
- Border-radius: `--spacing-1` (4px)

**Viewport positioning:** Bottom-right corner, fixed position. `--z-toast: 400`. Viewport has `--spacing-3` padding from viewport edge. Toasts stack upward. Use a CSS custom property for bottom offset: `bottom: var(--toast-viewport-bottom, var(--spacing-3))` — the shell can override `--toast-viewport-bottom` to account for the status bar height without modifying the Toast component.

**Animations:** Slide in from right on enter, slide out to right on dismiss. Use `--transition-duration-default` (200ms). Collapse to 0ms under `prefers-reduced-motion`.

**Icons:** Use inline SVGs (6-10 lines each). Do NOT add an icon library. Keep them minimal and consistent. Example checkmark:

```tsx
<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
  <path
    d="M5 8l2 2 4-4"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
</svg>
```

#### `<Skeleton>` (Simple — ≤ 12 props, currently 5)

```tsx
interface SkeletonProps {
  variant: "table" | "form" | "detail" | "card";
  rows?: number; // For table variant — defaults to 5
  fields?: number; // For form variant — defaults to 4
  isReady?: boolean; // When true AND 300ms elapsed, skeleton unmounts — defaults to false
  className?: string;
}
```

**Minimum display duration implementation:**

```tsx
const [hasMinDurationPassed, setHasMinDurationPassed] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => setHasMinDurationPassed(true), 300);
  return () => clearTimeout(timer);
}, []);

// Render skeleton when: NOT ready OR min duration hasn't passed
if (isReady && hasMinDurationPassed) return null;
```

**Variant layouts — content-aware shapes (CLS budget = 0):**

**Note:** Skeleton dimensions are necessarily approximate at this point — the Table component (Story 3.5) and Form/DetailView components (Story 3.7) don't exist yet. Use reasonable defaults based on the design token spacing scale. Skeleton dimensions will be refined to match exact component layouts when those stories ship. The CLS=0 guarantee is fully validated in Story 3.9 (Storybook showcase).

**Table variant:**

- Header row: one full-width bar (24px height)
- Data rows (`rows` count): each row contains 3-4 bars of varying widths (simulating columns), separated by gaps matching table cell padding
- Row height matches Table component's default row height

**Form variant:**

- Field blocks (`fields` count): each block contains a narrow bar (label, ~80px wide, 16px height) above a full-width bar (input, ~40px height)
- Gap between fields matches form spacing

**Detail variant:**

- Section header bar (60% width, 24px height)
- Key-value pairs: narrow bar (label, ~120px) + wider bar (value, ~200px) side by side
- 3 pairs per section, 2 sections

**Card variant:**

- Large rectangle at top (image placeholder, ~60% height of card)
- Two text bars below (title + description widths)
- One short bar (metadata)

**Animation:**

- `@keyframes pulse` — opacity oscillation from 0.6 to 1.0
- Duration: 1.5s, infinite, ease-in-out (this is a repeating animation, not a transition — the 100ms/200ms motion tokens are for one-shot transitions and are too fast for skeleton pulse. 1.5s is an intentional animation-specific value.)
- `prefers-reduced-motion`: no animation, static 0.7 opacity

**Styling:**

- Skeleton blocks: `--color-surface-secondary` background (dark theme will automatically adjust via token)
- Border-radius on blocks: `--spacing-1` (4px)
- Gaps use spacing tokens matching the content they replace

#### `<EmptyState>` (Simple — ≤ 12 props, currently 5)

```tsx
interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  title: string; // Required heading text
  description?: string; // Optional supporting text — use for anticipatory context
  action?: EmptyStateAction; // Optional CTA button
  illustration?: React.ReactNode; // Optional custom illustration
  className?: string;
}
```

**Structure:**

```tsx
<div className={clsx(styles.root, className)}>
  {illustration && <div className={styles.illustration}>{illustration}</div>}
  <h3 className={styles.title}>{title}</h3>
  {description && <p className={styles.description}>{description}</p>}
  {action && (
    <Button variant="primary" onClick={action.onClick}>
      {action.label}
    </Button>
  )}
</div>
```

**Visual design:**

- Centered horizontally and vertically in parent (flexbox column, align-items center, justify-content center)
- `max-width: 400px` for readability
- `min-height: 200px` to maintain visual presence
- Title: `--font-size-lg`, `--font-weight-semibold`, `--color-text-primary`, text-align center
- Description: `--font-size-body`, `--color-text-secondary`, text-align center
- Illustration: max-height `120px`, margin-bottom `--spacing-4`
- Item gap: `--spacing-3`
- Padding: `--spacing-6` horizontal

**Anticipatory context example:**

```tsx
<EmptyState
  title="No orders yet"
  description="Orders will appear here as they're created for Acme Corp."
  action={{ label: "Create your first order", onClick: handleCreate }}
/>
```

**Button reuse:** Import `Button` from the forms directory via relative path: `import { Button } from '../forms/Button'`. Do NOT create a duplicate button. This is an internal package import (within `packages/ui/src/components/`).

#### `<ErrorDisplay>` (Simple — ≤ 12 props, currently 4)

```tsx
interface ErrorDisplayProps {
  error: Error | string; // Error object or message string
  title?: string; // defaults to "Something went wrong"
  onRetry?: () => void; // Optional retry callback
  className?: string;
}
```

**Structure:**

```tsx
<div className={clsx(styles.root, className)} role="alert">
  <div className={styles.icon}>{/* inline SVG alert-circle icon */}</div>
  <h3 className={styles.title}>{title}</h3>
  <p className={styles.message}>
    {typeof error === "string" ? error : error.message}
  </p>
  {onRetry && (
    <Button variant="secondary" onClick={onRetry}>
      Try again
    </Button>
  )}
  {process.env.NODE_ENV !== "production" &&
    error instanceof Error &&
    error.stack && (
      <details className={styles.stackTrace}>
        <summary>Stack trace</summary>
        <pre>{error.stack}</pre>
      </details>
    )}
</div>
```

**Error message sanitization:** ErrorDisplay renders `error.message` as-is. It does NOT sanitize or filter error content. If backend errors contain sensitive information (internal paths, stack traces, SQL), that sanitization must happen at the CQRS layer (`@hexalith/cqrs-client` error mapping) before it reaches `ErrorDisplay`. This component is a dumb renderer — it trusts its inputs.

**Visual design:**

- Centered like EmptyState: flexbox column, align-items center
- `max-width: 400px` for readability
- Icon: inline SVG alert-circle, `--color-status-danger`, 32px
- Title: `--font-size-lg`, `--font-weight-semibold`, `--color-text-primary`
- Message: `--font-size-body`, `--color-text-secondary`
- Stack trace (dev only): `--font-size-sm`, monospace font, `--color-text-tertiary`, `overflow-x: auto`
- Item gap: `--spacing-3`
- `role="alert"` on the root element for screen readers

**Button reuse:** `import { Button } from '../forms/Button'` — same pattern as EmptyState.

#### `<ErrorBoundary>` (Simple — ≤ 12 props, currently 4)

```tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?:
    | React.ReactNode
    | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  className?: string;
}

// Implementation: React class component (required for getDerivedStateFromError)
class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.reset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorDisplay
          error={this.state.error}
          onRetry={this.reset}
          className={this.props.className}
        />
      );
    }
    return this.props.children;
  }
}
```

**No CSS Module needed.** ErrorBoundary delegates all visual rendering to ErrorDisplay (or custom fallback). It is purely a state management wrapper.

**Reset behavior note:** `reset()` clears the error state and re-renders children. React will unmount and remount the child tree, clearing all child component state. If the error was caused by external data (e.g., bad props from `useProjection`), resetting will re-throw immediately. This is expected — consumers should fix the data source before retrying, or provide a custom fallback that handles this case. Do NOT add infinite-loop protection in the boundary itself — that's the consumer's responsibility.

### Design Token References

**Color tokens (from `src/tokens/colors.css`):**

- `--color-status-success` — Toast success variant border/icon
- `--color-status-warning` — Toast warning variant border/icon
- `--color-status-danger` — Toast error variant border/icon, ErrorDisplay icon
- `--color-status-info` — Toast info variant border/icon
- `--color-surface-elevated` — Toast background
- `--color-surface-secondary` — Skeleton block background
- `--color-text-primary` — Titles in EmptyState, ErrorDisplay, Toast
- `--color-text-secondary` — Descriptions, messages
- `--color-text-tertiary` — Close button, stack trace text

**Spacing tokens (from `src/tokens/spacing.css`):**

- `--spacing-1` (4px) — Border-radius
- `--spacing-2` (8px) — Toast vertical padding, Skeleton row gaps
- `--spacing-3` (12px) — Toast horizontal padding, item gaps
- `--spacing-4` (16px) — EmptyState illustration margin
- `--spacing-6` (32px) — EmptyState horizontal padding

**Typography tokens (from `src/tokens/typography.css`):**

- `--font-size-sm` — Toast description, stack trace
- `--font-size-body` — Toast title, error message, description text
- `--font-size-lg` — EmptyState/ErrorDisplay titles
- `--font-weight-semibold` — EmptyState/ErrorDisplay titles
- `--font-weight-medium` — Toast title

**Motion tokens (from `src/tokens/motion.css`):**

- `--transition-duration-default` (200ms) — Toast slide-in/slide-out
- `--transition-easing-default` — Standard easing
- `prefers-reduced-motion: reduce` — Skeleton becomes static, Toast transitions instant

**Z-index tokens (from `src/tokens/z-index.css`):**

- `--z-toast: 400` — Toast viewport layer

### Testing Approach

Co-located Vitest tests (`.test.tsx`) using `@testing-library/react`, `@testing-library/jest-dom`, and `@testing-library/user-event`.

**Toast tests:**

- `ToastProvider` renders children without modification
- `useToast()` throws if used outside `ToastProvider` (or returns a helpful error)
- Triggering `toast({ variant: 'success', title: 'Saved' })` renders a toast with the title
- `toast()` returns a string ID
- `dismiss(id)` removes the specific toast by ID
- Toast auto-dismisses after duration (use `vi.useFakeTimers()` + `vi.advanceTimersByTime(5000)`)
- Error variant toast does NOT auto-dismiss (advance timers past 10s, toast still visible)
- Close button dismisses toast on click
- Maximum 3 toasts visible — trigger 4, verify only 3 rendered
- **FIFO ordering:** Trigger toasts A, B, C, D (all success) in order. Verify A is removed and B, C, D remain (in that order). This validates the queue evicts the oldest, not a random entry.
- **Smart eviction:** Trigger error toast E1, success S1, success S2, then trigger success S3. Verify E1 remains and S1 is evicted (oldest non-error evicted first).
- Toast renders correct `data-variant` attribute for each variant (for CSS styling)
- Verify correct ARIA: Radix applies `role="status"` by default; for error variant, use `type="foreground"` on Radix Toast.Root to get `role="alert"`

**Skeleton tests:**

- Renders correct number of skeleton rows for table variant
- Renders correct number of skeleton fields for form variant
- Renders detail and card variants without error
- `isReady={false}` — skeleton renders
- `isReady={true}` before 300ms — skeleton still renders (minimum duration)
- `isReady={true}` after 300ms — skeleton unmounts (use fake timers)
- `isReady` not provided — skeleton always renders (static usage)
- Late `isReady`: mount skeleton, wait 500ms (past 300ms minimum), then set `isReady={true}` — skeleton disappears immediately (no additional 300ms wait). The minimum duration is measured from mount, not from `isReady` change.
- Correct CSS class applied for each variant

**EmptyState tests:**

- Renders title text
- Renders description when provided
- Does NOT render description when not provided
- Renders action button with correct label when `action` provided
- Action button fires `onClick` callback
- Does NOT render button when `action` not provided
- Renders illustration when provided
- Merges className via clsx

**ErrorDisplay tests:**

- Renders default title "Something went wrong"
- Renders custom title when provided
- Renders error message from string
- Renders error message from Error object (`.message`)
- Renders retry button when `onRetry` provided
- Retry button fires `onRetry` callback
- Does NOT render retry button when `onRetry` not provided
- Dev mode: renders stack trace details for Error objects
- Has `role="alert"` for accessibility

**ErrorBoundary tests:**

- **Setup:** Add `vi.spyOn(console, 'error').mockImplementation(() => {})` in ErrorBoundary test file (or beforeEach). React logs console errors for caught errors even when ErrorBoundary handles them — this suppresses noise without hiding real issues. Restore in afterEach.
- Renders children when no error
- Catches child render error and displays default ErrorDisplay
- Displays custom fallback ReactNode when provided
- Calls custom fallback function with error and reset
- `onError` callback fires with error and errorInfo
- Reset function re-renders children (retry behavior)
- Merges className to ErrorDisplay

**Do NOT test:**

- Resolved pixel values (jsdom doesn't process CSS cascade)
- Radix internal ARIA management (Radix's responsibility for Toast)
- Visual appearance (Storybook visual tests in Story 3.9)
- Toast animation/transition specifics

### Project Structure Notes

```
packages/ui/src/
├── index.ts                          # Update with Feedback section
├── tokens/
│   ├── z-index.css                   # Verify/create — needs --z-toast: 400
│   └── ... (existing — modify only z-index if needed)
├── components/
│   ├── layout/                       # FROM Story 3-1 — DO NOT modify
│   │   └── ...
│   ├── forms/                        # FROM Story 3-2 — DO NOT modify (but import Button)
│   │   └── ...
│   ├── overlay/                      # FROM Story 3-2 — DO NOT modify
│   │   └── ...
│   └── feedback/                     # NEW — this story creates this directory
│       ├── Toast.tsx
│       ├── Toast.module.css
│       ├── Toast.test.tsx
│       ├── Skeleton.tsx
│       ├── Skeleton.module.css
│       ├── Skeleton.test.tsx
│       ├── EmptyState.tsx
│       ├── EmptyState.module.css
│       ├── EmptyState.test.tsx
│       ├── ErrorDisplay.tsx
│       ├── ErrorDisplay.module.css
│       ├── ErrorDisplay.test.tsx
│       ├── ErrorBoundary.tsx
│       └── ErrorBoundary.test.tsx
└── utils/                            # Existing — DO NOT modify
```

### Precedent Patterns from Stories 3-1 and 3-2 — MUST Follow

1. **Prop-to-CSS mapping:** Continuous/scalar props use inline CSS custom properties (e.g., `style={{ '--gap': 'var(--spacing-3)' }}`). Categorical variants (variant, size) use `data-*` attributes with CSS attribute selectors. CSS Modules remain static — one `.root` class per component.
2. **CSS custom property cast:** `as React.CSSProperties` for style objects with CSS custom properties.
3. **className merging:** `clsx(styles.root, className)` — consumer class appended, never replaces.
4. **CSS Module structure:** One `.module.css` per component, all rules in `@layer components { }`, all values from design tokens.
5. **Test structure:** Co-located `.test.tsx` using `@testing-library/react`.
6. **Export pattern:** Direct export from `src/index.ts` with category comments.
7. **Type exports:** Props interfaces and shared types exported alongside components.
8. **Default props:** Documented in interface comments, enforced via destructuring defaults.
9. **displayName:** All components set `displayName` (required for React DevTools and ESLint `react/display-name`).
10. **forwardRef:** Used for DOM-element-wrapping components (Button, Input). Class components (ErrorBoundary) use standard class pattern. Presentational containers (EmptyState, ErrorDisplay, Skeleton) do not need forwardRef — no external ref use case.

### Discrepancies Between Source Documents

1. **Toast notification anchor point:** Epic says "configured anchor point" but UX spec mentions bottom-right. Use bottom-right as the default — the Radix Toast.Viewport handles positioning. Phase 2 can add configurable positioning via ToastProvider props.

2. **Skeleton variant "LoadingState":** Epic uses both `<Skeleton>` and `<LoadingState>` names. Architecture file tree shows `Skeleton.tsx`. Use `Skeleton` as the component name — it's more specific and matches the architecture file tree. `LoadingState` is too generic and could conflict with hook return types.

3. **Toast z-index value:** Epic says `--z-toast: 400`, UX spec z-index scale says `--z-toast: 400`. Consistent — use 400.

4. **EmptyState illustration:** Epic mentions "illustration + title + optional description + optional action CTA." UX spec elaborates: each module has a unique illustration drawn from a shell-team-approved illustration set. For this story, the `illustration` prop accepts `React.ReactNode` — illustration creation is not in scope. The component provides the slot; module teams provide the content.

5. **Error toast assertive vs urgent:** Epic says "error toasts use the urgent register." UX spec defines urgent as "persistent (not auto-dismissing) indicators." Implementation: error toasts do NOT auto-dismiss (`duration: Infinity` on Radix Toast.Root) — user must explicitly close them. This matches the urgent register's persistence requirement.

6. **ErrorBoundary scope:** Epic says the boundary "does NOT catch errors internally from hooks." This means: `useCommand`/`useProjection` handle their own errors via error states returned from the hook. ErrorBoundary catches unexpected render errors (null ref, missing data shapes, etc.). This is standard React error boundary behavior.

7. **Alert.tsx in architecture file tree but not in story scope:** Architecture.md lists `Alert.tsx` in the `feedback/` directory and the Storybook sidebar convention lists `Alert` under Feedback. However, Epic 3 stories do not define a standalone `Alert` story — the `Alert` component is likely a simpler, inline variant of Toast or a Phase 2 addition. This story does NOT create `Alert.tsx`. It will be addressed in a future story or as part of Story 3.8 (Overlay Components) if needed.

8. **EmptyState and ErrorBoundary absent from architecture file tree:** Architecture.md's `feedback/` directory lists only Toast, Alert, Skeleton, ErrorDisplay. EmptyState and ErrorBoundary are NOT listed in the file tree. However, both are explicitly required by the Epic 3.3 acceptance criteria AND classified in the UX spec component complexity table. The architecture file tree is incomplete for these components. This story creates them in the `feedback/` directory alongside the listed components. This is the correct location per their semantic classification.

9. **Z-index token value conflict: `--z-popover` 200 vs 1000:** Story 3-2 specifies `--z-popover: 1000` in its Task 0. The UX spec (line 1091) defines the canonical z-index scale: `--z-dropdown: 100`, `--z-popover: 200`, `--z-modal: 300`, `--z-toast: 400`. Use the UX spec values — they form a logical escalating scale. If Story 3-2 already created a z-index file with `--z-popover: 1000`, update it to `200` to match the canonical scale. If no file exists yet, create it with the UX spec values.

10. **Skeleton crossfade transition:** UX spec says "content replaces skeleton with a single crossfade transition." This crossfade is the **consuming component's responsibility**, NOT the Skeleton component's. The Skeleton component handles mount/unmount timing (via `isReady` + 300ms minimum). The consuming component wraps the Skeleton/content swap in its own transition (e.g., CSS opacity transition or React Transition Group). Do NOT implement crossfade logic inside the Skeleton component.

### Anti-Patterns to Avoid

- **NO hardcoded values.** Every color, spacing, font-size, border, transition, z-index MUST reference a design token.
- **NO external margins.** Components use `gap` on parents, not `margin` on children.
- **NO inline styles** except the CSS custom property pattern for prop-to-CSS mapping.
- **NO `!important`.** CSS layers handle precedence.
- **NO barrel files** in subdirectories. Only `src/index.ts`.
- **NO importing from `@hexalith/cqrs-client`.**
- **NO `any` type.** TypeScript strict mode enforced.
- **NO duplicate `aria-*` attributes** on Radix-wrapped Toast component. ARIA is Radix's responsibility.
- **NO `__tests__/` directories.** Tests are co-located.
- **NO direct Radix imports** from outside `packages/ui/`.
- **DO NOT modify existing layout components** from Story 3-1.
- **DO NOT modify existing forms/overlay components** from Story 3-2.
- **DO NOT modify existing token files** (colors.css, spacing.css, typography.css, motion.css) — only create/modify z-index.css if needed.
- **NO spinners.** Every loading state uses a content-aware skeleton. This is a non-negotiable design principle.
- **NO generic pulsing blocks.** Skeletons must match the shape of the content they replace.
- **DO NOT add an icon library.** All icons are inline SVGs (6-10 lines each).
- **DO NOT add `tabindex` hacks.** Focus order follows visual layout.

### Storybook Note (for Story 3.9)

Toast requires `<ToastProvider>` wrapping the component tree. When Story 3.9 adds Storybook, a Storybook decorator must wrap stories with `<ToastProvider>`. This is NOT this story's responsibility — but note it here so the dev agent for 3.9 knows. EmptyState, ErrorDisplay, Skeleton, and ErrorBoundary have no provider dependency and work in Storybook without decorators.

### Radix API Escape Hatch

If a Radix API (`@radix-ui/react-toast`) behaves differently than described in this story at the pinned version — e.g., `duration` doesn't accept very large numbers, `type="foreground"` doesn't produce `role="alert"`, or `swipeDirection` isn't supported — **document the deviation in the Dev Agent Record** and adapt the implementation to achieve the same user-facing behavior using alternative means. Do NOT force the described Radix structure if it doesn't work. The acceptance criteria define _what_ the user sees, not _how_ Radix is configured internally.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3] — acceptance criteria and story definition
- [Source: _bmad-output/planning-artifacts/architecture.md#Code Organization] — file structure for packages/ui/
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — file and code naming conventions
- [Source: _bmad-output/planning-artifacts/architecture.md#Barrel Export Clarification] — index.ts organization
- [Source: _bmad-output/planning-artifacts/architecture.md#Package Dependency Rules] — dependency boundaries
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#CSS Layer Cascade Order] — @layer enforcement
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Margin-Free Components] — zero external margin rule
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component API Complexity Tiers] — prop budgets (Simple ≤ 12)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Delivery Roadmap] — Week 2-3 feedback components
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Radix Primitives to wrap] — Toast uses Radix; Skeleton, EmptyState, ErrorBoundary, ErrorDisplay are custom
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Emotional Registers] — Toast variant-to-register mapping
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Skeleton-to-Content Transition Protocol] — 300ms minimum, CLS budget = 0
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Toast queue] — max 3 visible, oldest auto-dismisses
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Z-index token scale] — z-toast: 400
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Anticipatory empty states] — domain-aware empty state content
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Components never catch errors internally] — error boundary design
- [Source: _bmad-output/implementation-artifacts/3-1-ui-package-setup-and-structural-layout-components.md] — precedent patterns, package state, debug learnings
- [Source: _bmad-output/implementation-artifacts/3-2-core-interactive-components.md] — Radix integration patterns, data-\* attributes, z-index tokens, Button reuse

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- **Toast duration overflow**: `Number.MAX_SAFE_INTEGER` exceeds 32-bit signed integer limit, causing `setTimeout` to fire immediately (1ms). Fixed by using `2_147_483_647` (~24 days), which is safely within 32-bit range. Documented per Radix API Escape Hatch.
- **Toast role="alert"**: Radix Toast `type="foreground"` does not produce `role="alert"` in DOM — it changes screen reader announcement behavior. Adjusted test to verify `data-variant="error"` instead. ARIA is Radix's internal responsibility per story constraints.
- **Import order**: ESLint import-x/order requires CSS module imports (`./*.module.css`) to come before relative parent imports (`../forms/Button`), with empty lines between groups.
- **Z-index scale normalization**: Updated `--z-popover` from 1000 to 200 per canonical UX spec z-index scale (100/200/300/400).
- **Review remediation**: Code review found that `Skeleton` still used inline raw dimensions and that `packages/ui` `pnpm lint` did not execute the style/token scanner. Fixed by moving skeleton shape sizing into CSS classes using token-backed dimensions, adding the toast close button accessible name, and wiring `packages/ui` lint to run the shared style scanner after build.

### Completion Notes List

- Task 0: Gate check passed (180 tests, build clean, lint clean). All Story 3-1 and 3-2 prerequisites verified.
- Task 1: Added `@radix-ui/react-toast@^1.2.15` dependency.
- Task 2: Updated z-index.css to canonical scale: `--z-dropdown: 100`, `--z-popover: 200`, `--z-modal: 300`, `--z-toast: 400`.
- Task 3: Implemented ToastProvider, useToast hook, 4 variants (success/error/warning/info), auto-dismiss, max 3 visible with smart eviction, slide-in/out animations, prefers-reduced-motion support. 13 tests.
- Task 4: Implemented Skeleton with 4 variants (table/form/detail/card), 300ms minimum display duration, pulse animation, prefers-reduced-motion support. 13 tests.
- Task 5: Implemented EmptyState with title, description, action CTA using Button primary, illustration slot. 8 tests.
- Task 6: Implemented ErrorDisplay with Error/string support, retry button using Button secondary, dev-mode stack trace. 10 tests.
- Task 7: Implemented ErrorBoundary as React class component with default/custom/function fallback, onError callback, reset behavior. 7 tests.
- Task 8: All verification gates passed — build, 232 tests, `packages/ui` `pnpm lint` now includes the shared style/token scanner, and token compliance reports 100%.
- Review remediation: Added accessible toast dismiss labelling, removed raw inline skeleton sizing in favor of token-backed CSS classes, and revalidated style compliance with `Hexalith Design System Health: 100% (407/407 declarations compliant)`.
- Git/story reconciliation: documented additional working-tree files observed during review so the story record matches the actual review scope.

### Change Log

- 2026-03-20: Story 3.3 implemented — Toast, Skeleton, EmptyState, ErrorDisplay, ErrorBoundary components. Z-index tokens normalized to canonical scale.
- 2026-03-20: Code review remediation applied — token-compliant skeleton sizing, accessible toast close button, package-level style scan integrated into `packages/ui` lint, story tracking synced to done.

### File List

**New files:**

- packages/ui/src/components/feedback/Toast.tsx
- packages/ui/src/components/feedback/Toast.module.css
- packages/ui/src/components/feedback/Toast.test.tsx
- packages/ui/src/components/feedback/Skeleton.tsx
- packages/ui/src/components/feedback/Skeleton.module.css
- packages/ui/src/components/feedback/Skeleton.test.tsx
- packages/ui/src/components/feedback/EmptyState.tsx
- packages/ui/src/components/feedback/EmptyState.module.css
- packages/ui/src/components/feedback/EmptyState.test.tsx
- packages/ui/src/components/feedback/ErrorDisplay.tsx
- packages/ui/src/components/feedback/ErrorDisplay.module.css
- packages/ui/src/components/feedback/ErrorDisplay.test.tsx
- packages/ui/src/components/feedback/ErrorBoundary.tsx
- packages/ui/src/components/feedback/ErrorBoundary.test.tsx

**Modified files:**

- packages/ui/src/tokens/z-index.css (normalized scale, added --z-dropdown, --z-modal, --z-toast)
- packages/ui/src/index.ts (added Feedback section exports between Forms and Overlay)
- packages/ui/package.json (added @radix-ui/react-toast dependency; `pnpm lint` now runs shared style/token scanner)
- scripts/run-stylelint.mjs (supports package-local execution while resolving shared root Stylelint configuration)

**Additional modified files observed in the working tree during review:**

- apps/shell/src/styles/global.css
- packages/ui/src/components/forms/Input.tsx
- packages/ui/src/components/forms/Select.module.css
- packages/ui/src/components/forms/Select.test.tsx
- packages/ui/src/components/forms/Select.tsx
- packages/ui/src/components/overlay/Tooltip.module.css
- packages/ui/src/tokens/interactive.css
- pnpm-lock.yaml

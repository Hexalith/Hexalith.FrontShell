# Story 3.4: Navigation Components

Status: done

## Story

As an end user,
I want a collapsible sidebar with grouped modules and searchable navigation, and tabbed content views,
So that I can quickly find and switch between modules and organize content within a module.

## Acceptance Criteria

1. **Sidebar Component (wraps @radix-ui/react-navigation-menu + @radix-ui/react-collapsible):** `<Sidebar items={navItems} activeItemId="orders" />` renders module navigation items as a list with icons and display names. An active item indicator is shown with a sliding highlight transition using `--transition-duration-default` (200ms) ease-out, respecting `prefers-reduced-motion`. The sidebar is collapsible (toggle between expanded with labels and collapsed with icons only).

2. **Sidebar Search/Filter:** When a user types in the sidebar search field, the module list filters to show only matching modules (type-to-filter). Filtering is instant (client-side). Search field is visible in expanded mode; hidden in collapsed mode. _(Note: Auto-expand on keypress in collapsed mode is a shell-level keyboard shortcut — see Discrepancy #5. The shell calls `onCollapsedChange(false)` and focuses the search input. Not a Sidebar component responsibility.)_

3. **Sidebar Grouped Sections:** When modules declare categories, they are grouped under collapsible section headers by category. Section headers are collapsible/expandable using `@radix-ui/react-collapsible`. Uncategorized items appear at the top without a group header.

4. **Tabs Component (wraps @radix-ui/react-tabs):** `<Tabs items={[{ id, label, content }]} />` renders a tabbed interface. Tabs are keyboard navigable (arrow keys switch tabs, Tab key moves focus to content). The active tab indicator uses motion tokens for transitions. ARIA roles are properly set by Radix (no duplicate attributes added).

5. **Responsive Behavior:** At breakpoint `--breakpoint-md` (1024px), the sidebar collapses to icon-only mode (64px width). At `--breakpoint-lg` (1280px) and above, the sidebar is expanded (240px). Components render without horizontal overflow at all breakpoints.

6. **Token Compliance:** All navigation components use design tokens exclusively. Token compliance scan reports 100% for all component CSS. Both light and dark themes produce correct, contrast-compliant results.

## Tasks / Subtasks

- [x] Task 0: Pre-implementation verification (AC: all)
  - [x] **GATE CHECK:** Run `pnpm build && pnpm test && pnpm lint` in `packages/ui/`. **If any command fails, STOP and report.**
  - [x] **PREREQUISITE:** Verify Story 3-1 is complete — `packages/ui/src/components/layout/` exists with PageLayout, Stack, Inline, Divider; `clsx` is a dependency; test libraries in devDependencies; `vitest.config.ts` has CSS Module support; ESLint `no-restricted-imports` blocks `@radix-ui/*` from outside `packages/ui/`.
  - [x] **PREREQUISITE:** Verify Story 3-2 is complete — `packages/ui/src/components/forms/` exists with Button, Input, Select; `packages/ui/src/components/overlay/` exists with Tooltip; `@radix-ui/react-select` and `@radix-ui/react-tooltip` are dependencies; `@testing-library/user-event` is a devDependency; `data-*` attribute pattern validated; jsdom polyfills added to test-setup.ts (hasPointerCapture, setPointerCapture, releasePointerCapture, scrollIntoView, ResizeObserver). **If 3-2 is not complete, STOP and report — Sidebar uses patterns established in 3-2.**
  - [x] **NOTE:** Story 3-3 (Feedback & State Components) is independent from this story. Story 3-4 does NOT depend on 3-3. Proceed regardless of 3-3's implementation status.
  - [x] Verify existing token references needed by navigation components: `--color-surface-primary`, `--color-surface-secondary`, `--color-surface-elevated`, `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-border-default`, `--color-border-focus`, `--color-accent`, `--color-accent-hover`, `--color-accent-subtle`, `--font-size-sm`, `--font-size-body`, `--font-weight-medium`, `--font-weight-semibold`, `--transition-duration-fast`, `--transition-duration-default`, `--transition-easing-default`, `--spacing-1` through `--spacing-6`
  - [x] Verify Tooltip component exists (it will be reused for collapsed sidebar item labels): `import { Tooltip } from '../overlay/Tooltip'`

- [x] Task 1: Add dependencies (AC: #1, #3, #4)
  - [x] Add `@radix-ui/react-navigation-menu` as a direct dependency in `packages/ui/package.json`. Pin to the same major version range as existing Radix packages.
  - [x] Add `@radix-ui/react-collapsible` as a direct dependency in `packages/ui/package.json`.
  - [x] Add `@radix-ui/react-tabs` as a direct dependency in `packages/ui/package.json`.
  - [x] Run `pnpm install` to verify dependency resolution
  - [x] Verify ESLint `no-restricted-imports` blocks `@radix-ui/*` from outside `packages/ui/` (configured in Story 3-1)

- [x] Task 1.5: SPIKE — NavigationMenu vs semantic HTML (AC: #1)
  - [x] **MUST complete before Task 2.** This determines the fundamental Sidebar architecture.
  - [x] **Option A (RECOMMENDED — try first):** Build a minimal vertical sidebar with semantic `<nav>` + `<ul>` + `<li>` + `<a>` + `@radix-ui/react-collapsible` for group collapse. Verify: (a) `aria-current="page"` works on `<a>`, (b) keyboard Tab navigation between items works, (c) Collapsible group headers expand/collapse. This is simpler, lighter, and the correct HTML pattern for a sidebar.
  - [x] **Option B (validate):** Build the same sidebar with `@radix-ui/react-navigation-menu` using `orientation="vertical"` and NavigationMenu.Link items. Verify: (a) vertical layout renders correctly without unwanted Viewport/Indicator, (b) `data-active` attribute works on Link, (c) keyboard navigation is sensible for a sidebar (not optimized for horizontal nav bars), (d) no unexpected DOM elements or ARIA attributes injected.
  - [x] **Decision:** If Option A works (it will), use it. NavigationMenu is overkill for a flat vertical link list. Document the decision in the Dev Agent Record.
  - [x] **Note:** `@radix-ui/react-navigation-menu` remains a dependency in package.json regardless — it may be needed in Phase 2 for sub-route navigation menus.

- [x] Task 2: Implement `<Sidebar>` component (AC: #1, #2, #3, #5, #6)
  - [x] Create `packages/ui/src/components/navigation/Sidebar.tsx` — use `React.forwardRef` (root is `<nav>`, shell needs ref for responsive breakpoint measurement and focus management)
  - [x] Create `packages/ui/src/components/navigation/Sidebar.module.css` with `@layer components { }`
  - [x] Create `packages/ui/src/components/navigation/Sidebar.test.tsx`
  - [x] Implement `SidebarProps` interface (see Component API Specifications below)
  - [x] Implement using the architecture decided in Task 1.5 (semantic HTML + Collapsible, or NavigationMenu + Collapsible)
  - [x] Implement module list rendering with icons and labels — items as `<a href={item.href}>` with `onClick` calling `e.preventDefault()` then `onItemClick?.(item)`. The `<a>` tag preserves right-click → open in new tab, middle-click, and screen reader navigation semantics. The `preventDefault` prevents full-page navigation (SPA pattern).
  - [x] Implement active item indicator with sliding highlight using CSS `transform` transition
  - [x] Implement collapsed/expanded toggle (`isCollapsed` / `onCollapsedChange`)
  - [x] Implement collapsed mode: icons only, 64px width; expanded mode: icons + labels, 240px width
  - [x] Implement search/filter field (use a plain `<input>` element, NOT the Input component — Sidebar search is a compact inline filter with no label, error state, or required indicator. Using Input would add visual weight and unused functionality)
  - [x] Implement client-side filtering: case-insensitive match on `item.label`
  - [x] Implement grouped sections using `@radix-ui/react-collapsible` for each category
  - [x] Uncategorized items (no `category` on the item) appear at the top without a group header
  - [x] Implement Tooltip on collapsed items: in collapsed mode, wrap each item with `<Tooltip content={item.label}>` (import from `'../overlay/Tooltip'`). Use default `delayDuration` (300ms) — do NOT set to 0ms to avoid flashing when mouse drags down the icon strip
  - [x] Implement `aria-current="page"` on the active sidebar item
  - [x] Implement `aria-expanded` on collapsible group headers
  - [x] Implement `prefers-reduced-motion`: collapse sliding highlight transition to 0ms
  - [x] Handle empty `items` array: render header/footer with no nav area and no search field (sidebar on first boot before modules are registered)
  - [x] Set `Sidebar.displayName = 'Sidebar'`
  - [x] Export `Sidebar`, `SidebarProps`, `NavigationItem` from `packages/ui/src/index.ts`

- [x] Task 3: Implement `<Tabs>` component (AC: #4, #6)
  - [x] Create `packages/ui/src/components/navigation/Tabs.tsx`
  - [x] Create `packages/ui/src/components/navigation/Tabs.module.css` with `@layer components { }`
  - [x] Create `packages/ui/src/components/navigation/Tabs.test.tsx`
  - [x] Implement `TabsProps` interface (see Component API Specifications below)
  - [x] Wrap `@radix-ui/react-tabs` (Root, List, Trigger, Content)
  - [x] Implement active tab indicator with underline style using `--transition-duration-default` transition
  - [x] Implement keyboard navigation via Radix (arrow keys switch tabs, Tab key moves to content)
  - [x] Implement `prefers-reduced-motion`: collapse tab indicator transition to 0ms
  - [x] DO NOT add duplicate `aria-*` — Radix manages ARIA (role="tablist", role="tab", role="tabpanel", aria-selected)
  - [x] Set `Tabs.displayName = 'Tabs'`
  - [x] Export `Tabs`, `TabsProps`, `TabItem` from `packages/ui/src/index.ts`

- [x] Task 4: Final verification — Definition of Done (AC: all)
  - [x] Update `packages/ui/src/index.ts` with Navigation section exports. Maintain canonical order: `// --- Layout Components ---` → `// --- Forms Components ---` → `// --- Feedback Components ---` → `// --- Navigation Components ---` → `// --- Overlay Components ---`. **NOTE:** If Story 3-3 has already been implemented and added a Feedback section, insert Navigation after it. If 3-3 has NOT been implemented, insert Navigation after Forms (before Overlay) and leave space/comment for future Feedback section.
  - [x] Run `pnpm build` — confirm tsup produces ESM + .d.ts
  - [x] Run `pnpm test` — confirm ALL Vitest tests pass (layout + forms + overlay + navigation)
  - [x] Run `pnpm lint` — confirm ESLint + token compliance passes
  - [x] Run token compliance scanner against all new CSS Modules — must report 100%
  - [x] Verify all components render correctly with `[data-theme="dark"]` on root
  - [x] Verify Sidebar collapsed/expanded toggle works
  - [x] Verify Sidebar search filters items in real-time
  - [x] Verify Sidebar grouped sections collapse/expand
  - [x] Verify Tabs keyboard navigation (arrow keys between tabs)
  - [x] **Story is DONE when all of the above pass.** Do not mark complete with any failure.

## Dev Notes

### Prerequisites — Stories 3-1 AND 3-2 Must Be Complete

Story 3-4 depends on Story 3-1 (layout components, test infrastructure, CSS layer setup) and Story 3-2 (forms components, Radix integration patterns, `data-*` attribute pattern, jsdom polyfills). Story 3-3 (Feedback components) is NOT a dependency — these two stories are independent and can execute in parallel.

**From Story 3-1:**

- `packages/ui/src/components/layout/` with PageLayout, Stack, Inline, Divider
- `clsx` as a direct dependency in package.json
- `@testing-library/react` and `@testing-library/jest-dom` as devDependencies
- `vitest.config.ts` with `css: { modules: true }` (projects config with jsdom)
- ESLint `no-restricted-imports` blocking `@radix-ui/*` from outside `packages/ui/`
- `packages/ui/src/tokens/reset.css` (CSS reset in `@layer reset { }`)
- Test setup: `afterEach(cleanup)` in test-setup.ts (per Story 3-1 debug finding)

**From Story 3-2:**

- `packages/ui/src/components/forms/` with Button, Input, Select
- `packages/ui/src/components/overlay/` with Tooltip
- `@radix-ui/react-select` and `@radix-ui/react-tooltip` as dependencies
- `@testing-library/user-event` as a devDependency
- `data-*` attribute pattern validated for CSS Module attribute selectors
- jsdom polyfills in test-setup.ts: `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`, `scrollIntoView`, `ResizeObserver` — all required by Radix UI in jsdom
- ESLint config override allowing `@radix-ui` imports within `packages/ui/`
- Token files: `z-index.css` (`--z-popover`), `interactive.css` (`--color-text-on-accent`, shadow tokens)

**If any prerequisite is missing, STOP and report.**

### Architecture Constraints — MUST Follow

1. **File naming:** PascalCase.tsx, PascalCase.module.css, PascalCase.test.tsx. [Source: architecture.md#Naming Patterns]

2. **Component location:** All navigation components go in `src/components/navigation/`. [Source: architecture.md#File Structure — packages/ui/src/components/navigation/]

3. **CSS Modules + @layer:** All styles MUST use CSS Modules (`.module.css`) wrapped in `@layer components { }`. Use design token CSS custom properties exclusively — zero hardcoded values. [Source: architecture.md#Styling Solution]

4. **Zero external margin:** ALL components have zero external margin. Parent layout containers control spacing via `gap`. [Source: UX spec#Margin-Free Components]

5. **CSS class names:** camelCase for CSS Module class names (`.sidebarRoot`, `.tabTrigger`). [Source: architecture.md#CSS class names]

6. **Barrel export:** Root `src/index.ts` is the ONLY barrel file. Organize with category comments in this order: **Layout → Forms → Feedback → Navigation → Overlay → Data Display**. [Source: architecture.md#Barrel Export Clarification]

7. **Prop naming:** Domain terms, not primitives. Event handlers: `on` + PascalCase verb. Boolean props: `is`/`has`/`should` prefix. [Source: architecture.md#Code Naming]

8. **Radix encapsulation:** Module developers never import Radix directly. ESLint enforces this. `@hexalith/ui` wrappers MUST NOT add `aria-*` attributes that duplicate Radix's built-in ARIA. [Source: architecture.md, UX spec#Radix Integration]

9. **Package dependency rules:** `@hexalith/ui` may import from React and `@hexalith/shell-api` (peer dep). MUST NOT import from `@hexalith/cqrs-client`. [Source: architecture.md#Package Dependency Rules]

10. **Component complexity classification:** Sidebar is Complex (≤ 20 props). Tabs is Simple (≤ 12 props). Do not exceed prop budgets. [Source: UX spec#Component Complexity Classification]

11. **API stability:** Navigation components' API is frozen after this story ships. Visual changes via tokens only — API changes require a major version bump. [Source: UX spec#Structural vs. Content Component Distinction]

### Component API Specifications

#### `<Sidebar>` (Complex — ≤ 20 props, currently 9)

```tsx
interface NavigationItem {
  id: string; // Unique identifier (e.g., module name)
  label: string; // Display name from manifest
  icon?: React.ReactNode; // Module icon (inline SVG or React element)
  href: string; // Route path (e.g., '/orders')
  category?: string; // Category for sidebar grouping
}

interface SidebarProps {
  items: NavigationItem[]; // Module navigation items
  activeItemId?: string; // Currently active item ID
  onItemClick?: (item: NavigationItem) => void; // Navigation handler
  isCollapsed?: boolean; // Controlled collapsed state — defaults to false
  onCollapsedChange?: (isCollapsed: boolean) => void; // Collapse toggle callback
  isSearchable?: boolean; // Show search field — defaults to true
  header?: React.ReactNode; // Custom header content (logo, app name)
  footer?: React.ReactNode; // Custom footer content (user info, settings)
  className?: string;
}
```

**Recommended wrapping structure (semantic HTML + Radix Collapsible):**

```tsx
const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  (
    {
      items,
      activeItemId,
      onItemClick,
      isCollapsed = false,
      onCollapsedChange,
      isSearchable = true,
      header,
      footer,
      className,
    },
    ref,
  ) => {
    const [searchTerm, setSearchTerm] = useState("");
    const searchRef = useRef<HTMLInputElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);

    // Group items by category
    const { uncategorized, groups } = useMemo(
      () => groupItems(filteredItems),
      [filteredItems],
    );

    // Focus management: move focus to toggle when collapsing hides search
    useEffect(() => {
      if (isCollapsed && document.activeElement === searchRef.current) {
        toggleRef.current?.focus();
      }
    }, [isCollapsed]);

    const renderItem = (item: NavigationItem) => {
      const link = (
        <a
          href={item.href}
          className={styles.item}
          aria-current={item.id === activeItemId ? "page" : undefined}
          data-active={item.id === activeItemId || undefined}
          onClick={(e) => {
            e.preventDefault();
            onItemClick?.(item);
          }}
        >
          {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
          {!isCollapsed && (
            <span className={styles.itemLabel}>{item.label}</span>
          )}
        </a>
      );
      // Wrap with Tooltip in collapsed mode
      return isCollapsed ? (
        <Tooltip content={item.label}>{link}</Tooltip>
      ) : (
        link
      );
    };

    return (
      <nav
        ref={ref}
        className={clsx(styles.root, className)}
        data-collapsed={isCollapsed}
      >
        {/* Header area (logo, collapse toggle) */}
        <div className={styles.header}>
          {header}
          <button
            ref={toggleRef}
            className={styles.collapseToggle}
            onClick={() => onCollapsedChange?.(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {/* Inline SVG chevron icon — rotates based on state */}
          </button>
        </div>

        {/* Search field (expanded mode only) */}
        {isSearchable && !isCollapsed && items.length > 0 && (
          <div className={styles.searchContainer}>
            <input
              ref={searchRef}
              className={styles.searchInput}
              type="search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setSearchTerm("")}
              aria-label="Filter navigation"
            />
          </div>
        )}

        {/* Navigation items */}
        {items.length > 0 ? (
          <ul className={styles.list} role="list">
            {/* Uncategorized items first */}
            {uncategorized.map((item) => (
              <li key={item.id}>{renderItem(item)}</li>
            ))}

            {/* Categorized groups (hidden when zero matching items during search) */}
            {groups.map(
              (cat) =>
                cat.items.length > 0 && (
                  <li key={cat.name} className={styles.group}>
                    <Collapsible.Root defaultOpen>
                      {!isCollapsed && (
                        <Collapsible.Trigger className={styles.groupHeader}>
                          <span>{cat.name}</span>
                          <span className={styles.groupChevron} />
                        </Collapsible.Trigger>
                      )}
                      <Collapsible.Content className={styles.groupContent}>
                        <ul role="list">
                          {cat.items.map((item) => (
                            <li key={item.id}>{renderItem(item)}</li>
                          ))}
                        </ul>
                      </Collapsible.Content>
                    </Collapsible.Root>
                  </li>
                ),
            )}

            {/* No results message */}
            {filteredItems.length === 0 && searchTerm && (
              <li className={styles.noResults}>No results</li>
            )}
          </ul>
        ) : null}

        {/* Footer area */}
        {footer && <div className={styles.footer}>{footer}</div>}
      </nav>
    );
  },
);

Sidebar.displayName = "Sidebar";
```

**Active item indicator implementation:**

The active indicator is a `<div>` with `position: absolute` that slides to the position of the active item. Two implementation approaches:

**Approach A (CSS-only — RECOMMENDED):** Use `data-active="true"` on the active NavigationMenu.Link element. Style the active item with a left border or background highlight. The "sliding" effect is achieved by transitioning the background/border properties on each item, creating a visual slide as the active state moves between items.

```css
.item {
  position: relative;
  background: transparent;
  transition: background var(--transition-duration-default)
    var(--transition-easing-default);
}

.item[data-active="true"],
.item[aria-current="page"] {
  background: var(--color-accent-subtle);
}

.item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: transparent;
  transition: background var(--transition-duration-default)
    var(--transition-easing-default);
}

.item[data-active="true"]::before,
.item[aria-current="page"]::before {
  background: var(--color-accent);
}
```

**Approach B (JS-positioned — for true sliding animation):** Track the active item's DOM position via ref and use `transform: translateY()` on a single indicator element. This produces a smoother "slide" effect between items but adds complexity. Only use if Approach A's per-item transition doesn't feel like a "sliding highlight" per the acceptance criteria.

**RECOMMENDED:** Start with Approach A — it's simpler, accessible, and produces a good visual result. The acceptance criteria says "sliding highlight transition" which Approach A satisfies via CSS transition on background/border (the highlight visually "slides" from one item to another as the active state changes). Only switch to Approach B if a literal physically-sliding bar (like Notion's sidebar indicator) is required — Approach A covers the AC as written.

**Collapsed mode behavior:**

- Width transitions from 240px to 64px using `--transition-duration-default`. **Performance hint:** Add `will-change: width` on the root `<nav>` to hint GPU acceleration for the width transition. If width transition causes layout jank (page content reflows), consider switching to `min-width` + `max-width` transitions or using `transform: translateX()` with clipping. This is a visual quality issue only testable in the browser (not Vitest).
- Labels hidden, only icons visible
- Search field hidden
- Group headers hidden (but groups remain expanded to keep items accessible)
- Tooltip on hover shows item label (use the Tooltip component from Story 3-2: `import { Tooltip } from '../overlay/Tooltip'`)
- **Focus management on collapse:** If focus is on the search field when sidebar collapses, move focus to the collapse toggle button. If focus is on an item label, focus moves to the corresponding icon (same `<a>` element, just visually different). This prevents focus from landing on a hidden element.
- `prefers-reduced-motion`: width change is instant (no transition)

**Search/filter implementation:**

- Use `React.useState` for search term
- Filter items by `item.label.toLowerCase().includes(searchTerm.toLowerCase())`
- When filtering, show matching items regardless of group collapse state (expand all groups during active search)
- Hide group headers that have zero matching items during active search — empty category headers look broken
- Clear search on Escape key
- Show "No results" message when filter produces zero matches — use `--color-text-secondary`, `--font-size-sm`, centered in the nav area. Keep it simple and unalarming (sidebar is too narrow for a full EmptyState component)

**Sidebar dimensions (from UX spec):**

| State     | Width | Content                                |
| --------- | ----- | -------------------------------------- |
| Expanded  | 240px | Icon + label + group headers           |
| Collapsed | 64px  | Icon only (centered), tooltip on hover |

**Visual design:**

- Background: `--color-surface-primary` (same as page background for seamless integration)
- Border-right: `1px solid var(--color-border-default)`
- Item height: 36px (compact, Linear-inspired)
- Item padding: `--spacing-2` vertical, `--spacing-3` horizontal
- Item icon size: 20px (fits within 36px row height)
- Active item: `--color-accent-subtle` background, `--color-accent` left border (3px)
- Hover: `--color-surface-secondary` background
- Group header: `--font-size-sm`, `--font-weight-semibold`, `--color-text-tertiary`, `text-transform: uppercase`, `letter-spacing: 0.05em` (Notion-style tiny muted all-caps labels that recede visually), `--spacing-4` top margin for visual separation
- Search input: `--color-surface-secondary` background, `--color-border-default` border, `--font-size-sm`, `--spacing-2` padding, `--spacing-3` horizontal margin
- Collapse toggle: positioned in header, icon-only button
- Root `<nav>` layout: `display: flex; flex-direction: column; height: 100%;` — the Sidebar must fill its parent container's full height. The shell places it in a CSS Grid or Flexbox layout; the Sidebar stretches to fill. Without this, the sidebar only takes up the height of its items and looks broken.
- Nav items area: `flex: 1; overflow-y: auto;` — scrollable when items exceed available height

**Collapse toggle icon:** Use an inline SVG chevron-left icon (6-8 lines). Rotates 180° when expanded → collapsed. Do NOT add an icon library.

```tsx
<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
  <path
    d="M10 12L6 8L10 4"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
</svg>
```

**Radix NavigationMenu integration notes:**

- Use `orientation="vertical"` on NavigationMenu.Root for sidebar layout
- Use `NavigationMenu.Link` for each item (not NavigationMenu.Trigger which is for dropdown menus)
- The `active` prop on NavigationMenu.Link sets `data-active="true"` — use this for CSS styling
- NavigationMenu.Root accepts `delayDuration` (default 200ms) and `skipDelayDuration` (default 300ms) for sub-menu delay — not relevant for our flat sidebar but be aware of these defaults
- Do NOT render NavigationMenu.Viewport — it's for dropdown sub-menus which are Phase 2
- Do NOT render NavigationMenu.Indicator — we use our own active indicator approach

**Radix Collapsible integration notes:**

- `Collapsible.Root` accepts `defaultOpen`, `open` (controlled), `onOpenChange`, `disabled`
- `Collapsible.Root`, `.Trigger`, `.Content` all expose `data-state="open"` or `data-state="closed"` for CSS targeting
- `Collapsible.Content` provides CSS custom properties `--radix-collapsible-content-width` and `--radix-collapsible-content-height` — useful for smooth height animation on expand/collapse
- `Collapsible.Trigger` responds to Space/Enter keys (WAI-ARIA Disclosure pattern)

**Radix NavigationMenu escape hatch:** If `@radix-ui/react-navigation-menu` introduces unnecessary complexity for a vertical sidebar (it's primarily designed for horizontal navigation bars with dropdown submenus), fall back to a simpler approach:

- Use semantic `<nav>` + `<ul>` + `<li>` + `<a>` for the item list
- Use `@radix-ui/react-collapsible` only for the group collapse behavior
- This still satisfies the acceptance criteria (Radix is used for collapsible sections)
- **Document the deviation in the Dev Agent Record** if this fallback is used

#### `<Tabs>` (Simple — ≤ 12 props, currently 6)

```tsx
interface TabItem {
  id: string; // Unique tab identifier (used as Radix value)
  label: string; // Tab trigger text
  content: React.ReactNode; // Tab panel content
  disabled?: boolean; // Disable this tab — defaults to false
}

interface TabsProps {
  items: TabItem[]; // Tab definitions
  defaultValue?: string; // Default active tab id (uncontrolled)
  value?: string; // Controlled active tab id
  onValueChange?: (value: string) => void; // Active tab change callback
  orientation?: "horizontal" | "vertical"; // Tab layout — defaults to 'horizontal'
  className?: string;
}
```

**Radix Tabs API notes:**

- `Tabs.Root` accepts `activationMode`: `'automatic'` (default — tab activates on focus via arrow keys) or `'manual'` (tab activates on click/Enter only). Use default `'automatic'` per WAI-ARIA best practices.
- `Tabs.List` accepts `loop` (default: `true`) — arrow keys wrap from last tab to first. Keep default.
- `Tabs.Trigger` exposes `data-state="active"` or `data-state="inactive"` for CSS styling.
- `Tabs.Content` accepts `forceMount` to keep content in DOM when inactive (useful for form state preservation). Not needed for MVP.

**Radix Tabs wrapping structure:**

```tsx
<Radix.Tabs.Root
  className={clsx(styles.root, className)}
  defaultValue={defaultValue ?? items[0]?.id}
  value={value}
  onValueChange={onValueChange}
  orientation={orientation}
>
  <Radix.Tabs.List className={styles.list} data-orientation={orientation}>
    {items.map((item) => (
      <Radix.Tabs.Trigger
        key={item.id}
        className={styles.trigger}
        value={item.id}
        disabled={item.disabled}
      >
        {item.label}
      </Radix.Tabs.Trigger>
    ))}
  </Radix.Tabs.List>

  {items.map((item) => (
    <Radix.Tabs.Content
      key={item.id}
      className={styles.content}
      value={item.id}
    >
      {item.content}
    </Radix.Tabs.Content>
  ))}
</Radix.Tabs.Root>
```

**Active tab indicator visual design:**

- Horizontal: 2px bottom border on active tab using `--color-accent`
- Tab trigger text: `--font-size-body`, `--font-weight-medium`
- Active tab text: `--color-text-primary`, `--font-weight-semibold`
- Inactive tab text: `--color-text-secondary`
- Hover: `--color-text-primary` with `--color-surface-secondary` background
- Disabled tab: `opacity: 0.5; cursor: not-allowed;`
- Tab list bottom border: `1px solid var(--color-border-default)`
- Tab trigger padding: `--spacing-2` vertical, `--spacing-3` horizontal
- Transition on active indicator: `border-color` transitions with `--transition-duration-default`
- `prefers-reduced-motion`: instant indicator change (0ms transition)

**Keyboard navigation (managed by Radix):**

- Arrow left/right (horizontal) or up/down (vertical): move focus between tabs
- Tab key: moves focus from tab to panel content
- Home/End: first/last tab
- Radix handles all ARIA: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby`

**CSS for active state:** Use Radix's `[data-state="active"]` attribute selector:

```css
.trigger[data-state="active"] {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-semibold);
  border-bottom: 2px solid var(--color-accent);
}

.trigger[data-state="inactive"] {
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
}
```

### Design Token References

**Color tokens (from `src/tokens/colors.css`):**

- `--color-accent` — Active sidebar item indicator, active tab underline
- `--color-accent-hover` — Sidebar item hover accent
- `--color-accent-subtle` — Active sidebar item background
- `--color-surface-primary` — Sidebar background
- `--color-surface-secondary` — Sidebar item hover, search input background, tab hover
- `--color-text-primary` — Sidebar item labels, active tab text
- `--color-text-secondary` — Inactive tab text, sidebar description
- `--color-text-tertiary` — Sidebar group headers, collapse toggle icon
- `--color-border-default` — Sidebar right border, tab list bottom border, search input border

**Spacing tokens (from `src/tokens/spacing.css`):**

- `--spacing-1` (4px) — Border-radius for search input
- `--spacing-2` (8px) — Item vertical padding, tab vertical padding, search input padding
- `--spacing-3` (12px) — Item horizontal padding, tab horizontal padding, search horizontal margin
- `--spacing-4` (16px) — Group header top margin
- `--spacing-6` (32px) — Sidebar vertical padding (top/bottom)

**Typography tokens (from `src/tokens/typography.css`):**

- `--font-size-sm` — Group headers, search input text
- `--font-size-body` — Sidebar item labels, tab trigger text
- `--font-weight-medium` (500) — Inactive tab text
- `--font-weight-semibold` (600) — Active tab text, group headers

**Motion tokens (from `src/tokens/motion.css`):**

- `--transition-duration-fast` (100ms) — Hover state transitions
- `--transition-duration-default` (200ms) — Active indicator slide, collapse/expand, tab indicator
- `--transition-easing-default` — Standard easing for all transitions
- `@media (prefers-reduced-motion: reduce)` — Collapse all transitions to 0ms

### Testing Approach

Co-located Vitest tests (`.test.tsx`) using `@testing-library/react`, `@testing-library/jest-dom`, and `@testing-library/user-event`.

**`userEvent` setup pattern (established in Story 3-2):**

```tsx
import userEvent from "@testing-library/user-event";

const user = userEvent.setup();
// Then in tests:
await user.click(element);
await user.keyboard("{ArrowDown}");
await user.tab();
```

**Sidebar tests:**

- Renders all navigation items with correct labels
- Renders item icons when provided
- Active item has `aria-current="page"` attribute
- Active item has visual active state (`data-active="true"` or `aria-current="page"`)
- Non-active items do NOT have `aria-current`
- Calls `onItemClick` with correct item when item is clicked
- Collapsed mode: renders icons only, labels are hidden
- Expanded mode: renders both icons and labels
- Calls `onCollapsedChange` when collapse toggle is clicked
- **Search:** Renders search input when `isSearchable` is true (default)
- **Search:** Filters items by label on input (type "ord" → only items containing "ord" visible)
- **Search:** Filter is case-insensitive
- **Search:** Clearing search shows all items again
- **Search:** Shows "No results" when no items match
- **Search:** Search is hidden when sidebar is collapsed
- **Collapsed tooltip:** In collapsed mode, hovering/focusing an item shows a Tooltip with the item's label (uses Tooltip component from Story 3-2 with default 300ms delay — do NOT override to 0ms to avoid flash on mouse drag)
- **Grouped sections:** Items with same category are grouped under a section header
- **Grouped sections:** Uncategorized items appear outside any group
- **Grouped sections:** Group headers can be collapsed/expanded (Radix Collapsible)
- **Grouped sections:** Collapsing a group hides its items
- Merges className via clsx (consumer class appended)
- Renders header slot content when provided
- Renders footer slot content when provided
- **Empty items:** When `items` is empty, renders header/footer with no nav area and no search field (sidebar on first boot before modules are registered)

**Tabs tests:**

- Renders all tab triggers with correct labels
- First tab is active by default when no `defaultValue` or `value` provided
- Renders content for the active tab only (or all with hidden inactive — verify active tab's content is visible)
- `defaultValue` sets initial active tab
- `value` + `onValueChange` works in controlled mode
- Calls `onValueChange` when a tab is clicked
- **Keyboard:** Arrow keys move focus between tabs (use `userEvent.keyboard('{ArrowRight}')`)
- Disabled tab cannot be activated (click does nothing)
- Disabled tab has correct visual state
- Merges className via clsx
- Correct ARIA roles present: tablist, tab, tabpanel (verify via `getByRole`)

**Do NOT test:**

- Resolved pixel values (jsdom doesn't process CSS cascade)
- Radix internal ARIA management details (Radix's responsibility)
- Visual appearance (Storybook visual tests in Story 3.9)
- Sidebar sliding highlight animation specifics
- Responsive breakpoint behavior (requires real viewport — test in Playwright CT in Story 3.9)

### Project Structure Notes

```
packages/ui/src/
├── index.ts                          # Update with Navigation section
├── tokens/
│   └── ... (existing — DO NOT modify)
├── components/
│   ├── layout/                       # FROM Story 3-1 — DO NOT modify
│   │   └── ...
│   ├── forms/                        # FROM Story 3-2 — DO NOT modify
│   │   └── ...
│   ├── overlay/                      # FROM Story 3-2 — DO NOT modify
│   │   └── ...
│   ├── feedback/                     # FROM Story 3-3 (may or may not exist) — DO NOT modify
│   │   └── ...
│   └── navigation/                   # NEW — this story creates this directory
│       ├── Sidebar.tsx
│       ├── Sidebar.module.css
│       ├── Sidebar.test.tsx
│       ├── Tabs.tsx
│       ├── Tabs.module.css
│       └── Tabs.test.tsx
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
10. **forwardRef:** Sidebar MUST use `React.forwardRef` — its root element is a `<nav>` and the shell needs ref access for responsive breakpoint calculations, dimension measurement, and programmatic focus management. Tabs wraps Radix.Tabs.Root — forwardRef is not needed (Radix manages the root element).
11. **Radix polyfills:** jsdom polyfills for `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`, `scrollIntoView`, `ResizeObserver` are already in `test-setup.ts` from Story 3-2. Verify these are sufficient for NavigationMenu, Collapsible, and Tabs primitives. If new Radix primitives require additional polyfills, add them to test-setup.ts.

### Discrepancies Between Source Documents

1. **Sidebar location in architecture file tree:** The architecture file shows `Sidebar.tsx` in what appears to be `apps/shell/src/components/` and also lists `navigation/` under `packages/ui/` with only Breadcrumb, Tabs, Pagination. However, the UX spec and epic explicitly define Sidebar as a `@hexalith/ui` component with Radix dependencies (NavigationMenu + Collapsible). Place Sidebar in `packages/ui/src/components/navigation/`. The shell will import and use it from `@hexalith/ui`. The architecture file tree is incomplete for this component's location.

2. **Sidebar Storybook category: Layout vs Navigation:** The Storybook sidebar convention lists Sidebar under "Layout" but Tabs under "Navigation". For file organization, both go in `components/navigation/` since they are functionally navigation components. The Storybook title can differ from the file path (e.g., `title: '@hexalith/ui/Layout/Sidebar'` vs file at `navigation/Sidebar.tsx`). But for this story, use consistent placement — both in `navigation/`. Storybook titles are Story 3.9's concern.

3. **NavigationMenu complexity — IMPORTANT:** `@radix-ui/react-navigation-menu` is designed for horizontal navigation bars with flyout dropdown sub-menus — it is overly complex for a vertical sidebar list of flat links. The acceptance criteria says "wraps @radix-ui/react-navigation-menu" but this is aspirational. **Recommended approach:** Start with semantic HTML (`<nav>` + `<ul>` + `<li>` + `<a>`) with `@radix-ui/react-collapsible` for group collapse behavior. This is simpler, lighter, equally accessible, and still uses Radix for the collapsible sections. The spike in Task 2 validates whether NavigationMenu adds value. Add `@radix-ui/react-navigation-menu` as a dependency regardless (it may be needed in Phase 2 for sub-route navigation), but do NOT force it into the Sidebar implementation if semantic HTML works better. Document the decision in the Dev Agent Record.

4. **Sidebar at <1024px (mobile/tablet):** UX spec says sidebar is "Hidden off-screen, toggle via hamburger icon in top bar. Slide-over overlay, does not push content." This slide-over overlay behavior involves z-indexing and interaction with the shell layout — it is NOT in scope for the `<Sidebar>` component in this story. The `<Sidebar>` component supports `isCollapsed` (expanded/collapsed). The responsive auto-collapse at breakpoints and the slide-over overlay at mobile sizes are shell-level concerns (the shell uses `@media` queries to control `isCollapsed` and overlay rendering). This story delivers the component; the shell wires the responsive behavior.

5. **Search auto-expand in collapsed mode:** UX spec says "typing any key while sidebar is focused auto-expands to full width and places cursor in search field." This is a shell-level keyboard shortcut behavior, not a Sidebar component feature. The Sidebar component hides the search field when collapsed. The shell can listen for keypress events and call `onCollapsedChange(false)` + focus the search input. This story does NOT implement auto-expand on keypress — that's a shell integration concern.

6. **Breadcrumb and Pagination:** The architecture file tree shows `Breadcrumb.tsx` and `Pagination.tsx` in the `navigation/` directory alongside `Tabs.tsx`. These are NOT in scope for Story 3.4. Breadcrumb may be added in a future story. Pagination is part of the Table component (Story 3.5). Do NOT create these files.

### Anti-Patterns to Avoid

- **NO hardcoded values.** Every color, spacing, font-size, border, transition MUST reference a design token.
- **NO external margins.** Components use `gap` on parents, not `margin` on children.
- **NO inline styles** except the CSS custom property pattern for prop-to-CSS mapping.
- **NO `!important`.** CSS layers handle precedence.
- **NO barrel files** in subdirectories. Only `src/index.ts`.
- **NO importing from `@hexalith/cqrs-client`.**
- **NO `any` type.** TypeScript strict mode enforced.
- **NO duplicate `aria-*` attributes** on Radix-wrapped components. ARIA is Radix's responsibility for Tabs. For Sidebar, only add `aria-current="page"` on the active item (this is NOT a Radix-managed attribute — it's a navigation semantic).
- **NO `__tests__/` directories.** Tests are co-located.
- **NO direct Radix imports** from outside `packages/ui/`.
- **DO NOT modify existing layout components** from Story 3-1.
- **DO NOT modify existing forms/overlay components** from Story 3-2.
- **DO NOT modify existing feedback components** from Story 3-3 (if they exist).
- **DO NOT modify existing token files** (colors.css, spacing.css, typography.css, motion.css, interactive.css, z-index.css).
- **DO NOT add `tabindex` hacks.** Focus order follows visual layout.
- **DO NOT add an icon library.** All icons are inline SVGs (6-10 lines each). The collapse toggle chevron is the only icon the Sidebar component itself creates. Navigation item icons come from consumers via the `icon` prop.
- **DO NOT implement responsive breakpoint media queries inside the Sidebar component.** The component supports `isCollapsed` prop for expanded/collapsed rendering. The shell manages responsive breakpoint logic and passes `isCollapsed` accordingly.

### Architecture Decision: NavigationMenu vs Semantic HTML

**Decision: Semantic HTML + Radix Collapsible (Option B from ADR)**

| Option                                 | Verdict         | Rationale                                                                                                                                                                                                                                                                      |
| -------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Radix NavigationMenu + Collapsible** | Not recommended | NavigationMenu is designed for horizontal nav bars with flyout submenus. `orientation="vertical"` is a secondary use case. Renders unnecessary Viewport, Indicator, Sub components. Adds ~15KB bundle overhead for unused features.                                            |
| **Semantic HTML + Radix Collapsible**  | **Recommended** | `<nav>` + `<ul>` + `<li>` + `<a>` is the semantically correct HTML pattern for sidebar navigation. Radix Collapsible provides genuine value for animated group collapse/expand with `data-state` and `--radix-collapsible-content-height`. Simpler, lighter, fully accessible. |
| **Semantic HTML only**                 | Rejected        | Loses Collapsible's animated height transitions and data-state CSS targeting. Manual collapse adds unnecessary complexity.                                                                                                                                                     |

The `@radix-ui/react-navigation-menu` dependency is still added to `package.json` for potential Phase 2 use (sub-route navigation menus). Task 1.5 spike validates this decision empirically.

### Downstream Dependency Note (for Story 5.2)

Story 5.2 (Unified Navigation & Route Generation) will wire the Sidebar's `isCollapsed` prop to responsive `@media` queries in the shell — auto-collapsing at `--breakpoint-md` (1024px) and auto-expanding at `--breakpoint-lg` (1280px). This story delivers the component with controlled `isCollapsed` support; the shell applies the responsive logic. Story 5.2 also integrates the sidebar search/filter to work "across all registered modules" — from the Sidebar component's perspective, this is already supported (the shell passes filtered `items`).

### Storybook Note (for Story 3.9)

When Story 3.9 adds Storybook, Sidebar and Tabs work without special decorators or providers. Sidebar should have stories showing: expanded state, collapsed state, with search, with grouped categories, many items (10+ for scroll testing), active states. Tabs should have stories showing: horizontal layout, vertical layout, with disabled tabs, many tabs.

### Radix API Escape Hatch

If a Radix API (`@radix-ui/react-navigation-menu`, `@radix-ui/react-collapsible`, or `@radix-ui/react-tabs`) behaves differently than described in this story at the pinned version — e.g., NavigationMenu doesn't support vertical orientation cleanly, Collapsible doesn't emit expected `data-state` attributes, or Tabs keyboard navigation differs — **document the deviation in the Dev Agent Record** and adapt the implementation to achieve the same user-facing behavior using alternative means. The acceptance criteria define _what_ the user sees, not _how_ Radix is configured internally.

### Git Intelligence from Recent Work

Recent commits show the project is actively implementing Epic 3 components:

- `9112b0b` — Story 3-2: Button, Input, Select, Tooltip with tests and styles
- Established patterns: CSS Modules with `@layer components`, data-\* attributes, forwardRef, displayName, clsx, inline SVG icons
- Test setup includes jsdom polyfills for Radix
- Token files are imported through `apps/shell/src/styles/global.css` (the token composition root)
- If new Radix packages require new polyfills, follow the same pattern in `test-setup.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4] — acceptance criteria and story definition
- [Source: _bmad-output/planning-artifacts/architecture.md#Code Organization] — file structure for packages/ui/
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — file and code naming conventions
- [Source: _bmad-output/planning-artifacts/architecture.md#Barrel Export Clarification] — index.ts organization
- [Source: _bmad-output/planning-artifacts/architecture.md#Package Dependency Rules] — dependency boundaries
- [Source: _bmad-output/planning-artifacts/architecture.md#Storybook Sidebar Convention] — Sidebar under Layout, Tabs under Navigation
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#CSS Layer Cascade Order] — @layer enforcement
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Margin-Free Components] — zero external margin rule
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component API Complexity Tiers] — Sidebar Complex ≤ 20, Tabs Simple ≤ 12
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Delivery Roadmap] — Week 3 navigation components
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Radix Primitives to wrap] — Sidebar uses NavigationMenu + Collapsible; Tabs uses Tabs
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive Breakpoints] — sidebar collapse behavior at breakpoints
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Sidebar responsive behavior] — expanded/collapsed/hidden states
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Focus Management] — focus-visible ring, focus order
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Screen Reader Strategy] — aria-current="page" on active item, aria-expanded on groups
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Motion Accessibility] — prefers-reduced-motion
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Navigation Cache Strategy] — stale-while-revalidate (shell concern, not component)
- [Source: _bmad-output/implementation-artifacts/3-2-core-interactive-components.md] — Radix integration patterns, data-\* attributes, jsdom polyfills, inline SVG icons, Tooltip component (reused for collapsed sidebar)
- [Source: _bmad-output/implementation-artifacts/3-3-feedback-and-state-components.md] — independent story, no dependency

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- ESLint import-x/order required value imports before type imports with blank line separators between groups. Fixed by following the pattern established in Select.test.tsx.
- Sidebar import order: CSS module import must come before sibling component imports per import-x/order rule.

### Completion Notes List

- **Architecture Decision (Task 1.5):** Used semantic HTML (`<nav>` + `<ul>` + `<li>` + `<a>`) with `@radix-ui/react-collapsible` for group collapse. `@radix-ui/react-navigation-menu` is overkill for a flat vertical link list — it's designed for horizontal nav bars with flyout submenus. The dependency remains in package.json for potential Phase 2 sub-route navigation.
- **Sidebar (Task 2):** Implemented with `React.forwardRef`, controlled `isCollapsed` prop, search/filter with Escape-to-clear, grouped sections with `@radix-ui/react-collapsible`, Tooltip on collapsed items (reused from Story 3-2), active indicator via CSS `data-active`/`aria-current="page"` with `--color-accent` left border and `--color-accent-subtle` background. Focus management moves focus to toggle when collapse hides the search field. Empty items handled gracefully.
- **Review fixes (2026-03-20):** Sidebar now defaults to responsive collapsed mode below the `--breakpoint-lg` threshold when `isCollapsed` is uncontrolled, while still allowing explicit shell control via `isCollapsed` / `onCollapsedChange`.
- **Review fixes (2026-03-20):** Collapsed items without an explicit icon now render a fallback monogram so optional `icon` items remain usable in icon-only mode.
- **Review fixes (2026-03-20):** Navigation tests now verify responsive default collapse behavior and assert that group collapse hides item content rather than only checking Radix state attributes.
- **Active indicator approach:** Used CSS-only Approach A (per-item `data-active` + `aria-current="page"` attribute selectors with CSS transitions on background and `::before` pseudo-element for left border indicator). Satisfies "sliding highlight transition" AC via CSS transitions.
- **Tabs (Task 3):** Wraps `@radix-ui/react-tabs` with proper keyboard navigation (arrow keys via Radix), `data-state="active"/"inactive"` styling, disabled tab support, horizontal/vertical orientation. No duplicate ARIA attributes added.
- **Token compliance:** 100% (605/605 declarations) — all navigation CSS uses design tokens exclusively.
- **Tests:** 40 new tests (28 Sidebar + 12 Tabs), 272 total tests passing with 0 regressions.

### Change Log

- 2026-03-20: Implemented Story 3-4 Navigation Components (Sidebar + Tabs)
- 2026-03-20: Applied code review fixes for responsive sidebar defaults, collapsed fallback icon rendering, stronger group-collapse assertions, and story metadata synchronization

### File List

- `packages/ui/src/components/navigation/Sidebar.tsx` (new)
- `packages/ui/src/components/navigation/Sidebar.module.css` (new)
- `packages/ui/src/components/navigation/Sidebar.test.tsx` (new)
- `packages/ui/src/components/navigation/Tabs.tsx` (new)
- `packages/ui/src/components/navigation/Tabs.module.css` (new)
- `packages/ui/src/components/navigation/Tabs.test.tsx` (new)
- `packages/ui/src/index.ts` (modified — added Navigation section exports)
- `packages/ui/package.json` (modified — added @radix-ui/react-navigation-menu, @radix-ui/react-collapsible, @radix-ui/react-tabs)
- `pnpm-lock.yaml` (modified — lockfile updated for navigation dependencies)
- `_bmad-output/implementation-artifacts/3-4-navigation-components.md` (modified — review fixes, status sync, file list sync)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story status synced to done)

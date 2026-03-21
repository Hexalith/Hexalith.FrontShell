# Story 3.8: Overlay Components

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a module developer,
I want modal, dialog, dropdown, and popover components with proper focus management,
So that overlay interactions are accessible, visually consistent, and never trap users.

## Critical Checklist — Must Not Miss

1. `forceMount` on Modal/AlertDialog only — NEVER on DropdownMenu/Popover
2. `visibility: hidden` on `[data-state="closed"]` for Modal/AlertDialog — screen reader safety
3. New tokens required BEFORE building components: `--shadow-modal`, `--color-overlay-backdrop`, `--radius-sm/md/lg` (Task 2)
4. AlertDialog action button: raw `<button>` with CSS module styling — NOT the `<Button>` component
5. AlertDialog Escape routes through `onCancel()` — do NOT block Escape (WCAG compliance)
6. All CSS in `@layer components { }` — zero hardcoded values — `prefers-reduced-motion` on all animations
7. DropdownMenu/Popover: CSS `@keyframes` animation. Modal/AlertDialog: CSS `transition` (different patterns!)
8. `radius.css` must be importable via `@hexalith/ui/tokens/radius.css` — verify tokens resolve
9. `max-height` + `overflow-y: auto` on Modal content, DropdownMenu content, and Popover content
10. All components: `displayName`, own type definitions (no Radix re-exports), zero external margin

## Acceptance Criteria

1. **Modal wraps @radix-ui/react-dialog:** `<Modal title="Confirm" onClose={close}>{children}</Modal>` renders with an overlay backdrop, focus is trapped inside the modal, pressing Escape closes the modal, closing returns focus to the trigger element, only one focus trap is active at any time, and the modal uses `--z-modal` (300) z-index token. Radix built-in animations are disabled via `forceMount` — custom CSS transitions use motion tokens.

2. **AlertDialog wraps @radix-ui/react-alert-dialog:** Used for destructive confirmations, the dialog requires explicit user action (no click-outside dismiss; Escape routes through cancel). The destructive action button uses the urgent emotional register tokens (`--color-status-danger`).

3. **DropdownMenu wraps @radix-ui/react-dropdown-menu:** Items are keyboard navigable (arrow keys, type-ahead, Enter to select), the menu uses `--z-dropdown` (100) z-index token, and submenus are supported.

4. **Popover wraps @radix-ui/react-popover:** `<Popover trigger={<Button>Info</Button>}>{content}</Popover>` appears anchored to the trigger element, uses `--z-popover` (200) z-index token, and is keyboard dismissible (Escape) and click-outside dismissible.

5. **Accessibility compliance:** All overlay components preserve Radix's built-in ARIA attributes, no duplicate `aria-*` attributes are added by the wrapper, and `prefers-reduced-motion` disables all transition animations.

6. **Prop budget & standards:** Modal <=12 props (simple), AlertDialog <=12 props (simple), DropdownMenu <=20 props (complex), Popover <=20 props (complex). All components have zero external margin. Both themes produce correct, contrast-compliant results.

## Tasks / Subtasks

- [ ] Task 0: Pre-implementation verification (AC: all)
  - [ ] **GATE CHECK:** Run `pnpm build && pnpm test && pnpm lint` in `packages/ui/`. **If any command fails, STOP and report.**
  - [ ] **PREREQUISITE:** Verify existing overlay component exists: `packages/ui/src/components/overlay/Tooltip.tsx` with its CSS module and test.
  - [ ] **PREREQUISITE:** Verify layout components exist: `Stack.tsx`, `Inline.tsx`, `Divider.tsx` in `packages/ui/src/components/layout/`.
  - [ ] **PREREQUISITE:** Verify Button exists at `packages/ui/src/components/forms/Button.tsx`.
  - [ ] **PREREQUISITE:** Verify z-index tokens exist: `packages/ui/src/tokens/z-index.css` with `--z-dropdown: 100`, `--z-popover: 200`, `--z-modal: 300`.
  - [ ] **PREREQUISITE:** Verify motion tokens exist: `packages/ui/src/tokens/motion.css` and `packages/ui/src/tokens/interactive.css`.
  - [ ] **PREREQUISITE:** Verify exports in `packages/ui/src/index.ts` include Tooltip.

- [ ] Task 1: Install new Radix dependencies (AC: all)
  - [ ] Add to `packages/ui/package.json` dependencies:
    - `@radix-ui/react-dialog` (Modal primitive)
    - `@radix-ui/react-alert-dialog` (AlertDialog primitive)
    - `@radix-ui/react-dropdown-menu` (DropdownMenu primitive)
    - `@radix-ui/react-popover` (Popover primitive) — **NOTE:** Story 3-7 may have already added this for DatePicker. If so, skip. If not, add it.
  - [ ] Pin Radix versions to match existing pattern (^1.x for single-digit, match `@radix-ui/react-tooltip` version pattern)
  - [ ] Run `pnpm install` from workspace root
  - [ ] Verify `pnpm build` still passes after dependency changes

- [ ] Task 2: Add missing design tokens (AC: all)
  - [ ] Add `--shadow-modal` and `--color-shadow-modal` to `packages/ui/src/tokens/interactive.css`:
    - Light: `--color-shadow-modal: rgba(0, 0, 0, 0.12);` and `--shadow-modal: 0 8px 24px var(--color-shadow-modal);`
    - Dark: `--color-shadow-modal: rgba(0, 0, 0, 0.4);` and `--shadow-modal: 0 8px 24px var(--color-shadow-modal);`
  - [ ] Add `--color-overlay-backdrop` to `packages/ui/src/tokens/colors.css`:
    - Light: `--color-overlay-backdrop: rgba(0, 0, 0, 0.4);`
    - Dark: `--color-overlay-backdrop: rgba(0, 0, 0, 0.6);`
  - [ ] Add radius tokens to a new `packages/ui/src/tokens/radius.css` file:
    - `--radius-sm: 4px;` (badges, tags, small interactive elements — equivalent to current `var(--spacing-1)` usage)
    - `--radius-md: 6px;` (buttons, inputs, cards — default component radius)
    - `--radius-lg: 8px;` (modals, popovers, elevated surfaces)
    - Wrap in `@layer tokens { :root { ... } }` following existing token file pattern
    - **IMPORTANT:** After creating `radius.css`, ensure it is loaded alongside other token files. Specifically: check `packages/ui/src/index.ts` or any root CSS file that `@import`s token files (search for `@import` of `colors.css` or `spacing.css` to find the pattern). If tokens are loaded via the `exports` field in `package.json` (`"./tokens/*.css"`), then `radius.css` will be available automatically at `@hexalith/ui/tokens/radius.css`. Verify tokens resolve by adding a test that renders a component using `var(--radius-lg)` and checking the computed style is `8px`.
    - **NOTE:** Existing components use `var(--spacing-1)` for border-radius. New overlay components should use the semantic `var(--radius-lg)` for elevated surfaces and `var(--radius-sm)` for menu items. Do NOT retroactively update existing components — that's a separate refactor.
  - [ ] Verify `pnpm build` passes after token additions
  - [ ] **MERGE CAUTION:** Story 3-7 may also modify `interactive.css` and `colors.css`. If Story 3-7 has landed, verify your token additions append cleanly to the existing file — do not overwrite Story 3-7's changes.

- [ ] Task 3: Create Modal component (AC: #1, #5, #6)
  - [ ] Create `packages/ui/src/components/overlay/Modal/Modal.tsx`:
    - **Props (ModalProps):**
      - `open: boolean` — controlled open state
      - `onClose: () => void` — called when user closes (Escape, overlay click, close button)
      - `title: string` — dialog title (rendered as Dialog.Title)
      - `description?: string` — optional dialog description (rendered as Dialog.Description, visually hidden if not needed)
      - `children: React.ReactNode` — modal body content
      - `size?: 'small' | 'medium' | 'large'` — default `'medium'` (maps to max-width: 480px / 640px / 800px)
      - `closeLabel?: string` — accessible label for close button, default `'Close'`
      - `className?: string`
    - Wrapping structure:
      ```
      Dialog.Root (open, onOpenChange)
        Dialog.Portal (forceMount)
          Dialog.Overlay (forceMount, className)
          Dialog.Content (forceMount, onEscapeKeyDown, onPointerDownOutside → onClose)
            Dialog.Title
            Dialog.Description (if provided, else sr-only)
            {children}
            Dialog.Close (close button, top-right)
      ```
    - **forceMount on Portal, Overlay, and Content** — required to disable Radix animations and use custom CSS transitions
    - Use `data-state` attribute (Radix provides "open"/"closed") for CSS transition triggers
    - Close button: `<button>` with X icon (inline SVG), positioned top-right, accessible label
    - `onOpenChange` callback: when false, call `onClose()`
    - Display name: `'Modal'`
    - Prop count: 8 (within <=12 budget)
  - [ ] Create `packages/ui/src/components/overlay/Modal/Modal.module.css`:
    - All styles in `@layer components { }`
    - `.overlay`: `position: fixed; inset: 0; background: var(--color-overlay-backdrop); z-index: var(--z-modal);`
    - `.overlay` transition: opacity fade using `--transition-duration-default`
    - `.overlay[data-state="open"]`: `opacity: 1;`
    - `.overlay[data-state="closed"]`: `opacity: 0; pointer-events: none; visibility: hidden;`
    - **CRITICAL — `visibility: hidden` is mandatory:** With `forceMount`, the DOM stays mounted when closed. `opacity: 0` + `pointer-events: none` is not enough — screen readers (NVDA, VoiceOver) can still traverse invisible content. `visibility: hidden` removes it from the accessibility tree. Radix does NOT add `aria-hidden` automatically with `forceMount`.
    - `.content`: `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: var(--z-modal); background: var(--color-surface-elevated); border-radius: var(--radius-lg); box-shadow: var(--shadow-modal); padding: var(--spacing-5); width: 90vw; max-height: calc(100vh - var(--spacing-8)); overflow-y: auto;`
    - **Scroll behavior:** Modal body scrolls within the content container when content exceeds viewport height. The backdrop remains fixed. In full-screen responsive mode, use `max-height: 100vh; overflow-y: auto;` so the entire modal scrolls.
    - `.content` transition: opacity + scale + visibility using `--transition-duration-default`. Use `transition: opacity var(--transition-duration-default) var(--transition-easing-default), transform var(--transition-duration-default) var(--transition-easing-default), visibility 0s var(--transition-duration-default);` — visibility transitions with a delay equal to the fade duration so it hides AFTER the animation completes. On open: `transition-delay: 0s` for all properties (visibility becomes visible immediately).
    - `.content[data-state="open"]`: `opacity: 1; transform: translate(-50%, -50%) scale(1); visibility: visible;`
    - `.content[data-state="closed"]`: `opacity: 0; transform: translate(-50%, -50%) scale(var(--motion-scale-overlay)); pointer-events: none; visibility: hidden;`
    - Size variants via `[data-size]` attribute: `small` → `max-width: 480px`, `medium` → `max-width: 640px`, `large` → `max-width: 800px`
    - `.title`: `font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); margin: 0 0 var(--spacing-2) 0;`
    - `.description`: `font-size: var(--font-size-sm); color: var(--color-text-secondary); margin: 0 0 var(--spacing-4) 0;`
    - `.closeButton`: positioned top-right, `color: var(--color-text-secondary)`, hover: `color: var(--color-text-primary)`, focus-visible ring
    - Responsive: `@media (max-width: 1023px)` — full-screen modal: `width: 100%; height: 100%; max-width: none; max-height: 100vh; border-radius: 0; top: 0; left: 0; transform: none;` Close button must remain prominent and easily tappable in full-screen mode (minimum 44x44px touch target).
    - `@media (prefers-reduced-motion: reduce)` — `transition-duration: 0ms` on overlay and content
    - Zero external margin on content
  - [ ] Create `packages/ui/src/components/overlay/Modal/index.ts`:
    - Export `Modal`, `ModalProps`
  - [ ] Create `packages/ui/src/components/overlay/Modal/Modal.test.tsx`:
    - Renders with title and children when open
    - Does not render content when closed (content has opacity: 0 + pointer-events: none)
    - Calls onClose when Escape pressed
    - Calls onClose when overlay backdrop clicked
    - Calls onClose when close button clicked
    - Close button has accessible label
    - Title rendered as dialog title (verify role="dialog" has aria-labelledby)
    - Description rendered when provided
    - Size prop applies data-size attribute (small, medium, large)
    - Has displayName 'Modal'
    - Focus is trapped inside modal: render modal with multiple focusable elements (e.g., close button + 2 buttons in body), Tab through all elements, verify focus cycles back to first focusable element and never reaches elements behind the modal
    - Long content scrolls within modal body (render with content taller than viewport, verify overflow-y: auto behavior)
    - When closed, content is hidden from screen readers: verify the content container has `visibility: hidden` (or is not in the accessibility tree) when `open={false}`

- [ ] Task 4: Create AlertDialog component (AC: #2, #5, #6)
  - [ ] Create `packages/ui/src/components/overlay/AlertDialog/AlertDialog.tsx`:
    - **Props (AlertDialogProps):**
      - `open: boolean` — controlled open state
      - `onAction: () => void` — called when user confirms the destructive action
      - `onCancel: () => void` — called when user cancels
      - `title: string` — dialog title
      - `description: string` — required explanation of the destructive action
      - `actionLabel?: string` — default `'Delete'` — text for the destructive button
      - `cancelLabel?: string` — default `'Cancel'` — text for the cancel button
      - `className?: string`
    - Wrapping structure:
      ```
      AlertDialog.Root (open, onOpenChange → calls onCancel when false)
        AlertDialog.Portal (forceMount)
          AlertDialog.Overlay (forceMount)
          AlertDialog.Content (forceMount)
            AlertDialog.Title
            AlertDialog.Description
            action button row (div.actions with flexbox):
              AlertDialog.Cancel asChild → <Button> with cancelLabel (reuse existing Button)
              AlertDialog.Action asChild → <button className={styles.actionButton}> with actionLabel (raw button, danger-styled via CSS module)
      ```
    - **forceMount** on Portal, Overlay, Content for custom CSS transitions
    - **No click-outside dismiss:** AlertDialog.Content does NOT call onCancel on pointer down outside — Radix AlertDialog handles this natively (no `onPointerDownOutside` needed as AlertDialog blocks it by default)
    - **Escape behavior:** Radix AlertDialog closes on Escape by default (calls `onOpenChange(false)`). Allow this — route Escape through `onCancel()` (same as clicking Cancel). This satisfies both the AC ("requires explicit user action" — Escape IS a deliberate user action) and WCAG 2.1 SC 2.1.2 (dialogs must be keyboard-dismissible). Implementation: in `onOpenChange`, when `open` becomes `false`, call `onCancel()`. Do NOT add `onEscapeKeyDown={(e) => e.preventDefault()}` — blocking Escape would fail accessibility audits in Story 3-9.
    - Destructive action button: render `AlertDialog.Action` with `asChild` wrapping a raw `<button>` element styled via `styles.actionButton` in AlertDialog.module.css. Uses `--color-status-danger` background and `--color-text-on-accent` text. Do NOT use the existing `<Button>` component for the action — it lacks danger styling and modifying Button.tsx is not permitted.
    - Display name: `'AlertDialog'`
    - Prop count: 8 (within <=12 budget)
  - [ ] Create `packages/ui/src/components/overlay/AlertDialog/AlertDialog.module.css`:
    - **Implementation approach:** Copy Modal.module.css as a starting point, then adapt. AlertDialog shares the overlay + content + visibility + transition pattern with Modal. Do NOT import from Modal's CSS module — each component owns its styles independently.
    - All styles in `@layer components { }`
    - `.overlay`: same pattern as Modal overlay, same backdrop color, z-index (`--z-modal`), and `visibility: hidden` on `[data-state="closed"]`
    - `.content`: centered positioning (same as Modal), `width: min(480px, 90vw);` (prevents horizontal overflow on narrow viewports), same background/shadow/radius, and `visibility: hidden` on `[data-state="closed"]`
    - `.content` transition: same opacity + scale pattern as Modal
    - `.title`: same as Modal title styling
    - `.description`: `font-size: var(--font-size-base); color: var(--color-text-secondary); margin-bottom: var(--spacing-5);`
    - `.actions`: `display: flex; justify-content: flex-end; gap: var(--spacing-3);`
    - `.actionButton`: `background-color: var(--color-status-danger); color: var(--color-text-on-accent); border: none; padding: var(--spacing-2) var(--spacing-4); border-radius: var(--radius-md); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); font-family: var(--font-family-sans); cursor: pointer; transition: filter var(--transition-duration-fast) var(--transition-easing-default);` (match Button's base style feel — padding, font, radius, transition)
    - `.actionButton:hover`: `filter: brightness(0.9);` (token-compliant darkening — no hardcoded opacity or color values)
    - `.actionButton:focus-visible`: focus ring
    - `@media (prefers-reduced-motion: reduce)` — `transition-duration: 0ms`
    - Zero external margin
  - [ ] Create `packages/ui/src/components/overlay/AlertDialog/index.ts`
  - [ ] Create `packages/ui/src/components/overlay/AlertDialog/AlertDialog.test.tsx`:
    - Renders title and description when open
    - Renders action and cancel buttons with correct labels
    - Calls onAction when action button clicked
    - Calls onCancel when cancel button clicked
    - Does NOT close on click outside (verify onCancel not called on overlay click)
    - Escape routes through onCancel: press Escape key, verify onCancel is called (not onAction) — WCAG requires keyboard dismissibility
    - Action button is visually styled as destructive (has danger class or styling)
    - Has displayName 'AlertDialog'
    - Custom action/cancel labels rendered correctly
    - Button order: cancel button appears before action button in DOM (left-to-right: Cancel | Delete)

- [ ] Task 5: Create DropdownMenu component (AC: #3, #5, #6)
  - [ ] Create `packages/ui/src/components/overlay/DropdownMenu/DropdownMenu.tsx`:
    - **Exported types:**
      - `DropdownMenuItem`: `{ label: string; onSelect: () => void; disabled?: boolean; destructive?: boolean }`
      - `DropdownMenuSeparator`: `{ type: 'separator' }`
      - `DropdownMenuGroup`: `{ label?: string; items: Array<DropdownMenuItem | DropdownMenuSeparator> }`
      - `DropdownMenuItemType`: `DropdownMenuItem | DropdownMenuSeparator | DropdownMenuGroup`
    - **Props (DropdownMenuProps):**
      - `trigger: React.ReactElement` — the element that opens the menu (must accept ref)
      - `items: Array<DropdownMenuItemType>` — flat items, separators, or groups
      - `align?: 'start' | 'center' | 'end'` — alignment relative to trigger (default `'start'`)
      - `side?: 'top' | 'right' | 'bottom' | 'left'` — default `'bottom'`
      - `open?: boolean` — controlled open state (optional)
      - `onOpenChange?: (open: boolean) => void` — controlled callback
      - `sideOffset?: number` — default 4 (matches Popover and Select offset patterns)
      - `className?: string`
    - Wrapping structure:
      ```
      DropdownMenu.Root (open, onOpenChange)
        DropdownMenu.Trigger asChild → {trigger}
        DropdownMenu.Portal
          DropdownMenu.Content (align, side, sideOffset, className)
            map items:
              DropdownMenuItem → DropdownMenu.Item (onSelect, disabled, data-destructive)
              DropdownMenuSeparator → DropdownMenu.Separator
              DropdownMenuGroup → DropdownMenu.Group + optional DropdownMenu.Label
      ```
    - Keyboard navigation provided by Radix: arrow keys, type-ahead, Enter to select, Escape to close
    - Destructive items: apply `data-destructive` attribute for CSS styling with `--color-status-danger`
    - **Submenu support (MVP scope):** Submenus are supported via Radix's native `DropdownMenu.Sub` + `SubTrigger` + `SubContent`. For MVP, expose submenus through a `submenu` property on `DropdownMenuItem`:
      ```tsx
      interface DropdownMenuItem {
        label: string;
        onSelect?: () => void;  // optional when item has submenu
        disabled?: boolean;
        destructive?: boolean;
        /** Nested submenu items — renders as Radix DropdownMenu.Sub */
        submenu?: Array<DropdownMenuItem | DropdownMenuSeparator>;
      }
      ```
      When `submenu` is present, `onSelect` is ignored — the item acts as a submenu trigger only (not a selectable action). Render `DropdownMenu.Sub` wrapping `SubTrigger` (with the item label + chevron indicator) and `SubContent` (with the nested items). Limit to 1 level of nesting for MVP — do not allow `submenu` items to themselves have `submenu`. CSS for `SubContent` reuses `.content` styles.
    - Display name: `'DropdownMenu'`
    - Prop count: 8 (within <=20 budget)
  - [ ] Create `packages/ui/src/components/overlay/DropdownMenu/DropdownMenu.module.css`:
    - All styles in `@layer components { }`
    - `.content`: `z-index: var(--z-dropdown); background: var(--color-surface-elevated); border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); box-shadow: var(--shadow-popover); padding: var(--spacing-1); min-width: 160px; max-height: min(320px, calc(100vh - 32px)); overflow-y: auto;`
    - `.content` animation: use `data-state` + `data-side` for enter/exit transitions. Opacity + translateY using motion tokens.
    - `.item`: `display: flex; align-items: center; padding: var(--spacing-2) var(--spacing-3); font-size: var(--font-size-sm); color: var(--color-text-primary); border-radius: var(--radius-sm); cursor: pointer; outline: none;`
    - `.item[data-highlighted]`: `background: var(--color-surface-secondary);` (Radix adds this on focus/hover)
    - `.item[data-disabled]`: `color: var(--color-text-tertiary); cursor: not-allowed;`
    - `.item[data-destructive]`: `color: var(--color-status-danger);`
    - `.item[data-destructive][data-highlighted]`: slightly tinted danger background
    - `.separator`: `height: 1px; background: var(--color-border-subtle); margin: var(--spacing-1) 0;`
    - `.groupLabel`: `padding: var(--spacing-2) var(--spacing-3); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;`
    - `@media (prefers-reduced-motion: reduce)` — `animation-duration: 0ms`
    - Zero external margin
  - [ ] Create `packages/ui/src/components/overlay/DropdownMenu/index.ts`
  - [ ] Create `packages/ui/src/components/overlay/DropdownMenu/DropdownMenu.test.tsx`:
    - Renders trigger element
    - Opens menu on trigger click
    - Renders all menu items with labels
    - Calls onSelect when item clicked
    - Closes menu after item selection
    - Disabled items do not trigger onSelect
    - Destructive items have data-destructive attribute
    - Renders separators between items
    - Renders group labels when groups provided
    - Keyboard: arrow keys navigate items, Enter selects, Escape closes
    - Keyboard type-ahead: pressing a letter key focuses the first item whose label starts with that letter
    - Has displayName 'DropdownMenu'
    - Controlled open/onOpenChange works

- [ ] Task 6: Create Popover component (AC: #4, #5, #6)
  - [ ] Create `packages/ui/src/components/overlay/Popover/Popover.tsx`:
    - **Props (PopoverProps):**
      - `trigger: React.ReactElement` — trigger element (must accept ref)
      - `children: React.ReactNode` — popover content
      - `align?: 'start' | 'center' | 'end'` — default `'center'`
      - `side?: 'top' | 'right' | 'bottom' | 'left'` — default `'bottom'`
      - `open?: boolean` — controlled open state (optional)
      - `onOpenChange?: (open: boolean) => void` — controlled callback
      - `sideOffset?: number` — default 4
      - `className?: string`
    - Wrapping structure:
      ```
      Popover.Root (open, onOpenChange)
        Popover.Trigger asChild → {trigger}
        Popover.Portal
          Popover.Content (align, side, sideOffset, className)
            {children}
            Popover.Arrow (optional — include for visual consistency)
      ```
    - Keyboard: Escape closes, click outside closes (Radix default behavior)
    - **Focus behavior:** Radix Popover does NOT trap focus (unlike Modal/AlertDialog). Users can Tab out of the popover into page content. This is intentional — Popover is a lightweight overlay for supplementary content, not a blocking interaction. If a use case requires trapped focus (e.g., a complex form), the developer should use Modal instead.
    - **Viewport collision:** Radix Popover handles collision detection automatically (`avoidCollisions` defaults to `true`). If the popover would overflow the viewport, Radix repositions it. No custom collision logic needed.
    - Display name: `'Popover'`
    - Prop count: 8 (within <=20 budget)
  - [ ] Create `packages/ui/src/components/overlay/Popover/Popover.module.css`:
    - All styles in `@layer components { }`
    - `.content`: `z-index: var(--z-popover); background: var(--color-surface-elevated); border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); box-shadow: var(--shadow-popover); padding: var(--spacing-3); max-height: min(480px, calc(100vh - 32px)); overflow-y: auto;`
    - `.content` animation: opacity + scale/translateY using motion tokens, triggered by `data-state`
    - `.content[data-state="open"]`: visible
    - `.content[data-state="closed"]`: hidden with opacity 0
    - `.arrow`: `fill: var(--color-surface-elevated);`
    - `@media (prefers-reduced-motion: reduce)` — `animation-duration: 0ms`
    - Zero external margin
  - [ ] Create `packages/ui/src/components/overlay/Popover/index.ts`
  - [ ] Create `packages/ui/src/components/overlay/Popover/Popover.test.tsx`:
    - Renders trigger element
    - Opens popover on trigger click
    - Renders children content when open
    - Closes on Escape key
    - Closes on click outside
    - Controlled open/onOpenChange works
    - Align and side props passed to content
    - Has displayName 'Popover'

- [ ] Task 7: Update package exports (AC: all)
  - [ ] Update `packages/ui/src/index.ts` — add new exports under `// --- Overlay ---`:
    - `Modal`, `ModalProps`
    - `AlertDialog`, `AlertDialogProps`
    - `DropdownMenu`, `DropdownMenuProps`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuGroup`
    - `Popover`, `PopoverProps`
  - [ ] Verify no circular dependencies in new exports
  - [ ] Run `pnpm build` to confirm tsup produces ESM + .d.ts for all new exports

- [ ] Task 8: Final verification — Definition of Done (AC: all)
  - [ ] Run `pnpm build` — confirm tsup produces ESM + .d.ts
  - [ ] Run `pnpm test` — confirm ALL Vitest tests pass (all components)
  - [ ] Run `pnpm lint` — confirm ESLint passes
  - [ ] Verify Modal: opens/closes, title, size variants, Escape close, overlay click close, focus trap, responsive full-screen
  - [ ] Verify AlertDialog: opens/closes, destructive action button, no click-outside dismiss, Escape routes through onCancel
  - [ ] Verify DropdownMenu: opens/closes, keyboard navigation, item selection, destructive items, groups, separators
  - [ ] Verify Popover: opens/closes, anchor positioning, Escape close, click-outside close
  - [ ] Verify dual-theme: all new components render correctly in light and dark themes
  - [ ] Verify prop budget: Modal <=12, AlertDialog <=12, DropdownMenu <=20, Popover <=20
  - [ ] Verify zero external margin on all new components
  - [ ] Verify all existing Story 3-1 through 3-7 tests still pass unchanged
  - [ ] **Story is DONE when all of the above pass.**

## Dev Notes

### Prerequisites — Stories 3-1 Through 3-7 Must Be Complete

Story 3-8 uses existing components and tokens. Verify before starting:

**Required from Story 3-1 (layout):** `Stack`, `Inline`, `Divider` in `packages/ui/src/components/layout/`
**Required from Story 3-2 (interactive):** `Button` in `packages/ui/src/components/forms/`
**Required from Story 3-2 (overlay):** `Tooltip` in `packages/ui/src/components/overlay/`
**Required from Story 3-3 (feedback):** `Skeleton`, `ErrorDisplay` in `packages/ui/src/components/feedback/`
**Required from Tokens:** `z-index.css` (--z-dropdown, --z-popover, --z-modal), `interactive.css` (--shadow-popover, motion tokens), `motion.css`, `colors.css`

**Check for Story 3-7 Popover usage:** If Story 3-7 (DatePicker) created an internal Popover wrapper, verify it doesn't conflict with the public `<Popover>` component created here. If DatePicker imports `@radix-ui/react-popover` directly (not via a shared wrapper), there's no conflict.

If any prerequisite is missing, STOP and report.

### Architecture Constraints — MUST Follow

1. **CSS Modules + @layer:** All new styles MUST be in CSS Modules (`.module.css`) wrapped in `@layer components { }`. Use design token CSS custom properties exclusively — zero hardcoded values. [Source: architecture.md#Styling Solution]

2. **Zero external margin:** All new components have zero external margin. Spacing controlled by parent containers via `gap`. [Source: UX spec#Margin-Free Components]

3. **CSS class names:** camelCase for CSS Module class names. [Source: architecture.md#CSS class names]

4. **Prop naming:** Event handlers: `on` + PascalCase verb (`onClose`, `onAction`, `onOpenChange`). Boolean props: no prefix for feature flags (`open`, `disabled`). [Source: architecture.md#Code Naming]

5. **Package dependency rules:** `@hexalith/ui` may import from: React, @radix-ui/*. MUST NOT import from `@hexalith/cqrs-client`. All components are data-agnostic. [Source: architecture.md#Package Dependency Rules]

6. **Third-party type re-export policy:** Do NOT re-export Radix types. Define own types (`ModalProps`, `AlertDialogProps`, `DropdownMenuProps`, `PopoverProps`, `DropdownMenuItem`, etc.). [Source: architecture.md#Third-Party Type Re-Export Policy]

7. **Radix animation ownership:** `@hexalith/ui` owns ALL motion. Radix built-in animations are disabled via `forceMount` + custom CSS transitions using motion tokens. Radix owns zero motion. [Source: UX spec#Radix Animation Ownership]

8. **Single active focus trap rule:** Only one focus trap is active at any time. Modals take focus ownership from the page. Closing returns focus to trigger element. [Source: UX spec#Focus Management]

9. **Focus management:** `focus-visible` produces a 2px solid `--color-focus-ring` with 2px offset. Never suppressed. Tab order matches visual order. [Source: UX spec#Focus Management]

10. **Z-index token scale:** `--z-dropdown: 100`, `--z-popover: 200`, `--z-modal: 300`, `--z-toast: 400`. Use these tokens exclusively — never hardcode z-index values. [Source: UX spec#Z-index token scale]

11. **API Abstraction Rule:** Every prop must be in domain terms, not Radix implementation details. Wrap Radix props like `onOpenAutoFocus` as semantic alternatives if needed. Never expose Radix-specific APIs. [Source: UX spec#API Abstraction Rule]

### New Dependencies Required

| Package | Type | Purpose | Version |
|---------|------|---------|---------|
| `@radix-ui/react-dialog` | dependency | Modal primitive | ^1.x (match existing Radix pattern) |
| `@radix-ui/react-alert-dialog` | dependency | AlertDialog primitive | ^1.x |
| `@radix-ui/react-dropdown-menu` | dependency | DropdownMenu primitive | ^1.x |
| `@radix-ui/react-popover` | dependency | Popover primitive | ^1.x (may already exist from Story 3-7) |

### New Design Tokens Required

| Token | Light Value | Dark Value | Purpose |
|-------|-----------|-----------|---------|
| `--color-shadow-modal` | `rgba(0, 0, 0, 0.12)` | `rgba(0, 0, 0, 0.4)` | Shadow color for modal elevation |
| `--shadow-modal` | `0 8px 24px var(--color-shadow-modal)` | `0 8px 24px var(--color-shadow-modal)` | High elevation shadow for Modal/AlertDialog |
| `--color-overlay-backdrop` | `rgba(0, 0, 0, 0.4)` | `rgba(0, 0, 0, 0.6)` | Semi-transparent backdrop behind modals |
| `--radius-sm` | `4px` | `4px` | Small radius — menu items, badges (new file: `radius.css`) |
| `--radius-md` | `6px` | `6px` | Default component radius — buttons, inputs (new file: `radius.css`) |
| `--radius-lg` | `8px` | `8px` | Large radius — modals, popovers, elevated surfaces (new file: `radius.css`) |

**Existing tokens to reuse:**
- `--shadow-popover` for DropdownMenu and Popover content (already defined in `interactive.css`)
- `--z-dropdown`, `--z-popover`, `--z-modal` (already defined in `z-index.css`)
- `--motion-scale-overlay` (already defined in `interactive.css` as 0.96)
- `--transition-duration-default` (200ms in `motion.css`)
- `--color-surface-elevated` (already defined in `colors.css`)

### Component API Specifications

#### Modal

```tsx
interface ModalProps {
  /** Whether modal is open — controlled */
  open: boolean;
  /** Called when user closes (Escape, backdrop click, close button) */
  onClose: () => void;
  /** Dialog title — rendered as accessible heading */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Modal body content */
  children: React.ReactNode;
  /** Size preset — affects max-width */
  size?: 'small' | 'medium' | 'large';
  /** Accessible label for close button */
  closeLabel?: string;
  className?: string;
}
```

**Sizing:**
| Size | Max Width | Use Case |
|------|-----------|----------|
| `small` | 480px | Simple confirmations, short forms |
| `medium` | 640px | Standard forms, detail views |
| `large` | 800px | Complex content, tables within modals |

**Responsive behavior:** Below `--breakpoint-md` (1024px), modal goes full-screen: `width: 100%; height: 100%; max-width: none; max-height: 100vh; border-radius: 0;` Close button remains prominent with minimum 44x44px touch target.

**Close button inline SVG:**
```tsx
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
```

#### AlertDialog

```tsx
interface AlertDialogProps {
  /** Whether dialog is open — controlled */
  open: boolean;
  /** Called when user confirms the destructive action */
  onAction: () => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Dialog title */
  title: string;
  /** Required explanation of the destructive action */
  description: string;
  /** Label for destructive action button */
  actionLabel?: string;
  /** Label for cancel button */
  cancelLabel?: string;
  className?: string;
}
```

**Key behavioral differences from Modal:**
- No click-outside dismiss (Radix AlertDialog default)
- Escape routes through `onCancel()` — same as clicking Cancel. WCAG 2.1 SC 2.1.2 requires dialogs to be keyboard-dismissible. Escape IS an explicit user action.
- Always small size (max-width 480px)
- Always has two explicit action buttons
- Action button uses danger styling (`--color-status-danger`)

**Button styling for destructive action:**
The existing Button component does NOT have a `variant="danger"` prop. Do NOT modify Button.tsx. Instead, render `AlertDialog.Action` with `asChild` wrapping a `<button>` element (not the `<Button>` component) styled via a CSS class in AlertDialog.module.css. This avoids coupling AlertDialog to Button's internal DOM structure:
```tsx
<AlertDialog.Action asChild>
  <button className={styles.actionButton} type="button">
    {actionLabel}
  </button>
</AlertDialog.Action>
```
```css
.actionButton {
  background-color: var(--color-status-danger);
  color: var(--color-text-on-accent);
  border: none;
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}
.actionButton:hover {
  filter: brightness(0.9);
}
.actionButton:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```
For the cancel button, use `AlertDialog.Cancel` with `asChild` wrapping the existing `<Button>` component (which has the standard neutral styling).

**Why the asymmetry?** Cancel uses `<Button>` because it needs the standard neutral appearance that Button already provides. Action uses a raw `<button>` because it needs danger styling (`--color-status-danger` background) that Button doesn't support — and modifying Button.tsx to add `variant="danger"` is out of scope for this story. The raw `<button>` gets its styling entirely from AlertDialog's CSS module.

#### DropdownMenu

```tsx
interface DropdownMenuItem {
  /** Menu item label */
  label: string;
  /** Called when item is selected — optional when item has submenu */
  onSelect?: () => void;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Destructive action styling (red text) */
  destructive?: boolean;
  /** Nested submenu items — renders as Radix DropdownMenu.Sub (1 level max for MVP) */
  submenu?: Array<DropdownMenuItem | DropdownMenuSeparator>;
}

interface DropdownMenuSeparator {
  type: 'separator';
}

interface DropdownMenuGroup {
  /** Optional group label */
  label?: string;
  /** Items within the group */
  items: Array<DropdownMenuItem | DropdownMenuSeparator>;
}

type DropdownMenuItemType = DropdownMenuItem | DropdownMenuSeparator | DropdownMenuGroup;

interface DropdownMenuProps {
  /** Trigger element — must accept ref */
  trigger: React.ReactElement;
  /** Menu items — flat items, separators, or groups */
  items: Array<DropdownMenuItemType>;
  /** Alignment relative to trigger */
  align?: 'start' | 'center' | 'end';
  /** Side to open on */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Controlled open state */
  open?: boolean;
  /** Controlled callback */
  onOpenChange?: (open: boolean) => void;
  /** Offset from trigger — default 4 */
  sideOffset?: number;
  className?: string;
}
```

**Type guards for rendering:**
```tsx
function isSeparator(item: DropdownMenuItemType): item is DropdownMenuSeparator {
  return 'type' in item && item.type === 'separator';
}

function isGroup(item: DropdownMenuItemType): item is DropdownMenuGroup {
  return 'items' in item;
}
```

#### Popover

```tsx
interface PopoverProps {
  /** Trigger element — must accept ref */
  trigger: React.ReactElement;
  /** Popover content */
  children: React.ReactNode;
  /** Alignment relative to trigger */
  align?: 'start' | 'center' | 'end';
  /** Side to open on */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Controlled open state */
  open?: boolean;
  /** Controlled callback */
  onOpenChange?: (open: boolean) => void;
  /** Offset from trigger */
  sideOffset?: number;
  className?: string;
}
```

### Animation Pattern — CRITICAL

**All overlay components must follow this animation pattern:**

The Tooltip component (`packages/ui/src/components/overlay/Tooltip.tsx`) is the canonical example for overlay animation. It uses:
- CSS `animation-name` triggered by Radix `data-state` attribute
- `@keyframes` for open/close transitions using `opacity` + `transform: scale(var(--motion-scale-overlay))`
- `--transition-duration-fast` for animation duration
- `@media (prefers-reduced-motion: reduce)` to disable animations

**Modal/AlertDialog use a different approach** because they need `forceMount`:
- **WHY `forceMount` requires transitions instead of keyframes:** Without `forceMount`, Radix mounts/unmounts DOM elements — CSS `@keyframes` animations trigger on mount/unmount. With `forceMount`, elements stay in the DOM permanently; Radix only toggles `data-state`. Since the element never mounts/unmounts, `@keyframes` won't re-trigger. CSS `transition` on property changes (opacity, transform) is the correct mechanism because it reacts to the `data-state` attribute change.
- Use CSS `transition` (not `animation-name`) on `.overlay` and `.content` elements
- Transition properties: `opacity`, `transform`
- Use `pointer-events: none` when `data-state="closed"` to prevent interaction with hidden content
- The component stays mounted — CSS handles visibility

**Initial mount behavior (Modal/AlertDialog):** If a Modal is rendered with `open={true}` on first mount, there is no closed→open transition — the modal appears immediately without animation. This is correct and expected. Do NOT add mount-triggered animations to compensate — it would break the `forceMount` + CSS transition model.

**DropdownMenu/Popover** use the Tooltip animation pattern (keyframes + `data-state`) since they don't need `forceMount`:
- **WHY no `forceMount` needed:** DropdownMenu and Popover content can mount/unmount freely — there's no backdrop overlay that needs to persist. Radix handles mount/unmount transitions natively with `data-state`, and CSS `@keyframes` trigger correctly on each mount.
- **Provider difference:** Tooltip uses `RadixTooltip.Provider` wrapping the entire component. DropdownMenu and Popover do NOT have an equivalent Provider component — they start directly with `Root`. Do not look for or create a Provider wrapper for these components.

### Design Token References

**Z-index scale (all defined in `z-index.css`):**
| Token | Value | Components |
|-------|-------|-----------|
| `--z-dropdown` | 100 | DropdownMenu |
| `--z-popover` | 200 | Popover (and Tooltip already uses this) |
| `--z-modal` | 300 | Modal, AlertDialog (both overlay + content) |
| `--z-toast` | 400 | Toast (existing, for reference) |

**Toast + Modal interaction:** Toast (z-index 400) renders above Modal (300) visually. Radix Toast renders in its own viewport region (typically top-right corner) via its own Portal, independent of Modal's focus trap. Toast dismiss buttons are accessible because Toast uses `role="status"` with `aria-live`, which screen readers announce regardless of focus trap. No special handling needed — the z-index hierarchy ensures correct visual stacking. If a dev triggers a Toast from within a Modal, it will appear above the Modal correctly.

**Surface & shadow tokens:**
- `--color-surface-elevated` — background for all overlay content
- `--shadow-popover` — elevation for DropdownMenu, Popover
- `--shadow-modal` — elevation for Modal, AlertDialog (NEW — must create)
- `--color-overlay-backdrop` — semi-transparent backdrop for Modal/AlertDialog (NEW — must create)

**Motion tokens:**
- `--transition-duration-default` (200ms) — overlay open/close transitions
- `--transition-duration-fast` (100ms) — used by Tooltip animations
- `--transition-easing-default` (ease-out) — easing curve
- `--motion-scale-overlay` (0.96) — scale factor for open/close
- `--motion-translate-overlay-y` (2px) — vertical offset for dropdown/popover animations

**Typography:**
- Modal title: `--font-size-lg`, `--font-weight-semibold`, `--color-text-primary`
- Modal description: `--font-size-sm`, `--color-text-secondary`
- AlertDialog description: `--font-size-base`, `--color-text-secondary`
- DropdownMenu item: `--font-size-sm`, `--color-text-primary`
- DropdownMenu group label: `--font-size-xs`, `--font-weight-medium`, `--color-text-tertiary`

**Border & radius (NEW tokens created in Task 2):**
- Overlay content (Modal, AlertDialog, Popover, DropdownMenu): `border-radius: var(--radius-lg)` (8px)
- DropdownMenu items: `border-radius: var(--radius-sm)` (4px)
- Overlay border: `1px solid var(--color-border-default)` for dropdowns/popovers (modals use shadow only, no border)

**Color tokens for destructive elements:**
- `--color-status-danger` — red color for destructive actions
- `--color-text-on-accent` — white text on colored backgrounds

### Testing Approach

Co-located Vitest tests using `@testing-library/react`, `@testing-library/jest-dom`, and `@testing-library/user-event`.

**Modal testing pattern:**
```tsx
// Open modal
render(<Modal open={true} onClose={mockClose} title="Test">Content</Modal>);
expect(screen.getByRole('dialog')).toBeInTheDocument();
expect(screen.getByText('Test')).toBeInTheDocument();

// Escape closes
await user.keyboard('{Escape}');
expect(mockClose).toHaveBeenCalled();

// Backdrop click closes
// Find overlay element and click it
```

**AlertDialog testing pattern:**
```tsx
render(
  <AlertDialog open={true} onAction={mockAction} onCancel={mockCancel}
    title="Delete?" description="This cannot be undone." />
);
// Click cancel
await user.click(screen.getByText('Cancel'));
expect(mockCancel).toHaveBeenCalled();

// Click destructive action
await user.click(screen.getByText('Delete'));
expect(mockAction).toHaveBeenCalled();
```

**DropdownMenu testing pattern:**
```tsx
render(
  <DropdownMenu
    trigger={<button>Actions</button>}
    items={[
      { label: 'Edit', onSelect: mockEdit },
      { type: 'separator' },
      { label: 'Delete', onSelect: mockDelete, destructive: true },
    ]}
  />
);
// Open menu
await user.click(screen.getByText('Actions'));
// Select item
await user.click(screen.getByText('Edit'));
expect(mockEdit).toHaveBeenCalled();
```

**Overlay composition tests (add to Modal.test.tsx):**
```tsx
// AlertDialog inside Modal — verify focus stacking
render(
  <Modal open={true} onClose={mockClose} title="Edit">
    <AlertDialog open={true} onAction={mockAction} onCancel={mockCancel}
      title="Delete?" description="This cannot be undone." />
  </Modal>
);
// AlertDialog should have focus, not Modal
expect(screen.getByText('Delete?')).toBeInTheDocument();
await user.click(screen.getByText('Cancel'));
expect(mockCancel).toHaveBeenCalled();
// Modal should still be open after AlertDialog closes
expect(screen.getByText('Edit')).toBeInTheDocument();
```

```tsx
// DropdownMenu inside Modal — verify Escape only closes menu, not Modal
render(
  <Modal open={true} onClose={mockClose} title="Edit">
    <DropdownMenu trigger={<button>Actions</button>}
      items={[{ label: 'Delete', onSelect: mockDelete }]} />
  </Modal>
);
await user.click(screen.getByText('Actions'));
await user.keyboard('{Escape}');
// Menu should close, Modal should remain open
expect(mockClose).not.toHaveBeenCalled();
```

**Do NOT test:**
- Visual appearance (Storybook visual tests in Story 3-9)
- Full Radix internals (trust the library for focus trapping, ARIA, keyboard navigation)
- Theme switching (token compliance scanner handles this)

### Project Structure Notes

```
packages/ui/src/
├── index.ts                          # Update: add new overlay exports
├── tokens/
│   ├── interactive.css               # Update: add --shadow-modal, --color-shadow-modal
│   ├── colors.css                    # Update: add --color-overlay-backdrop
│   ├── radius.css                    # NEW: --radius-sm, --radius-md, --radius-lg
│   └── z-index.css                   # Existing — DO NOT modify
├── components/
│   ├── overlay/
│   │   ├── Tooltip.tsx               # Existing — DO NOT modify
│   │   ├── Tooltip.module.css        # Existing — DO NOT modify
│   │   ├── Tooltip.test.tsx          # Existing — DO NOT modify
│   │   ├── Modal/                    # NEW
│   │   │   ├── index.ts
│   │   │   ├── Modal.tsx
│   │   │   ├── Modal.module.css
│   │   │   └── Modal.test.tsx
│   │   ├── AlertDialog/              # NEW
│   │   │   ├── index.ts
│   │   │   ├── AlertDialog.tsx
│   │   │   ├── AlertDialog.module.css
│   │   │   └── AlertDialog.test.tsx
│   │   ├── DropdownMenu/            # NEW
│   │   │   ├── index.ts
│   │   │   ├── DropdownMenu.tsx
│   │   │   ├── DropdownMenu.module.css
│   │   │   └── DropdownMenu.test.tsx
│   │   └── Popover/                  # NEW
│   │       ├── index.ts
│   │       ├── Popover.tsx
│   │       ├── Popover.module.css
│   │       └── Popover.test.tsx
│   ├── layout/                       # Existing — DO NOT modify
│   ├── forms/                        # Existing — DO NOT modify
│   ├── feedback/                     # Existing — DO NOT modify
│   ├── navigation/                   # Existing — DO NOT modify
│   └── data-display/                 # Existing — DO NOT modify
```

### Precedent Patterns from Existing Components — MUST Follow

1. **Tooltip.tsx is the overlay pattern reference:** Follow the exact Radix wrapping pattern — import `* as RadixX`, wrap in semantic API, use `clsx` for className merging, set `displayName`.

2. **Select.tsx is the complex Radix wrapping reference:** Shows how to wrap Radix with custom types, handle `forwardRef`, generate IDs with `useId()`, manage Portal, and structure the component.

3. **Radix `asChild` pattern:** `asChild` tells Radix to merge its behavior (event handlers, refs, ARIA attributes) onto the child element instead of rendering its own wrapper DOM node. When you write `<Trigger asChild><button>Open</button></Trigger>`, Radix attaches to your `<button>` directly. This is used on: DropdownMenu/Popover triggers, AlertDialog.Cancel (wrapping `<Button>`), and AlertDialog.Action (wrapping raw `<button>`).

4. **forwardRef pattern:** All components that wrap a triggerable element should forward ref to the trigger. For Modal/AlertDialog this is less critical (no external trigger), but DropdownMenu/Popover triggers must forward ref correctly via `asChild`.

4. **CSS Module import order:** CSS module imports BEFORE sibling component imports per ESLint `import-x/order`.

5. **clsx for className merging:** `import clsx from 'clsx'` — standard across all components.

6. **data-* attributes for variants:** Use `data-size` for Modal size variants, `data-destructive` for destructive menu items. NOT className-based variants.

7. **Display name:** Every component sets `Component.displayName = 'ComponentName'`.

8. **Token compliance:** 100% token compliance. No hardcoded colors, sizes, or spacing.

9. **@layer components:** All CSS wrapped in `@layer components { }`.

10. **prefers-reduced-motion:** All transitions wrapped with `@media (prefers-reduced-motion: reduce) { ... }` — collapse durations to 0ms.

11. **`:global()` not expected:** Radix overlay primitives use `data-*` attributes (e.g., `data-state`, `data-highlighted`, `data-disabled`) for state styling — not CSS classes. CSS Module attribute selectors (`.item[data-highlighted]`) work without `:global()`. Only use `:global()` if Radix injects class-based styling that CSS Modules can't reach, which is not expected for Dialog, AlertDialog, DropdownMenu, or Popover.

### Anti-Patterns to Avoid

- **DO NOT use `forceMount` on DropdownMenu or Popover.** `forceMount` is only for Modal and AlertDialog (which need persistent DOM for backdrop + CSS transitions). DropdownMenu and Popover mount/unmount naturally — use CSS `@keyframes` animations triggered by `data-state`, not CSS `transition`. Using `forceMount` on these components would break their animation model, bloat the DOM, and cause `@keyframes` to not trigger.
- **DO NOT re-export Radix types.** Define own `ModalProps`, `DropdownMenuProps`, etc. No `Dialog.DialogProps`, `DropdownMenuContentProps` in public API.
- **DO NOT use Radix built-in animations.** Use `forceMount` on Modal/AlertDialog portals to take full animation control. For DropdownMenu/Popover, use CSS keyframes triggered by `data-state`.
- **DO NOT modify existing components** from Stories 3-1 through 3-7. AlertDialog uses a raw `<button>` element for the destructive action (styled via its own CSS module), not the existing `<Button>` component. Do NOT change Button.tsx.
- **DO NOT use inline styles** except the CSS custom property pattern (like Tooltip's z-index).
- **DO NOT add hardcoded colors/sizes.** All values from design tokens.
- **DO NOT implement sub-menus in DropdownMenu** beyond what Radix provides natively. The AC says "submenus are supported" — Radix handles this with DropdownMenu.Sub, DropdownMenu.SubTrigger, DropdownMenu.SubContent. Expose this capability but don't over-engineer the API.
- **DO NOT create a Sheet/Drawer component.** The architecture lists "Drawer" in the overlay category, but the epics for Story 3.8 specifically scope to Modal, AlertDialog, DropdownMenu, and Popover only. Drawer is Phase 2.
- **DO NOT add scroll lock manually.** Radix Dialog and AlertDialog handle scroll lock on `<body>` automatically.
- **DO NOT implement nested Modal-in-Modal.** Two `<Modal>` components should never be open simultaneously. However, **AlertDialog-from-Modal IS a valid and supported pattern** (e.g., confirm delete while editing in a modal). Radix handles focus stacking natively: AlertDialog takes focus, Modal stays mounted underneath. When AlertDialog closes, focus returns to the Modal. Do not prevent or special-case this interaction.
- **DO NOT use `any` type.** All new props, state, and contexts properly typed.

### Previous Story Intelligence (Story 3-7)

**Key learnings from Story 3-7:**
- React Hook Form + Radix Popover integration for DatePicker establishes the pattern for Radix Popover wrapping. If `@radix-ui/react-popover` was already added in Story 3-7, reuse it.
- forwardRef is mandatory for all interactive components that connect to form state. Same applies to overlay triggers.
- CSS Module `:global()` may be needed if Radix injects classes that need style overrides (seen in Table story).
- Token compliance 100% maintained across all stories — maintain this standard.

**Key learnings from Story 3-2 (Select + Tooltip):**
- Select wraps `@radix-ui/react-select` with `* as RadixSelect` import pattern — follow this for all Radix wrapping.
- Select uses `Portal` for content — all overlays should portal to prevent z-index conflicts.
- Select uses `position="popper"` + `sideOffset={4}` — similar offset pattern for dropdowns.
- Tooltip shows the animation pattern with `data-state` and CSS keyframes.

### Git Intelligence from Recent Work

Recent commits confirm Epic 3 is actively being implemented:
- `9a1b728` — Story 3-5: Table component with sorting, pagination, loading states
- `0167813` — Story 3-4: Sidebar and Tabs components
- `8872465` — Story 3-3: ErrorBoundary, ErrorDisplay, Skeleton, Toast
- `9112b0b` — Story 3-2: Button, Input, Select, Tooltip

Story 3-7 (Form & DetailView) is `in-progress`. Story 3-6 (Table advanced) is in `review`. Both should be complete before Story 3-8 begins.

### Downstream Dependencies

- **Story 3-9 (Storybook):** Will add stories for ALL Story 3-8 components under the "Overlay" category. Storybook sidebar convention: `@hexalith/ui/Overlay/Modal`, `@hexalith/ui/Overlay/AlertDialog`, etc.
- **Epic 4 (Module Scaffold):** The scaffold's example code uses `<Modal>` for delete confirmation dialogs. This component must be complete before Epic 4.
- **Epic 6 (Tenants Reference Module):** Uses AlertDialog for tenant deletion confirmations, DropdownMenu for row actions in tenant table.
- **Phase 2 — Sheet/Drawer component:** Modal's full-screen responsive mode and `forceMount` + CSS transition architecture are the foundation for a future `<Sheet>` component (slide-over panel from left/right/bottom). Phase 2 could extend this pattern with a `side` prop instead of centered positioning.
- **Phase 2 — AlertDialog `loading` prop:** Async destructive actions (delete tenant, revoke access) need a loading state on the action button while the API call executes. Add `loading?: boolean` prop that disables both buttons and shows a spinner on the action button. Not needed for MVP but will be requested as soon as real CQRS commands are wired up in Epic 6.

### Discrepancies Between Source Documents

1. **Architecture vs Epics — component naming:** Architecture lists "Dialog, Drawer, Popover, Tooltip" in the Overlay category. Epics map this to "Modal, AlertDialog, DropdownMenu, Popover". The Radix `Dialog` primitive maps to `<Modal>` (user-facing name). This story follows the epics naming which is more prescriptive.

2. **Architecture vs Epics — Drawer:** Architecture lists Drawer but the epics scope Story 3.8 to Modal, AlertDialog, DropdownMenu, Popover only. Drawer is not in scope. Architecture's Drawer maps to a Phase 2 component.

3. **Radius tokens:** UX spec defines `--radius-sm`, `--radius-md`, `--radius-lg` but these tokens did not exist prior to this story. Task 2 creates them in a new `radius.css` file. New overlay components use semantic radius tokens (`--radius-lg` for elevated surfaces, `--radius-sm` for menu items). Existing components still use `var(--spacing-1)` — retroactive migration is a separate refactor.

4. **Shadow tokens:** UX spec defines `--shadow-md` and `--shadow-lg` but the codebase uses semantic names (`--shadow-popover`, `--shadow-tooltip`). This story adds `--shadow-modal` following the semantic naming pattern.

5. **Popover in both Story 3-7 and 3-8:** `@radix-ui/react-popover` may be added by Story 3-7 (DatePicker) or Story 3-8 (Popover component). Check `package.json` before adding.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.8] — acceptance criteria and story definition
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Approach] — Radix wrapping strategy, primitive mapping table
- [Source: _bmad-output/planning-artifacts/architecture.md#Package Dependency Rules] — @hexalith/ui allowed imports
- [Source: _bmad-output/planning-artifacts/architecture.md#Third-Party Type Re-Export Policy] — define own types
- [Source: _bmad-output/planning-artifacts/architecture.md#Component File Organization] — folder structure for complex components
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Z-index token scale] — z-index hierarchy
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Focus Management] — focus trapping, single active trap rule
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Radix Animation Ownership] — forceMount + custom CSS transitions
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Complexity Classification] — Modal/AlertDialog <=12, DropdownMenu/Popover <=20
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Margin-Free Components] — zero external margin
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#CSS Layer Cascade Order] — @layer enforcement
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Modal content layout grid] — 480px/640px/800px sizing
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive breakpoints] — Modal full-screen below --breakpoint-md
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Shadow/Elevation System] — shadow tokens for elevation levels
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Border Radius] — radius token scale
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Emotional Registers] — urgent register for destructive actions
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Motion Accessibility] — prefers-reduced-motion
- [Source: packages/ui/src/components/overlay/Tooltip.tsx] — canonical Radix overlay wrapping pattern
- [Source: packages/ui/src/components/forms/Select.tsx] — complex Radix wrapping reference

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Change Log

### File List

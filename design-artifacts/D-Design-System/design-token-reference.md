# Hexalith Design System — Token Reference

This is the complete catalog of design tokens available to module creators. All values are CSS custom properties enforced by Stylelint — hardcoded colors, spacing, or typography will fail CI.

**Source files:** `packages/ui/src/tokens/`

---

## Architecture

Tokens follow a **2-tier system:**

| Tier | Purpose | Naming | Example |
|------|---------|--------|---------|
| **Tier 1 (Primitive)** | Raw values, theme-independent | `--primitive-*` | `--primitive-color-gray-900` |
| **Tier 2 (Semantic)** | Context-aware, theme-responsive | `--color-*`, `--spacing-*`, etc. | `--color-text-primary` |

**Rule:** Module CSS must only use **Tier 2 (semantic) tokens**. Never reference `--primitive-*` tokens directly.

---

## Colors

### Text

| Token | Light | Dark | Use For |
|-------|-------|------|---------|
| `--color-text-primary` | `#1E1D19` | `#E8E6E1` | Headings, body text, labels |
| `--color-text-secondary` | `#4D4A42` | `#B0ADA3` | Supporting text, descriptions |
| `--color-text-tertiary` | `#6B685E` | `#8C897E` | Captions, timestamps, metadata |
| `--color-text-disabled` | `#8C897E` | `#6B685E` | Disabled controls |
| `--color-text-on-accent` | `#FFFFFF` | `#1E1D19` | Text on accent-colored backgrounds |

### Surfaces

| Token | Light | Dark | Use For |
|-------|-------|------|---------|
| `--color-surface-primary` | `#FAF9F7` | `#1E1D19` | Page background |
| `--color-surface-secondary` | `#F3F2EE` | `#33312B` | Sidebar, cards, sections |
| `--color-surface-elevated` | `#FFFFFF` | `#3E3C35` | Modals, popovers, dropdowns |

### Borders

| Token | Light | Dark | Use For |
|-------|-------|------|---------|
| `--color-border-default` | `#D5D3CB` | `#4D4A42` | Standard borders |
| `--color-border-strong` | `#B0ADA3` | `#6B685E` | Emphasized borders |
| `--color-border-subtle` | `#E8E6E1` | `#33312B` | Light dividers |

### Accent (Interactive)

| Token | Light | Dark | Use For |
|-------|-------|------|---------|
| `--color-accent` | `#5B6AD0` | `#7B85E8` | Primary buttons, links, active states |
| `--color-accent-subtle` | `#ECEEFF` | `#1F2552` | Hover backgrounds, selected rows |
| `--color-accent-hover` | `#4A57B5` | `#8D96F0` | Hover state for accent elements |
| `--color-accent-active` | `#3B4594` | `#B3BAFF` | Active/pressed state |

### Status

| Token | Light | Dark | Use For |
|-------|-------|------|---------|
| `--color-status-success` | `#2D8F3F` | `#4BBF64` | Confirmed, completed, active |
| `--color-status-warning` | `#B87D00` | `#F0B429` | Pending, attention needed |
| `--color-status-danger` | `#DC3545` | `#E8616D` | Errors, cancelled, destructive |
| `--color-status-info` | `#2B7DE9` | `#5196EE` | Informational, draft |

### Focus & Overlay

| Token | Light | Dark | Use For |
|-------|-------|------|---------|
| `--color-focus-ring` | `#5B6AD0` | `#7B85E8` | Focus indicators on interactive elements |
| `--color-overlay-backdrop` | `rgba(0,0,0,0.4)` | `rgba(0,0,0,0.6)` | Modal/dialog backdrops |

### Data Visualization

Color-blind safe palette (Tol's vibrant qualitative):

| Token | Light | Dark |
|-------|-------|------|
| `--color-data-1` | `#4477AA` | `#5588BB` |
| `--color-data-2` | `#66CCEE` | `#77DDEE` |
| `--color-data-3` | `#228833` | `#33AA44` |
| `--color-data-4` | `#CCBB44` | `#DDCC55` |
| `--color-data-5` | `#EE6677` | `#FF7788` |
| `--color-data-6` | `#AA3377` | `#CC4499` |
| `--color-data-7` | `#EE8866` | `#FF9977` |
| `--color-data-8` | `#BBBBBB` | `#CCCCCC` |

---

## Spacing

4px grid, 8px preferred rhythm unit.

| Token | Value | Pixels | Common Use |
|-------|-------|--------|------------|
| `--spacing-0` | `0` | 0 | No spacing |
| `--spacing-1` | `0.25rem` | 4px | Badge padding, tight gaps |
| `--spacing-2` | `0.5rem` | 8px | Button groups, inline gaps |
| `--spacing-3` | `0.75rem` | 12px | Form field internal spacing |
| `--spacing-4` | `1rem` | 16px | Default element spacing |
| `--spacing-5` | `1.5rem` | 24px | Section spacing, page padding |
| `--spacing-6` | `2rem` | 32px | Major section divisions |
| `--spacing-7` | `3rem` | 48px | Large vertical gaps |
| `--spacing-8` | `4rem` | 64px | Hero/header spacing |

### Density-Aware Tokens

| Token | Comfortable | Compact | Use For |
|-------|-------------|---------|---------|
| `--spacing-cell` | 12px | 8px | Table cell padding |
| `--spacing-field-gap` | 12px | 8px | Gap between form fields |
| `--spacing-section` | 24px | 16px | Gap between page sections |

Activate compact mode: `<div data-density="compact">...</div>`

---

## Typography

Typefaces: **Inter** (sans-serif) + **JetBrains Mono** (monospace)
Scale: Major Third ratio (1.250) from 1rem base.

### Font Families

| Token | Value |
|-------|-------|
| `--font-family-sans` | `"Inter", system-ui, -apple-system, sans-serif` |
| `--font-family-mono` | `"JetBrains Mono", ui-monospace, "Cascadia Code", monospace` |

### Font Sizes

| Token | Value | Pixels | Use For |
|-------|-------|--------|---------|
| `--font-size-xs` | `0.64rem` | ~10px | Micro labels, footnotes |
| `--font-size-sm` | `0.8rem` | ~13px | Status badges, table cells, captions |
| `--font-size-body` | `1rem` | 16px | Body text, form labels, default |
| `--font-size-md` | `1.25rem` | 20px | Subheadings, section titles |
| `--font-size-lg` | `1.563rem` | 25px | Page subtitles |
| `--font-size-xl` | `1.953rem` | 31px | Page titles |
| `--font-size-2xl` | `2.441rem` | 39px | Hero headings |

### Font Weights

| Token | Value | Use For |
|-------|-------|---------|
| `--font-weight-regular` | 400 | Body text |
| `--font-weight-medium` | 500 | Labels, table headers |
| `--font-weight-semibold` | 600 | Subheadings, buttons |
| `--font-weight-bold` | 700 | Page titles, emphasis |

### Line Heights

| Token | Value | Use For |
|-------|-------|---------|
| `--line-height-tight` | 1.2 | Headings, titles |
| `--line-height-normal` | 1.5 | Body text, default |
| `--line-height-relaxed` | 1.75 | Long-form reading |
| `--line-height-table` | 1.3 | Table cell content |

---

## Motion

Default: 200ms ease-out. Input acknowledgment: ≤100ms.

| Token | Value | Use For |
|-------|-------|---------|
| `--transition-duration-fast` | `100ms` | Button press, checkbox toggle |
| `--transition-duration-default` | `200ms` | Sidebar collapse, fade transitions |
| `--transition-easing-default` | `ease-out` | All transitions |

**Reduced motion:** Both duration tokens become `0ms` when `prefers-reduced-motion: reduce` is active.

---

## Border Radius

| Token | Value | Use For |
|-------|-------|---------|
| `--radius-sm` | `4px` | Badges, tags, status indicators |
| `--radius-md` | `6px` | Buttons, inputs, selects |
| `--radius-lg` | `8px` | Modals, popovers, cards |

---

## Z-Index

Overlay stacking order:

| Token | Value | Use For |
|-------|-------|---------|
| `--z-dropdown` | `100` | Dropdown menus, select popovers |
| `--z-popover` | `200` | Popovers, date pickers |
| `--z-modal` | `300` | Modals, alert dialogs |
| `--z-toast` | `400` | Toast notifications |

---

## Shadows (Interactive)

| Token | Light | Dark | Use For |
|-------|-------|------|---------|
| `--shadow-popover` | `0 4px 16px rgba(0,0,0,0.12)` | `0 4px 16px rgba(0,0,0,0.3)` | Dropdown menus, popovers |
| `--shadow-tooltip` | `0 2px 8px rgba(0,0,0,0.12)` | `0 2px 8px rgba(0,0,0,0.3)` | Tooltips |
| `--shadow-modal` | `0 8px 24px rgba(0,0,0,0.12)` | `0 8px 24px rgba(0,0,0,0.4)` | Modals, dialogs |

---

## Theme Switching

Themes are activated by setting `data-theme` on the root element:

```html
<html data-theme="light">  <!-- Default -->
<html data-theme="dark">
```

All semantic tokens automatically resolve to the correct values. Module CSS doesn't need any theme-specific logic.

---

## Quick Reference: CSS Usage

```css
/* Colors */
color: var(--color-text-primary);
background: var(--color-surface-primary);
border: 1px solid var(--color-border-default);

/* Spacing */
padding: var(--spacing-4);
gap: var(--spacing-2);
margin-block-end: var(--spacing-5);

/* Typography */
font-family: var(--font-family-sans);
font-size: var(--font-size-sm);
font-weight: var(--font-weight-medium);
line-height: var(--line-height-normal);

/* Borders */
border-radius: var(--radius-md);

/* Motion */
transition: opacity var(--transition-duration-default) var(--transition-easing-default);

/* Elevation */
z-index: var(--z-modal);
box-shadow: var(--shadow-popover);
```

---

*For component usage guidelines, see [component-usage-guidelines.md](./component-usage-guidelines.md).*
*For page-level patterns, see [UX Interaction Patterns](../C-UX-Scenarios/ux-interaction-patterns.md).*
*Source: `packages/ui/src/tokens/` — 132 tokens across 8 files.*

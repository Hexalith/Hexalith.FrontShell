# Story 3.7: Form & Detail View Components

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a module developer,
I want form and detail view components with built-in validation and density options,
So that end users can enter data with inline validation feedback and view entity details in a consistent layout.

## Acceptance Criteria

1. **Form + Zod integration:** `<Form schema={CreateTenantSchema} onSubmit={handleSubmit}>` wires React Hook Form with Zod resolver automatically. Validation logic lives in the Zod schema only — no duplicated validation in component code. The form supports submit and reset actions.

2. **Inline field validation:** When a user types in a required field and leaves it empty, a contextual error message appears on the field (not a disconnected banner). Error messages come from the Zod schema definitions.

3. **Form density:** `density="comfortable"` (default, for <=10 fields) uses Notion-inspired spacing with constrained width (640px max) and generous breathing room. `density="compact"` (for >10 fields) uses tighter spacing with more fields per screen (800px max). Single-column below `--breakpoint-lg`; compact density allows two-column layout at `--breakpoint-lg` and above.

4. **DetailView:** `<DetailView sections={[{ title, fields }]} actions={actionButtons} />` renders a section-based layout with key-value display pairs. Action buttons are positioned consistently. Notion-inspired constrained width (800px max) with readable sections.

5. **DatePicker:** `<DatePicker>` wraps `react-day-picker` inside a Radix `<Popover>`. When activated, a calendar popover appears with keyboard navigation. The calendar uses design tokens for all styling.

6. **Prop budget & standards:** `<Form>` has <=20 props (complex classification), `<DetailView>` has <=20 props. All components have zero external margin. Both themes produce correct, contrast-compliant results.

## Tasks / Subtasks

- [x] Task 0: Pre-implementation verification (AC: all)
  - [x] **GATE CHECK:** Run `pnpm build && pnpm test && pnpm lint` in `packages/ui/`. **If any command fails, STOP and report.**
  - [x] **PREREQUISITE:** Verify existing form components exist: `packages/ui/src/components/forms/Button.tsx`, `Input.tsx`, `Select.tsx` with their CSS modules and tests.
  - [x] **PREREQUISITE:** Verify layout components exist: `Stack.tsx`, `Inline.tsx`, `PageLayout.tsx`, `Divider.tsx` in `packages/ui/src/components/layout/`.
  - [x] **PREREQUISITE:** Verify design tokens exist: `packages/ui/src/tokens/` directory with `colors.css`, `spacing.css`, `typography.css`, `interactive.css`, `layers.css`.
  - [x] **PREREQUISITE:** Verify exports in `packages/ui/src/index.ts` include Button, Input, Select, Stack, Inline, PageLayout, Divider, and their types.

- [x] Task 1: Install new dependencies (AC: all)
  - [x] Add production dependencies to `packages/ui/package.json`:
    - `react-hook-form` (form state management — integrated inside Form component)
    - `@hookform/resolvers` (Zod resolver adapter for react-hook-form)
    - `react-day-picker` (calendar component for DatePicker)
    - `@radix-ui/react-popover` (popover primitive for DatePicker)
  - [x] Add peer dependency: `zod` (modules provide schemas; Form consumes them)
  - [x] Run `pnpm install` from workspace root
  - [x] Verify `pnpm build` still passes after dependency changes

- [x] Task 2: Create TextArea component (AC: #1, #2)
  - [x] Create `packages/ui/src/components/forms/TextArea.tsx` following the exact Input component pattern:
    - Props: `label` (required string), `value?: string`, `onChange?: (value: string) => void`, `onBlur?: () => void`, `error?: string`, `required?: boolean`, `disabled?: boolean`, `placeholder?: string`, `name?: string`, `id?: string`, `className?: string`, `rows?: number` (default 3), `maxLength?: number`, `resize?: 'none' | 'vertical' | 'both'` (default `'vertical'`)
    - Auto-generate unique id via `React.useId()` if not provided
    - Label always above textarea, error message below via `aria-describedby`
    - `aria-invalid` when error present, `aria-required` when required
    - forwardRef to `HTMLTextAreaElement`
    - Display name: `'TextArea'`
  - [x] Create `packages/ui/src/components/forms/TextArea.module.css`:
    - Follow Input.module.css pattern exactly
    - All styles in `@layer components { }`
    - Token-only values (zero hardcoded)
    - Textarea-specific: `resize` property from prop, `min-height` from rows
    - Focus-visible ring: `2px solid var(--color-focus-ring)` with 2px offset
    - Error state: `border-color: var(--color-status-danger)`
    - Disabled state: `opacity`, `cursor: not-allowed`
  - [x] Create `packages/ui/src/components/forms/TextArea.test.tsx`:
    - Renders with label, associates label with textarea
    - Shows error message linked via aria-describedby
    - Calls onChange with string value
    - Shows required indicator
    - Disabled state prevents interaction
    - Forwards ref to textarea element
    - Respects rows and resize props

- [x] Task 3: Create Checkbox component (AC: #1, #2)
  - [x] Create `packages/ui/src/components/forms/Checkbox.tsx` using semantic HTML (no Radix):
    - Props: `label` (required string), `checked?: boolean`, `onChange?: (checked: boolean) => void`, `onBlur?: () => void`, `error?: string`, `required?: boolean`, `disabled?: boolean`, `name?: string`, `id?: string`, `className?: string`
    - Native `<input type="checkbox">` with custom visual styling via CSS
    - Label positioned inline to the right of the checkbox
    - Auto-generate unique id via `React.useId()`
    - `aria-invalid` when error, `aria-required` when required, `aria-describedby` for error
    - forwardRef to `HTMLInputElement`
    - Display name: `'Checkbox'`
  - [x] Create `packages/ui/src/components/forms/Checkbox.module.css`:
    - All styles in `@layer components { }`
    - Custom checkbox visual: hide native appearance, render custom box via CSS
    - Check mark via CSS (pseudo-element or border trick) — no SVG needed
    - Use `--color-accent` for checked state, `--color-border-default` for unchecked
    - Focus-visible ring on the checkbox element
    - Inline layout: `display: flex; align-items: center; gap: var(--spacing-2)`
    - Error state, disabled state consistent with Input pattern
  - [x] Create `packages/ui/src/components/forms/Checkbox.test.tsx`:
    - Renders with label, associates label with checkbox
    - Calls onChange with boolean value on click
    - Shows error message
    - Required indicator
    - Disabled state
    - Keyboard toggle (Space key)
    - Forwards ref

- [x] Task 4: Create Form + FormField components (AC: #1, #2, #3)
  - [x] Create `packages/ui/src/components/forms/Form/Form.tsx`:
    - **Props (`FormProps<TSchema>`):**
      - `schema: TSchema` (Zod schema — generic, extends `z.ZodType<any, any>`)
      - `onSubmit: (data: z.infer<TSchema>) => void | Promise<void>`
      - `onReset?: () => void`
      - `defaultValues?: Partial<z.infer<TSchema>>`
      - `density?: 'comfortable' | 'compact'` (default `'comfortable'`)
      - `disabled?: boolean`
      - `children: React.ReactNode`
      - `className?: string`
      - `id?: string`
    - Internally: `useForm({ resolver: zodResolver(schema), defaultValues, disabled })`
    - Wraps children in `<FormProvider>` from react-hook-form
    - Provides schema through custom context (`FormSchemaContext`) for FormField auto-required detection
    - Renders `<form>` element with `onSubmit={methods.handleSubmit(onSubmit)}` and `onReset` handler that calls `methods.reset()` + `onReset?.()`
    - Sets `data-density` attribute on form element for CSS density variants
    - Form CSS: `max-width` based on density (640px comfortable, 800px compact), `display: flex; flex-direction: column; gap: var(--spacing-field-gap)`
    - `isSubmitting` state passed via context (so buttons can show loading)
    - Display name: `'Form'`
  - [x] Create `packages/ui/src/components/forms/Form/FormField.tsx`:
    - **Props:** `name: string`, `children: React.ReactElement` (single child)
    - Uses `useFormContext()` from react-hook-form to get `control`
    - Uses `Controller` to connect child to form state
    - Auto-detects `required` from schema context: reads schema shape, checks if field schema `.isOptional()` is false
    - Clones child via `React.cloneElement` passing: `value`, `onChange`, `onBlur`, `name`, `ref`, `error` (fieldState.error?.message), `required` (auto-detected, overridable by child's explicit prop)
    - **Does NOT render any DOM wrapper** — FormField is invisible, purely a form-state connector
    - **Checkbox special handling:** When child is Checkbox, pass `checked` instead of `value` (detect via child.type.displayName === 'Checkbox' or child.props convention)
    - Display name: `'FormField'`
  - [x] Create `packages/ui/src/components/forms/Form/useFormStatus.ts`:
    - Custom hook: `useFormStatus()` returns `{ isSubmitting: boolean; isValid: boolean; isDirty: boolean }`
    - Reads from react-hook-form's `useFormContext().formState`
    - Module developers use this to conditionally disable submit buttons or show loading
  - [x] Create `packages/ui/src/components/forms/Form/index.ts`:
    - Export `Form`, `FormField`, `useFormStatus`, `FormProps`
  - [x] Create `packages/ui/src/components/forms/Form/Form.module.css`:
    - All styles in `@layer components { }`
    - `.form`: `display: flex; flex-direction: column; gap: var(--spacing-field-gap); width: 100%;`
    - `.form[data-density="comfortable"]`: `max-width: 640px`
    - `.form[data-density="compact"]`: `max-width: 800px`
    - Responsive: `@media (min-width: var(--breakpoint-lg))` — compact density can use CSS grid 2-column layout via `.form[data-density="compact"] { display: grid; grid-template-columns: 1fr 1fr; }` (children span full width by default; use `.fullWidth` class for submit button row)
    - Density-dependent spacing: comfortable uses `--spacing-field-gap: var(--spacing-4)`, compact uses `--spacing-field-gap: var(--spacing-3)` via `[data-density="compact"]` override block
  - [x] Create `packages/ui/src/components/forms/Form/Form.test.tsx`:
    - Form renders with Zod schema and validates on submit
    - Invalid submission shows field-level error messages from Zod
    - Valid submission calls onSubmit with typed data
    - Reset button clears form to default values
    - FormField connects child Input to form state (value, onChange, error)
    - FormField auto-detects required from Zod schema
    - Density prop applies correct data-density attribute
    - Disabled prop disables all form fields
    - useFormStatus returns correct isSubmitting/isValid/isDirty
    - Works with Input, Select, TextArea, Checkbox, DatePicker as children of FormField

- [x] Task 5: Create DatePicker component (AC: #5)
  - [x] Create `packages/ui/src/components/forms/DatePicker/DatePicker.tsx`:
    - **Props (DatePickerProps):**
      - `label` (required string)
      - `value?: Date`
      - `onChange?: (date: Date | undefined) => void`
      - `onBlur?: () => void`
      - `error?: string`
      - `required?: boolean`
      - `disabled?: boolean`
      - `placeholder?: string` (default `'Select date...'`)
      - `minDate?: Date`
      - `maxDate?: Date`
      - `name?: string`
      - `id?: string`
      - `className?: string`
    - Structure: Label + Radix Popover wrapping react-day-picker DayPicker
    - Trigger: styled button showing formatted date or placeholder
    - Content: `<DayPicker mode="single" selected={value} onSelect={handleSelect} />`
    - Date formatting: use `Intl.DateTimeFormat` for the trigger display (no date-fns dependency)
    - Calendar closes on date selection
    - Keyboard: Enter/Space opens popover, Escape closes, arrow keys navigate calendar
    - `aria-invalid`, `aria-describedby` for error, `aria-required` pattern
    - Controlled `open` state for popover
    - forwardRef to trigger button element
    - Display name: `'DatePicker'`
  - [x] Create `packages/ui/src/components/forms/DatePicker/DatePicker.module.css`:
    - All styles in `@layer components { }`
    - Trigger button: styled like Input (same border, bg, typography) but with calendar icon indicator
    - Calendar popover: `background: var(--color-surface-elevated)`, `border: 1px solid var(--color-border-default)`, `border-radius: var(--radius-md)`, `box-shadow: var(--shadow-popover, 0 4px 12px var(--color-shadow-popover))`
    - Override react-day-picker CSS variables to use design tokens:
      - `--rdp-accent-color: var(--color-accent)`
      - `--rdp-accent-background-color: var(--color-accent-subtle)`
      - Day cells: `color: var(--color-text-primary)`, hover: `var(--color-surface-secondary)`
      - Today marker: `font-weight: var(--font-weight-semibold)`
      - Selected day: `background: var(--color-accent)`, `color: var(--color-text-on-accent)`
      - Navigation arrows: `color: var(--color-text-secondary)`
    - Light and dark theme compatibility via token indirection
    - Focus-visible ring on trigger and on calendar days
    - Error state: trigger border `var(--color-status-danger)`
    - `z-index: var(--z-popover)` on content
  - [x] Create `packages/ui/src/components/forms/DatePicker/index.ts`
  - [x] Create `packages/ui/src/components/forms/DatePicker/DatePicker.test.tsx`:
    - Renders with label
    - Shows placeholder when no date selected
    - Opens calendar popover on trigger click
    - Selecting a date updates displayed value and calls onChange
    - Closes popover after selection
    - Shows error message with aria-describedby
    - Required indicator displayed
    - Disabled state prevents opening
    - Keyboard navigation (Enter opens, Escape closes)
    - minDate/maxDate disable out-of-range dates

- [x] Task 6: Create DetailView component (AC: #4)
  - [x] Create `packages/ui/src/components/data-display/DetailView/DetailView.tsx`:
    - **Props (DetailViewProps):**
      - `sections: DetailSection[]` — array of `{ title: string; fields: DetailField[] }`
      - `DetailField`: `{ label: string; value: React.ReactNode; span?: 1 | 2 }` (span for wide fields)
      - `actions?: React.ReactNode` — action buttons rendered at top-right
      - `density?: 'comfortable' | 'compact'` (default `'comfortable'`)
      - `loading?: boolean` — shows Skeleton placeholders when true
      - `className?: string`
    - Layout: constrained width container (max-width 800px), sections stacked vertically
    - Each section: title + key-value grid
    - Key-value layout: 2-column grid (label | value) within each section
    - Labels: `--font-weight-medium`, `--color-text-secondary`, `--font-size-sm`
    - Values: `--font-weight-regular`, `--color-text-primary`, `--font-size-base`
    - Actions positioned at the top of the component, right-aligned, using `Inline`
    - Divider between sections
    - When `loading`, render Skeleton components in place of field values
    - Display name: `'DetailView'`
  - [x] Create `packages/ui/src/components/data-display/DetailView/DetailView.module.css`:
    - All styles in `@layer components { }`
    - `.detailView`: `max-width: 800px; width: 100%;`
    - `.header`: `display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-5);`
    - `.section`: `margin-bottom: var(--spacing-section);`
    - `.sectionTitle`: `font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); margin-bottom: var(--spacing-3);`
    - `.fieldGrid`: `display: grid; grid-template-columns: minmax(120px, auto) 1fr; gap: var(--spacing-3) var(--spacing-4); align-items: baseline;`
    - `.fieldLabel`: `font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-secondary);`
    - `.fieldValue`: `font-size: var(--font-size-base); color: var(--color-text-primary);`
    - `.fieldValue[data-span="2"]`: `grid-column: 1 / -1;` (full-width field)
    - Density variants via `[data-density]` on root
    - Zero external margin
  - [x] Create `packages/ui/src/components/data-display/DetailView/index.ts`
  - [x] Create `packages/ui/src/components/data-display/DetailView/DetailView.test.tsx`:
    - Renders sections with titles
    - Renders field labels and values
    - Renders action buttons
    - Handles ReactNode values (e.g., Badge component as value)
    - Loading state shows Skeleton components
    - Density prop applies data-density attribute
    - Empty sections handled gracefully
    - span=2 field takes full grid width

- [x] Task 7: Update package exports (AC: all)
  - [x] Update `packages/ui/src/index.ts` — add new exports under appropriate sections:
    - Under `// --- Forms ---`: add `TextArea`, `TextAreaProps`, `Checkbox`, `CheckboxProps`, `Form`, `FormField`, `FormProps`, `useFormStatus`, `DatePicker`, `DatePickerProps`
    - Under `// --- Data Display ---`: add `DetailView`, `DetailViewProps`, `DetailSection`, `DetailField`
  - [x] Verify no circular dependencies in new exports
  - [x] Run `pnpm build` to confirm tsup produces ESM + .d.ts for all new exports

- [x] Task 8: Final verification — Definition of Done (AC: all)
  - [x] Run `pnpm build` — confirm tsup produces ESM + .d.ts
  - [x] Run `pnpm test` — confirm ALL Vitest tests pass (all components)
  - [x] Run `pnpm lint` — confirm ESLint passes
  - [x] Run token compliance scanner — must report 100%
  - [x] Verify Form: Zod schema validation, inline errors, submit/reset, density variants
  - [x] Verify FormField: connects Input/Select/TextArea/Checkbox/DatePicker to form
  - [x] Verify TextArea: label, value, onChange, error, required, rows, resize
  - [x] Verify Checkbox: label, checked, onChange, error, keyboard toggle
  - [x] Verify DatePicker: calendar popover, date selection, keyboard nav, error state
  - [x] Verify DetailView: sections, key-value grid, actions, loading state
  - [x] Verify dual-theme: all new components render correctly in light and dark themes
  - [x] Verify prop budget: Form <=20, DetailView <=20
  - [x] Verify zero external margin on all new components
  - [x] Verify all existing Story 3-1 through 3-6 tests still pass unchanged
  - [x] **Story is DONE when all of the above pass.**

## Dev Notes

### Prerequisites — Stories 3-1 Through 3-6 Must Be Complete

Story 3-7 depends on components from previous stories. Verify before starting:

**Required from Story 3-1 (layout):** `Stack`, `Inline`, `PageLayout`, `Divider` in `packages/ui/src/components/layout/`
**Required from Story 3-2 (interactive):** `Button`, `Input`, `Select` in `packages/ui/src/components/forms/`
**Required from Story 3-3 (feedback):** `Skeleton`, `ErrorDisplay` in `packages/ui/src/components/feedback/`
**Required from Story 3-5 (data display):** `Table` in `packages/ui/src/components/data-display/Table/`

If any prerequisite is missing, STOP and report.

### Architecture Constraints — MUST Follow

1. **CSS Modules + @layer:** All new styles MUST be in CSS Modules (`.module.css`) wrapped in `@layer components { }`. Use design token CSS custom properties exclusively — zero hardcoded values. [Source: architecture.md#Styling Solution]

2. **Zero external margin:** All new components have zero external margin. Spacing controlled by parent containers via `gap`. [Source: UX spec#Margin-Free Components]

3. **CSS class names:** camelCase for CSS Module class names. [Source: architecture.md#CSS class names]

4. **Prop naming:** Event handlers: `on` + PascalCase verb (`onSubmit`, `onChange`). Boolean props: `is`/`has` prefix for state (`isLoading`), no prefix for feature flags (`disabled`, `required`). [Source: architecture.md#Code Naming]

5. **Package dependency rules:** `@hexalith/ui` may import from: React, @radix-ui/\*, @tanstack/react-table, react-hook-form, react-day-picker. MUST NOT import from `@hexalith/cqrs-client`. All components are data-agnostic. [Source: architecture.md#Package Dependency Rules]

6. **Third-party type re-export policy:** Do NOT re-export react-hook-form types (`UseFormReturn`, `FieldError`, etc.) or react-day-picker types. Define own types (`FormProps`, `DatePickerProps`). [Source: architecture.md#Third-Party Type Re-Export Policy]

7. **Radix usage:** Use Radix primitives for complex interactive widgets (DatePicker Popover). Simple form elements (TextArea, Checkbox) use semantic HTML. Table/Form achieve accessibility through semantic HTML + ARIA, not Radix. [Source: UX spec#Table/Form Accessibility Model]

8. **Labels always above inputs:** Form labels positioned above their inputs (not inline) to accommodate long labels. No max-width on labels. [Source: UX spec#Text Expansion Tolerances]

9. **Focus management:** `focus-visible` produces a 2px solid `--color-focus-ring` with 2px offset. Never suppressed. Tab order matches visual order. [Source: UX spec#Focus Management]

10. **Form validation source of truth:** Zod schema is the SINGLE source of truth for validation. Never duplicate validation in component code. `<Form>` wires React Hook Form + Zod resolver internally. [Source: architecture.md#Form Validation Patterns]

11. **No additional undocumented dependencies:** Do NOT add date-fns. DatePicker uses `Intl.DateTimeFormat` for display formatting. react-day-picker handles calendar logic internally.

### New Dependencies Required

| Package                   | Type           | Purpose                                  | Version                              |
| ------------------------- | -------------- | ---------------------------------------- | ------------------------------------ |
| `react-hook-form`         | dependency     | Form state management inside `<Form>`    | ^7.x (latest stable)                 |
| `@hookform/resolvers`     | dependency     | Zod resolver adapter for react-hook-form | ^3.x (latest stable)                 |
| `react-day-picker`        | dependency     | Calendar component for `<DatePicker>`    | ^9.x (latest stable)                 |
| `@radix-ui/react-popover` | dependency     | Popover primitive for DatePicker         | ^1.x (match existing Radix versions) |
| `zod`                     | peerDependency | Modules provide Zod schemas to `<Form>`  | ^3.x                                 |

**Why zod is a peerDependency:** Modules already depend on zod for their command/projection schemas. The Form component receives these schemas as props. Both the module and `@hexalith/ui` must use the same zod instance to avoid type mismatches. Making it a peer ensures single instance resolution.

### Component API Specifications

#### `Form<TSchema>`

```tsx
import { z } from "zod";

interface FormProps<TSchema extends z.ZodType<any, any>> {
  /** Zod schema — single source of truth for validation */
  schema: TSchema;
  /** Called with validated data on successful submit */
  onSubmit: (data: z.infer<TSchema>) => void | Promise<void>;
  /** Called when form is reset */
  onReset?: () => void;
  /** Initial/default values for form fields */
  defaultValues?: Partial<z.infer<TSchema>>;
  /** Form density — affects spacing and max-width */
  density?: "comfortable" | "compact";
  /** Disable all form fields */
  disabled?: boolean;
  /** Form content — FormField components and action buttons */
  children: React.ReactNode;
  className?: string;
  id?: string;
}
```

**Internal wiring:**

```tsx
const methods = useForm<z.infer<TSchema>>({
  resolver: zodResolver(schema),
  defaultValues: defaultValues as any,
  disabled,
});

// Provide schema context for FormField auto-required detection
<FormSchemaContext.Provider value={schema}>
  <FormProvider {...methods}>
    <form
      onSubmit={methods.handleSubmit(onSubmit)}
      onReset={(e) => {
        e.preventDefault();
        methods.reset();
        onReset?.();
      }}
      data-density={density}
      className={clsx(styles.form, className)}
    >
      {children}
    </form>
  </FormProvider>
</FormSchemaContext.Provider>;
```

#### FormField

```tsx
interface FormFieldProps {
  /** Field name matching a key in the Zod schema */
  name: string;
  /** Single form field component (Input, Select, TextArea, Checkbox, DatePicker) */
  children: React.ReactElement;
}
```

**Key implementation pattern — Controller + cloneElement:**

```tsx
function FormField({ name, children }: FormFieldProps) {
  const { control } = useFormContext();
  const schema = useFormSchema(); // custom context from Form

  // Auto-detect required from Zod schema
  const isRequired = React.useMemo(() => {
    if (!schema || !("shape" in schema)) return false;
    const fieldSchema = (schema as z.ZodObject<any>).shape[name];
    return fieldSchema ? !fieldSchema.isOptional() : false;
  }, [schema, name]);

  const child = React.Children.only(children);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        // Determine if child is a Checkbox (boolean field)
        const isCheckbox = (child.type as any)?.displayName === "Checkbox";

        const fieldProps = isCheckbox
          ? { checked: !!field.value, onChange: field.onChange }
          : { value: field.value ?? "", onChange: field.onChange };

        return React.cloneElement(child, {
          ...fieldProps,
          onBlur: field.onBlur,
          name: field.name,
          ref: field.ref,
          error: fieldState.error?.message,
          required: child.props.required ?? isRequired,
        });
      }}
    />
  );
}
```

**CRITICAL: ref forwarding.** Controller passes a ref that must reach the actual DOM element (for `shouldFocusError`). All field components (Input, Select, TextArea, Checkbox, DatePicker) use `forwardRef` — this ref must connect to the interactive DOM element.

#### useFormStatus

```tsx
function useFormStatus(): {
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
};
```

Module developers use this inside Form children to conditionally disable submit buttons:

```tsx
function SubmitButton() {
  const { isSubmitting } = useFormStatus();
  return (
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? "Saving..." : "Save"}
    </Button>
  );
}
```

#### TextArea

```tsx
interface TextAreaProps {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  id?: string;
  className?: string;
  /** Visible rows — default 3 */
  rows?: number;
  /** Character limit — shows count when set */
  maxLength?: number;
  /** Resize behavior — default 'vertical' */
  resize?: "none" | "vertical" | "both";
}
```

Follows the exact same pattern as Input: label above, error below with `aria-describedby`, `useId()` for auto-id, forwardRef.

#### Checkbox

```tsx
interface CheckboxProps {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
}
```

Native `<input type="checkbox">` with custom visual styling. Label positioned inline to the right. Error message below.

#### DatePicker

```tsx
interface DatePickerProps {
  label: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  name?: string;
  id?: string;
  className?: string;
}
```

**Structure:**

```tsx
<div className={styles.datePicker}>
  <label>{label}</label>
  <Popover.Root open={open} onOpenChange={setOpen}>
    <Popover.Trigger asChild>
      <button className={styles.trigger}>
        {value ? formatDate(value) : placeholder}
        <CalendarIcon />
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content sideOffset={4} align="start" className={styles.content}>
        <DayPicker
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          classNames={
            {
              /* override with CSS module classes */
            }
          }
        />
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
  {error && <span aria-live="polite">{error}</span>}
</div>
```

**Date formatting for trigger display:**

```tsx
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
```

**Calendar closes on selection:**

```tsx
const handleSelect = (date: Date | undefined) => {
  onChange?.(date);
  setOpen(false);
};
```

**react-day-picker CSS customization:** Override react-day-picker CSS variables on the DayPicker root element to use design tokens. Import `react-day-picker/style.css` for base styles, then override in the CSS module:

```css
.calendar {
  --rdp-accent-color: var(--color-accent);
  --rdp-accent-background-color: var(--color-accent-subtle);
  --rdp-day_button-border-radius: var(--radius-sm);
  --rdp-day_button-height: 36px;
  --rdp-day_button-width: 36px;
  color: var(--color-text-primary);
  font-family: var(--font-family-sans);
}
```

#### DetailView

```tsx
interface DetailField {
  /** Field label (left column) */
  label: string;
  /** Field value — can be string, number, or React element (e.g., Badge) */
  value: React.ReactNode;
  /** Span full grid width — for long-form content */
  span?: 1 | 2;
}

interface DetailSection {
  /** Section heading */
  title: string;
  /** Key-value field pairs */
  fields: DetailField[];
}

interface DetailViewProps {
  /** Grouped field sections */
  sections: DetailSection[];
  /** Action buttons (top-right of component) */
  actions?: React.ReactNode;
  /** Loading state — shows Skeleton placeholders */
  loading?: boolean;
  /** Density — affects spacing */
  density?: "comfortable" | "compact";
  className?: string;
}
```

### Design Token References

**Spacing tokens (density-dependent):**

| Semantic Token        | Comfortable (default) | Compact              |
| --------------------- | --------------------- | -------------------- |
| `--spacing-field-gap` | `--spacing-4` (16px)  | `--spacing-3` (12px) |
| `--spacing-section`   | `--spacing-6` (32px)  | `--spacing-5` (24px) |

**Typography for form labels:**

- Font weight: `--font-weight-medium` (500)
- Font size: `--font-size-sm` for labels

**Typography for detail view:**

- Section title: `--font-size-lg`, `--font-weight-semibold`
- Field label: `--font-size-sm`, `--font-weight-medium`, `--color-text-secondary`
- Field value: `--font-size-base`, `--font-weight-regular`, `--color-text-primary`

**Existing tokens already in use:**

- `--color-accent`, `--color-accent-subtle`, `--color-accent-hover`
- `--color-text-primary`, `--color-text-secondary`, `--color-text-on-accent`
- `--color-surface-primary`, `--color-surface-secondary`, `--color-surface-elevated`
- `--color-border-default`, `--color-border-subtle`, `--color-focus-ring`
- `--color-status-danger` (error states)
- `--radius-sm`, `--radius-md`
- `--z-popover` (DatePicker calendar)
- `--transition-duration-fast`, `--transition-duration-default`
- `--shadow-popover` or `--color-shadow-popover`

### Visual Design Specifications

**Form layout:**

- Comfortable: max-width 640px, single-column, generous spacing (`--spacing-field-gap`)
- Compact: max-width 800px, single-column (2-column at `--breakpoint-lg`+), tighter spacing
- Form sits within parent flow — no centering applied (parent controls positioning)
- Field gap: `--spacing-field-gap` (density-dependent)
- Section separations: `--spacing-section` (density-dependent)

**DetailView layout:**

- Max-width 800px
- Header row: title area (left) + action buttons (right), `justify-content: space-between`
- Sections separated by Divider + `--spacing-section` gap
- Key-value grid: 2-column CSS grid per section (`minmax(120px, auto) 1fr`)
- Grid gap: `--spacing-3` vertical, `--spacing-4` horizontal
- Section titles use `--font-size-lg`, `--font-weight-semibold`

**DatePicker calendar popover:**

- Background: `--color-surface-elevated`
- Border: `1px solid var(--color-border-default)`
- Border-radius: `--radius-md`
- Box-shadow: popover shadow token
- Trigger button styled to match Input appearance (same height, border, font)
- Calendar icon on right side of trigger (inline SVG, `--color-text-secondary`)

**Checkbox visual:**

- 16x16px custom checkbox box (or 18x18)
- Unchecked: `border: 2px solid var(--color-border-default)`
- Checked: `background: var(--color-accent); border-color: var(--color-accent)`
- Check mark: white (`--color-text-on-accent`), CSS-drawn (border trick: short + tall border-bottom/border-left rotated 45deg)
- Label inline to right, `gap: var(--spacing-2)`

### Testing Approach

Co-located Vitest tests using `@testing-library/react`, `@testing-library/jest-dom`, and `@testing-library/user-event`.

**Form testing pattern (with Zod):**

```tsx
import { z } from "zod";

const TestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  agree: z.boolean().refine((v) => v, "Must agree"),
});

// Render Form with FormField + Input/Checkbox children
// Simulate submit without filling required fields → verify error messages appear
// Fill fields → submit → verify onSubmit called with typed data
// Click reset → verify fields cleared
```

**DatePicker testing:**

- Mock `Intl.DateTimeFormat` if needed for consistent formatting
- Use `userEvent.click` on trigger to open popover
- Verify calendar renders (look for role="grid" or DayPicker structure)
- Click a day → verify onChange called with Date, popover closes
- Verify disabled dates are not selectable

**DetailView testing:**

- Render with sections data → verify labels and values present
- Render with ReactNode values → verify correct rendering
- Loading prop → verify Skeleton components appear
- Actions prop → verify action buttons rendered

**Do NOT test:**

- Visual appearance (Storybook visual tests in Story 3-9)
- Full react-day-picker internals (trust the library)
- React Hook Form internals (trust the library)
- Integration with useCommand/useProjection (that's module-level)

### Project Structure Notes

```text
packages/ui/src/
├── index.ts                          # Update: add new component exports
├── components/
│   ├── data-display/
│   │   ├── Table/                    # Existing — DO NOT modify
│   │   └── DetailView/              # NEW
│   │       ├── index.ts
│   │       ├── DetailView.tsx
│   │       ├── DetailView.module.css
│   │       └── DetailView.test.tsx
│   ├── forms/
│   │   ├── Button.tsx               # Existing — DO NOT modify
│   │   ├── Button.module.css        # Existing — DO NOT modify
│   │   ├── Button.test.tsx          # Existing — DO NOT modify
│   │   ├── Input.tsx                # Existing — DO NOT modify
│   │   ├── Input.module.css         # Existing — DO NOT modify
│   │   ├── Input.test.tsx           # Existing — DO NOT modify
│   │   ├── Select.tsx               # Existing — DO NOT modify
│   │   ├── Select.module.css        # Existing — DO NOT modify
│   │   ├── Select.test.tsx          # Existing — DO NOT modify
│   │   ├── TextArea.tsx             # NEW
│   │   ├── TextArea.module.css      # NEW
│   │   ├── TextArea.test.tsx        # NEW
│   │   ├── Checkbox.tsx             # NEW
│   │   ├── Checkbox.module.css      # NEW
│   │   ├── Checkbox.test.tsx        # NEW
│   │   ├── Form/                    # NEW
│   │   │   ├── index.ts
│   │   │   ├── Form.tsx
│   │   │   ├── Form.module.css
│   │   │   ├── Form.test.tsx
│   │   │   ├── FormField.tsx
│   │   │   └── useFormStatus.ts
│   │   └── DatePicker/              # NEW
│   │       ├── index.ts
│   │       ├── DatePicker.tsx
│   │       ├── DatePicker.module.css
│   │       └── DatePicker.test.tsx
│   ├── feedback/                    # Existing — DO NOT modify
│   ├── layout/                      # Existing — DO NOT modify
│   ├── navigation/                  # Existing — DO NOT modify
│   └── overlay/                     # Existing — DO NOT modify
└── tokens/                          # Existing — DO NOT modify
```

### Precedent Patterns from Stories 3-1 Through 3-6 — MUST Follow

1. **forwardRef pattern:** All interactive components use `React.forwardRef`. Follow Input.tsx as the canonical example for form fields.
2. **useId() for accessibility:** Generate unique IDs via `React.useId()` for label-input association. See Input.tsx.
3. **Error display pattern:** Error message in a `<span>` below the field, linked via `aria-describedby`. Error ID = `${id}-error`. See Input.tsx.
4. **CSS Module import order:** CSS module imports before sibling component imports per ESLint `import-x/order`.
5. **clsx for className merging:** `import clsx from 'clsx'` — standard pattern across all components.
6. **data-\* attributes for variants:** Use `data-variant`, `data-size`, `data-density` for CSS variant selection. NOT className-based variants.
7. **Display name:** Every component sets `Component.displayName = 'ComponentName'`.
8. **Token compliance:** 100% token compliance. No hardcoded colors, sizes, or spacing.
9. **@layer components:** All CSS wrapped in `@layer components { }`.
10. **prefers-reduced-motion:** Wrap transitions with `@media (prefers-reduced-motion: reduce) { transition-duration: 0ms; }`.
11. **Existing component reuse:** Use `Skeleton` from feedback for loading states. Use `Inline` from layout for action button rows. Use `Divider` from layout for section separators.

### Anti-Patterns to Avoid

- **DO NOT re-export react-hook-form types.** Define own `FormProps`, `useFormStatus` return type. No `UseFormReturn`, `FieldError`, `Control` in public API.
- **DO NOT add date-fns.** Use `Intl.DateTimeFormat` for date display. react-day-picker handles calendar logic.
- **DO NOT create a FormActions compound component.** Use the existing `Inline` layout component for action button rows. Keep Form simple.
- **DO NOT duplicate validation logic.** The Zod schema is the only validation definition. Form fields display errors from the schema — they don't add their own required/pattern checks.
- **DO NOT modify existing components** from Stories 3-1 through 3-6. If an existing component needs a prop change to work with FormField (e.g., making `label` optional), do NOT change the existing component — FormField must work with the existing API.
- **DO NOT use `any` type.** All new props, state, and contexts properly typed. Use generics for `Form<TSchema>`.
- **DO NOT use inline styles** except the CSS custom property pattern.
- **DO NOT add hardcoded colors/sizes.** All values from design tokens.
- **DO NOT use Phase 2 features:** No multi-step forms, conditional field visibility, autosave, inline editing in DetailView, activity timeline.
- **DO NOT make Form render field labels.** Each field component (Input, Select, etc.) renders its own label. FormField is invisible — it only connects form state.

### Previous Story Intelligence (Story 3-6)

**Key learnings from Story 3-6:**

- TanStack Table integration pattern: headless library manages state, we render HTML. Same applies here: React Hook Form manages form state, we render form UI.
- CSS Module `:global()` usage for special class names. May be needed if react-day-picker requires global class overrides.
- Import order: CSS module imports before sibling component imports.
- Token compliance 100% has been maintained across all stories — maintain this standard.
- Button component imported via `'../../forms/Button'` — reuse for DetailView actions.
- Skeleton component available in feedback — reuse for DetailView loading state.

**Key learnings from Story 3-2 (Input component):**

- Input uses `React.useId()` for auto-generated id.
- Input wraps `<input>` in a container `<div>` with `<label>` above and error `<span>` below.
- Input calls `onChange(e.target.value)` — passes the string value, not the event.
- Select uses `@radix-ui/react-select` — follow this pattern for DatePicker's use of `@radix-ui/react-popover`.
- Select component has development-mode `console.warn` for validation issues.

### Git Intelligence from Recent Work

Recent commits confirm Epic 3 is actively being implemented:

- `9a1b728` — Story 3-5: Table component with sorting, pagination, loading states
- `0167813` — Story 3-4: Sidebar and Tabs components
- `8872465` — Story 3-3: ErrorBoundary, ErrorDisplay, Skeleton, Toast
- `9112b0b` — Story 3-2: Button, Input, Select, Tooltip

Story 3-6 (Table advanced) is at `in-progress` — it must be completed before or in parallel with this story. Story 3-7 does NOT depend on Story 3-6 features.

### Downstream Dependencies

- **Story 3-8 (Overlay Components):** Modal, AlertDialog, DropdownMenu. No dependency on Form/DetailView.
- **Story 3-9 (Storybook):** Will add stories for ALL Story 3-7 components. Critically, must include a composition story: `Table + DetailView + Form` demonstrating the component combination Epic 4's scaffold uses.
- **Epic 4 (Module Scaffold):** The scaffold's example code depends directly on:
  - `<Form schema={...} onSubmit={...}>` with `<FormField>` + `<Input>` for tenant creation
  - `<DetailView sections={...} actions={...}>` for tenant detail page
  - Both must be complete before Epic 4 scaffold can work
- **Epic 6 (Tenants Reference Module):** Uses Form with real `useCommand` for tenant CRUD. Uses DetailView for tenant detail pages.

### Discrepancies Between Source Documents

1. **Architecture vs Reality — file naming:** Architecture lists `TextField.tsx` and `Checkbox.tsx` in forms/. Reality has `Input.tsx` (not TextField). This story creates `Checkbox.tsx` (matching architecture) and `TextArea.tsx` (new, needed for multi-line text but not in architecture). The architecture's `TextField` was implemented as `Input` in Story 3-2.

2. **Architecture vs Reality — Checkbox approach:** Architecture lists `Checkbox.tsx` alongside `Select.tsx` (which uses Radix). But the UX spec says "Table and Form components achieve accessibility through semantic HTML, not Radix primitives." Checkbox uses native HTML per UX spec.

3. **Form file structure:** Architecture shows `useFormContext.ts` in the Form/ directory. This story uses React Hook Form's built-in `useFormContext` and adds `useFormStatus.ts` instead — a simpler, purpose-built hook that doesn't leak library internals.

4. **DatePicker placement:** Architecture shows DatePicker is not explicitly listed as a standalone file. The UX spec AC describes it as wrapping react-day-picker in Radix Popover. This story creates it as `forms/DatePicker/` (directory pattern like Form/ because it has a CSS module with substantial styling).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.7] — acceptance criteria and story definition
- [Source: _bmad-output/planning-artifacts/architecture.md#Package Dependency Rules] — @hexalith/ui allowed imports
- [Source: _bmad-output/planning-artifacts/architecture.md#Third-Party Type Re-Export Policy] — define own types
- [Source: _bmad-output/planning-artifacts/architecture.md#File Structure lines 1375-1389] — forms/ directory structure
- [Source: _bmad-output/planning-artifacts/architecture.md#Form Validation Patterns lines 1057-1070] — Zod as single validation source
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#View-Type Density Profiles] — Form density: comfortable/compact
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Complexity Classification] — Form <=20, DetailView <=20
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Table/Form Accessibility Model] — semantic HTML for forms
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Margin-Free Components] — zero external margin
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#CSS Layer Cascade Order] — @layer enforcement
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Screen Reader Strategy] — label + aria-describedby for forms
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Layout Grid] — Form max-width 640/800px, DetailView 800px
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Spacing Scale] — density-dependent tokens
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component API Complexity Tiers] — Form/DetailView MVP vs Phase 2 scope
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Focus Management] — focus-visible ring style
- [Source: _bmad-output/implementation-artifacts/3-6-data-table-advanced-features.md] — previous story patterns and learnings

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Fixed native HTML form validation blocking react-hook-form's Zod validation by adding `noValidate` to form element
- Fixed TypeScript DTS build error with `defaultValues` generic type in Form component
- Fixed `React.cloneElement` type error by typing `children` as `React.ReactElement<Record<string, unknown>>`
- Fixed auto-required detection causing `getByLabelText` test failures (label text includes `*` indicator)
- Resolved stylelint warnings: replaced `-1px` with `clip-path: inset(50%)` for visually-hidden pattern, used spacing tokens for calendar day button sizing

### Completion Notes List

- TextArea: 15 tests, forwardRef, label/error/required/disabled/rows/resize/onBlur all working
- Checkbox: 13 tests, native HTML checkbox with custom CSS visual, Space key toggle, forwardRef
- Form + FormField: 16 tests, Zod schema validation, auto-required detection, density variants, disabled propagation, works with Input/Select/TextArea/Checkbox/DatePicker
- useFormStatus: exposes isSubmitting/isValid/isDirty from react-hook-form
- DatePicker: 16 tests, Radix Popover + react-day-picker, date formatting via Intl.DateTimeFormat, keyboard open/close, name propagation, and min/max guardrails covered
- DetailView: 11 tests, section-based layout with key-value grid, actions, loading state via Skeleton, density variants
- FormField now special-cases DatePicker alongside Checkbox so RHF passes `Date | undefined` instead of a string fallback
- Compact form density now switches to a two-column layout at `--breakpoint-lg`, matching the story requirement for high-field-count forms
- DetailView header and field rows now follow the documented section/grid contract, including full-width fields and consistent action placement
- DayPicker base styles are imported from the DatePicker CSS module to keep lint/build tooling happy while preserving tokenized overrides
- All 417 tests pass (73 new + 344 existing unchanged)
- Build: ESM + .d.ts generated successfully
- Lint: 0 errors, 0 warnings
- Token compliance: 100% (941/941 declarations compliant)
- Prop budget: Form has 9 props (<=20), DetailView has 5 props (<=20)
- Zero external margin on all new components

### Change Log

- 2026-03-20: Story 3-7 implementation complete — TextArea, Checkbox, Form/FormField/useFormStatus, DatePicker, DetailView components created with full test coverage, 100% token compliance
- 2026-03-21: Senior Developer Review (AI) findings fixed — FormField DatePicker wiring corrected, compact density and DetailView layout aligned to spec, DatePicker coverage expanded, and story status advanced to done after build/test/lint revalidation

### File List

- `packages/ui/package.json` (modified — added react-hook-form, @hookform/resolvers, react-day-picker, @radix-ui/react-popover, zod peer dep)
- `packages/ui/src/index.ts` (modified — added exports for all new components)
- `packages/ui/src/components/forms/TextArea.tsx` (new)
- `packages/ui/src/components/forms/TextArea.module.css` (new)
- `packages/ui/src/components/forms/TextArea.test.tsx` (new)
- `packages/ui/src/components/forms/Checkbox.tsx` (new)
- `packages/ui/src/components/forms/Checkbox.module.css` (new)
- `packages/ui/src/components/forms/Checkbox.test.tsx` (new)
- `packages/ui/src/components/forms/Form/Form.tsx` (new)
- `packages/ui/src/components/forms/Form/Form.module.css` (new)
- `packages/ui/src/components/forms/Form/Form.test.tsx` (new)
- `packages/ui/src/components/forms/Form/FormField.tsx` (new)
- `packages/ui/src/components/forms/Form/useFormStatus.ts` (new)
- `packages/ui/src/components/forms/Form/index.ts` (new)
- `packages/ui/src/components/forms/DatePicker/DatePicker.tsx` (new)
- `packages/ui/src/components/forms/DatePicker/DatePicker.module.css` (new)
- `packages/ui/src/components/forms/DatePicker/DatePicker.test.tsx` (new)
- `packages/ui/src/components/forms/DatePicker/index.ts` (new)
- `packages/ui/src/components/data-display/DetailView/DetailView.tsx` (new)
- `packages/ui/src/components/data-display/DetailView/DetailView.module.css` (new)
- `packages/ui/src/components/data-display/DetailView/DetailView.test.tsx` (new)
- `packages/ui/src/components/data-display/DetailView/index.ts` (new)
- `pnpm-lock.yaml` (modified — synced new form/detail dependencies)
- `_bmad-output/implementation-artifacts/3-7-form-and-detail-view-components.md` (modified — review closeout, validation results, story status update)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — synced story status to done)

## Senior Developer Review (AI)

### Reviewer

Jerome

### Date

2026-03-21

### Outcome

Approved

### Summary

- Original review findings resolved: 2 high, 3 medium, 0 outstanding
- Form density, DatePicker integration, and DetailView layout now align with the story contract
- Additional regression coverage added for DatePicker keyboard behavior, form integration, name propagation, and min/max date bounds
- Final validation in `packages/ui` passed: `pnpm test`, `pnpm build`, and `pnpm lint`

### Findings

1. **Resolved high issue: compact form density now matches the acceptance criteria.**

- **Resolution:** Updated `packages/ui/src/components/forms/Form/Form.module.css` so compact forms retain tighter spacing and switch to a two-column grid at `--breakpoint-lg`.

1. **Resolved high issue: `FormField` now integrates `DatePicker` correctly.**

- **Resolution:** Updated `packages/ui/src/components/forms/Form/FormField.tsx` to detect `DatePicker` children and pass `Date | undefined` values instead of string fallbacks, while preserving RHF wiring.

1. **Resolved medium issue: DatePicker coverage now matches the delivered behavior.**

- **Resolution:** Expanded `packages/ui/src/components/forms/DatePicker/DatePicker.test.tsx` and `packages/ui/src/components/forms/Form/Form.test.tsx` to cover keyboard open/close, accessible trigger naming, min/max disabled dates, and form integration.

1. **Resolved medium issue: DetailView layout now follows the documented section/grid model.**

- **Resolution:** Updated `packages/ui/src/components/data-display/DetailView/DetailView.tsx` and `.module.css` so actions remain consistently aligned and span-two fields render as full-width rows within the detail grid.

1. **Resolved medium issue: story tracking is now synchronized with the repaired implementation.**

- **Resolution:** Reconciled the story record, file list, completion notes, and sprint tracker so Story 3.7 can move from review to done without drift.

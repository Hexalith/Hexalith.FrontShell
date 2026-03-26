# Sprint Change Proposal — 2026-03-25

**Project:** Hexalith.FrontShell
**Triggered by:** Hexalith.Tenants UX Design Specification (`Hexalith.Tenants/_bmad-output/planning-artifacts/ux-design-specification.md`)
**Author:** Jerome (facilitated by Sally, UX Designer Agent)
**Change scope:** Moderate — 2 new `@hexalith/ui` components, 5 new design tokens, 1 hook enhancement, 1 Storybook pattern story
**Status:** Proposed

---

## Section 1: Issue Summary

### Problem Statement

The Hexalith.Tenants reference module — the first production consumer of `@hexalith/ui` — requires components and hook capabilities that do not yet exist in FrontShell. These gaps were identified through comprehensive UX design specification work including party mode reviews with cross-functional agents (UX, Architecture, Development, Testing, Product).

The missing capabilities are not Tenants-specific — they solve patterns that any enterprise FrontShell module will need:
1. **Audit/event timeline display** — any module with activity logs, event history, or change tracking
2. **Consequence preview for destructive operations** — any module with delete, disable, revoke, or irreversible actions
3. **Optimistic update tracking** — every module using `useCommand` needs to mark in-flight operations in the UI
4. **Toast batch consolidation** — any module where users perform rapid sequential actions

Building these in the Tenants module and later promoting to `@hexalith/ui` means building them twice. One focused sprint in `@hexalith/ui` now saves a migration sprint later and ensures the reference module demonstrates that the component library provides everything a production module needs.

### Discovery Context

- **When discovered:** During Hexalith.Tenants UX design specification workflow (Steps 3-12)
- **How discovered:** Systematic screen-by-screen component gap analysis, validated through 5 party mode sessions with cross-functional agents and 2 advanced elicitation rounds (10 methods applied)
- **Confidence level:** HIGH — every component need traces to a specific user journey, acceptance criteria, and test requirement

### Evidence

The Tenants UX spec provides:
- Detailed component specifications with API design, prop budgets, accessibility requirements, and test plans
- User journey flows (7 journeys with Mermaid diagrams) demonstrating exactly where each component is needed
- Comparative analysis against Clerk, Stripe, Azure AD, Auth0 validating that these patterns are standard in production admin tools
- Implementation roadmap showing dependency chain: Phase 1 (core loop) depends on `useCommand` `pendingIds`; Phase 2 (audit + incident response) depends on `<AuditTimeline>` and `<ConsequencePreview>`

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Impact Level | Details |
|------|-------------|---------|
| **Epic 2** | **Moderate** | `useCommand` hook gains `pendingIds` Set for tracking in-flight operations. Toast system gains batch consolidation (100ms window). |
| **Epic 3** | **Moderate** | Two new components added to `@hexalith/ui`: `<AuditTimeline>`, `<ConsequencePreview>`. Five new design tokens. |
| Epic 4 | Minor | Scaffold template can demonstrate `pendingIds` pattern in generated example code |
| **Epic 6** | **Moderate** | Tenants reference module (stories 6.3, 6.4) uses all new components and hook capabilities |
| Epic 7 | Minor | AI knowledge bundle updated with new component APIs |

### Story Impact

**Epic 2 — Commands, Projections & Real-Time:**

| Story | Change | Type |
|-------|--------|------|
| **2.3** (`useCommand` hooks) | Add `pendingIds: Set<string>` to `useSubmitCommand` return value. `pendingIds` tracks entity IDs of submitted-but-not-confirmed commands. Cleared when SignalR projection update arrives for the matching entity. Supports multiple in-flight commands simultaneously. | Modified |
| **New: 2.10** | Toast batch consolidation: multiple Phase 3 confirmations arriving within 100ms batch into a single toast message. Prevents toast overflow during rapid sequential operations (e.g., revoking 3 memberships). | New story |

**Epic 3 — UI Components:**

| Story | Change | Type |
|-------|--------|------|
| **New: 3.10** | `<AuditTimeline>` component — MVP flat timeline | New story |
| **New: 3.11** | `<ConsequencePreview>` component | New story |
| **New: 3.12** | Role semantic tokens + consequence background token + timeline connector token (5 tokens total) | New story |
| **New: 3.13** | `<AuditTimeline>` grouped-by-session mode (fast follow) | New story |
| **New: 3.14** | Three-phase feedback Storybook pattern story — `useCommand` canonical usage documentation | New story |

**Epic 6 — Tenants Reference Module:**

| Story | Change | Type |
|-------|--------|------|
| **6.3** (Tenants CQRS integration) | Uses `pendingIds` for three-phase row marking. Uses batched toasts for sequential operations. | Modified |
| **6.4** (Tenants UI + shell integration) | Uses `<AuditTimeline>` for audit tab and standalone view. Uses `<ConsequencePreview>` for disable tenant and revoke user. Uses role tokens for badge colors. | Modified |

---

## Section 3: New Component Specifications

### 3.10: `<AuditTimeline>` — Event Timeline with Dual-Layer Display

**Purpose:** Display temporal event data as human-readable narratives with expandable technical detail. Reusable by any module with audit, activity, or event history capabilities.

**Inspiration:** Stripe event timeline (narrative + expandable detail), adapted for session grouping.

**MVP API:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `TEvent[]` | Yes | Array of event objects |
| `narrativeTemplate` | `(event: TEvent) => string` | Yes | Generic function receiving full event for contextual interpolation |
| `expandedDetailTemplate` | `(event: TEvent) => ReactNode` | No | Custom render for expanded detail panel. Default: JSON key-value display. |
| `onDateRangeChange` | `(start: Date, end: Date) => void` | No | Callback for server-side date range filtering |
| `onEventClick` | `(event: TEvent) => void` | No | Drill-down callback |
| `loading` | `boolean` | No | Shows content-aware skeleton (3 groups, 2 events each) |
| `emptyState` | `ReactNode` | No | Custom empty state content |
| `eventCategory` | `(event: TEvent) => 'access' \| 'admin'` | No | Determines left-border color per event (accent for access, neutral for admin) |
| `emphasis` | `(event: TEvent) => 'normal' \| 'assertive' \| 'urgent'` | No | Per-event emotional register for anomaly highlighting |

**Fast-follow API (compound components):**

```tsx
<AuditTimeline data={events} narrativeTemplate={toNarrative}>
  <AuditTimeline.SessionGroup
    groupBy="actorId"
    window={30 * 60 * 1000} // 30 minutes
  />
</AuditTimeline>
```

**Design tokens used:**
- Existing: `--spacing-lg` (event spacing), `--spacing-xl` (group spacing), `--color-text-*`, `--color-surface-*`, `--color-accent`
- New: `--timeline-connector-color` (Tier 3)

**Rendering:**
- Each event: narrative sentence (primary) + expandable detail panel (secondary)
- Expandable toggle: `Enter` to expand/collapse, `aria-expanded` attribute
- Event list: semantic `<ol>`, arrow keys to navigate
- Vertical connector line between events

**Accessibility:**
- Semantic `<ol>` for event list
- `aria-expanded` on expandable detail toggle
- Keyboard: `Enter` expand/collapse, `↑`/`↓` navigate events
- Screen reader: announces narrative text + timestamp

**Prop budget:** Complex — ≤ 20 props. Phase 2 features via `<AuditTimeline.SessionGroup>` compound component.

**Test requirements:**

| Test Type | Validation | Priority |
|-----------|-----------|----------|
| Playwright CT | Renders narratives; expandable detail open/close; keyboard nav; loading skeleton; empty state; date range callback | P0 |
| Accessibility | axe-core pass; `<ol>` semantics; `aria-expanded` | P0 |
| Visual regression | Both themes; populated; empty; loading; single event; 20+ events | P1 |
| Performance | 500 events < 100ms render time | P1 |

**Acceptance Criteria:**

**Given** an array of events is provided to `<AuditTimeline>`
**When** the component renders
**Then** each event displays as a human-readable narrative sentence generated by the `narrativeTemplate` function

**Given** an event in the timeline
**When** the user clicks the expand toggle or presses Enter
**Then** the technical detail panel expands below the narrative with `aria-expanded="true"`

**Given** `loading={true}`
**When** the component renders
**Then** a content-aware skeleton displays (3 session groups, 2 events each, connector line visible)

**Given** events with different `eventCategory` values
**When** the component renders
**Then** access events show accent-derived left border and admin events show neutral-derived left border

**Given** 500 events in the data array
**When** the component renders
**Then** initial render completes in < 100ms (measured by React profiler)

---

### 3.11: `<ConsequencePreview>` — Impact Display for High-Stakes Commands

**Purpose:** Display the consequences of a command before the user confirms. Reusable by any module with destructive or high-impact operations.

**API:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `consequences` | `Array<{ severity: 'info' \| 'warning' \| 'danger', message: string }>` | Yes | Consequence items |
| `loading` | `boolean` | No | Shows skeleton while consequences are computed |
| `compact` | `boolean` | No | Inline display within forms (reduced padding) |

**Design tokens used:**
- Existing: `--color-status-info`, `--color-status-warning`, `--color-status-danger`
- New: `--consequence-bg` (Tier 3) — subtle panel background distinct from surface colors. Light: amber-50. Dark: test carefully — fallback to `--color-surface-elevated` + left border accent if amber-950 looks muddy.

**Rendering:**
- Vertical list of consequence items
- Each item: severity icon (info/warning/danger) + message text
- Severity-appropriate colors from status tokens
- Visually distinct from form validation errors (different background, different icon set)
- Not a modal — renders inline before the action button
- Default emotional register: assertive. Escalates to urgent when any consequence has `severity: 'danger'`.

**Accessibility:**
- `role="alert"` with `aria-live="polite"`
- Screen readers announce consequences before the action button receives focus
- Severity icons have `aria-label` ("Warning", "Danger", "Info")

**Prop budget:** Simple — ≤ 12 props.

**Test requirements:**

| Test Type | Validation | Priority |
|-----------|-----------|----------|
| Playwright CT | Renders consequences with correct severity icons/colors; loading skeleton; compact mode | P0 |
| Accessibility | `role="alert"`, `aria-live="polite"`, screen reader announcement | P0 |
| Visual regression | Both themes; info/warning/danger severities; compact vs. standard; mixed severities | P1 |

**Acceptance Criteria:**

**Given** an array of consequences with mixed severities
**When** the component renders
**Then** each consequence shows the correct severity icon and color, and the panel background escalates to urgent treatment when any item has `severity: 'danger'`

**Given** `loading={true}`
**When** the component renders
**Then** a skeleton placeholder displays matching the consequence list layout

**Given** the consequence preview is rendered before an action button
**When** a screen reader reaches the action button
**Then** the consequences are announced via `aria-live` before the button receives focus

---

### 3.12: New Design Tokens

| Token | Tier | Purpose | Light Value | Dark Value |
|-------|------|---------|-------------|------------|
| `--role-owner-color` | Semantic (Tier 2) | TenantOwner badge. Highest visual weight — accent-derived. | `var(--primitive-color-accent-600)` | `var(--primitive-color-accent-400)` |
| `--role-contributor-color` | Semantic (Tier 2) | TenantContributor badge. Medium visual weight — neutral-derived. | `var(--primitive-color-neutral-600)` | `var(--primitive-color-neutral-400)` |
| `--role-reader-color` | Semantic (Tier 2) | TenantReader badge. Lowest visual weight — gray-derived. | `var(--primitive-color-gray-500)` | `var(--primitive-color-gray-400)` |
| `--timeline-connector-color` | Component (Tier 3) | Vertical line connecting audit timeline events. | `var(--color-border-secondary)` | `var(--color-border-secondary)` |
| `--consequence-bg` | Component (Tier 3) | ConsequencePreview panel background. | `var(--primitive-color-amber-50)` | Test: `var(--primitive-color-amber-950)` or fallback to `var(--color-surface-elevated)` |

**Token budget impact:** +3 Tier 2 + 2 Tier 3 = 5 tokens. Within budget (Tier 2 ≤ 80, Tier 3 ≤ 40).

**Compliance requirement:** Role tokens must have minimum ΔE (perceptual color difference) between them to ensure visual distinguishability. Add to token compliance scan.

**Acceptance Criteria:**

**Given** the role tokens are defined
**When** the token parity checker runs
**Then** all 3 role tokens have light AND dark values, and ΔE between any two role tokens ≥ 20

**Given** `--consequence-bg` in dark theme
**When** rendered on a dark surface
**Then** the contrast between consequence text and background meets WCAG AA (4.5:1)

---

### 3.14: Three-Phase Feedback Storybook Pattern Story

**Purpose:** Canonical `useCommand` usage documentation showing the optimistic → confirming → confirmed pattern. Serves as both developer documentation and visual test specification.

**Content:**
- Interactive Storybook story demonstrating a table row being removed via three-phase feedback
- Phase 1: row dims (40% opacity, strikethrough) — marked, not removed
- Phase 2: animated underline, "Confirming removal..." micro-text
- Phase 3: row slides out (200ms, `prefers-reduced-motion`: instant), toast with undo
- Shows `pendingIds` usage pattern
- Includes additive variant (Phase 1: provisional row inserted, Phase 3: replaced by real projection data)

**Code example displayed in story:**

```typescript
const { submit, pendingIds } = useCommand('RemoveUserFromTenant');

const rowClassName = (member) =>
  pendingIds.includes(member.userId) ? 'row-pending-removal' : undefined;

const { data: members } = useProjection<TenantMember[]>(
  'GetTenantUsersQuery', { tenantId }
);
```

**Acceptance Criteria:**

**Given** a developer opens the Three-Phase Feedback story in Storybook
**When** they interact with the "Remove" button on a table row
**Then** they see the complete Phase 1 → Phase 2 → Phase 3 → Undo sequence animated in real-time with code snippets visible alongside

---

## Section 4: Hook Enhancement

### 2.10 (modified 2.3): `useCommand` `pendingIds`

**Current:** `useSubmitCommand` returns `{ submit, status, error }`.

**Proposed:** `useSubmitCommand` returns `{ submit, status, error, pendingIds }` where `pendingIds: Set<string>` tracks entity IDs of submitted-but-not-confirmed commands.

**Behavior:**
- When `submit({ entityId: 'alex@acme.com', ... })` is called, `'alex@acme.com'` is added to `pendingIds`
- When SignalR delivers a projection update for the entity, `'alex@acme.com'` is removed from `pendingIds`
- Multiple commands can be in-flight simultaneously — `pendingIds` is a Set, not a single value
- If degradation threshold (15s) is reached without confirmation, the entity ID remains in `pendingIds` — the UI's degradation pattern handles the visual escalation

**Toast batch consolidation (new story 2.10):**
- Multiple Phase 3 confirmations arriving within a 100ms window batch into a single toast
- Example: "Removed ext-vendor-9 from 2 tenants" instead of two separate toasts
- Prevents toast overflow during Sofia's rapid sequential revocation (Journey 3)

**Acceptance Criteria:**

**Given** a command is submitted with an entityId
**When** `submit()` resolves successfully
**Then** the entityId appears in the `pendingIds` Set

**Given** an entityId is in `pendingIds`
**When** a SignalR projection update arrives for that entity
**Then** the entityId is removed from `pendingIds`

**Given** 3 commands are submitted within 100ms
**When** all 3 Phase 3 confirmations arrive within 100ms of each other
**Then** a single batched toast displays (e.g., "3 actions confirmed")

---

## Section 5: `<PageLayout>` Variant Confirmation

The Tenants UX spec assumes `<PageLayout>` supports two variants:
- `variant="full-width"` — tables, timelines (content fills available width)
- `variant="constrained"` — forms, detail views, search (max-width for readability)

**Action needed:** Confirm these variants exist in the current `<PageLayout>` implementation. If not, add them as part of Epic 3 structural components (Story 3.1 or new story).

---

## Section 6: Delivery Phasing

| Priority | Deliverable | Blocks |
|----------|------------|--------|
| **P0** | `useCommand` `pendingIds` (Story 2.3 modification) | Tenants Phase 1 — three-phase feedback on any table |
| **P0** | Role semantic tokens (Story 3.12) | Tenants Phase 1 — role badges in member table |
| **P0** | `<PageLayout>` variant confirmation | Tenants Phase 1 — all screens |
| **P1** | `<ConsequencePreview>` (Story 3.11) | Tenants Phase 2 — revoke user, disable tenant |
| **P1** | `<AuditTimeline>` MVP flat (Story 3.10) | Tenants Phase 2 — audit tab and standalone view |
| **P1** | Toast batch consolidation (Story 2.10) | Tenants Phase 2 — incident response rapid revocation |
| **P2** | Three-phase Storybook story (Story 3.14) | Documentation — not blocking implementation |
| **P2** | `<AuditTimeline>` grouped mode (Story 3.13) | Tenants Phase 3 — fast follow enhancement |

**Timeline alignment:** P0 items should land by FrontShell Week 2 (structural components). P1 items should land by Week 3-4 (content components). P2 items are Week 5 extensions.

---

## Section 7: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `<AuditTimeline>` performance at 500 events | Medium | High — slow audit is unusable for Sofia | Performance benchmark as P0 test. Virtual scrolling fallback if initial render > 100ms. |
| `--consequence-bg` dark mode appearance | Medium | Low — visual-only, no functional impact | Test both themes in Storybook before shipping. Fallback: border accent instead of background fill. |
| `pendingIds` memory leak if Phase 3 never arrives | Low | Medium — growing Set degrades performance | Cleanup timer: remove entries from `pendingIds` after degradation threshold (15s). Matches existing degradation pattern. |
| Role token ΔE insufficient with final palette | Low | Medium — roles indistinguishable for color-blind users | Minimum ΔE threshold in token compliance scan. Role badges always include text label alongside color. |
| `<PageLayout>` variants don't exist yet | Medium | High — blocks all Tenants screens | Confirm early. If missing, simple CSS implementation (max-width toggle) — not a complex component change. |
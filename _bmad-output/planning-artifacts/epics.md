---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
---

# Hexalith.FrontShell - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Hexalith.FrontShell, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Module Development (FR1-FR8)**
- FR1: Module developer can scaffold a new module with a single CLI command that produces a complete, runnable example
- FR2: Module developer can run a scaffolded module with working example code immediately without configuration
- FR3: Module developer can run scaffolded tests that pass without modification
- FR4: Module developer can define module routes and navigation items through a typed manifest
- FR5: Module developer can use any React library or pattern within their module boundary without restriction
- FR6: Module developer can develop their module independently without cloning the full shell repository
- FR7: Module developer defines their own domain types (command shapes, projection view models) within their module boundary
- FR8: Module developer can generate new commands, queries, and components within an existing module using CLI generators *(Phase 2)*

**CQRS Integration (FR9-FR17)**
- FR9: Module developer can send commands to the backend without writing transport, serialization, or authentication code
- FR10: Module developer can query projection data without writing transport code
- FR11: Module developer can receive fresh projection data via SignalR push notifications and configurable polling without managing refresh lifecycle — SignalR provides real-time invalidation signals, polling serves as fallback and periodic refresh; same hook API regardless of transport
- FR12: Module developer can observe projection data connection state (connected, reconnecting, disconnected)
- FR13: Module developer can rely on SignalR push notifications as the primary data freshness mechanism, with automatic polling as fallback — the query hook API is transport-agnostic
- FR14: Module developer can test command and projection interactions using provided mock implementations
- FR15: Module developer can simulate projection update events in tests using mock implementations
- FR16: Module developer can access command execution results (success, validation errors, failures) to provide user feedback
- FR17: Module developer can configure projection refresh behavior (interval, on-demand, or event-triggered)

**Shell Composition (FR18-FR29)**
- FR18: Shell discovers and registers modules from their typed manifests at build time
- FR19: Shell provides unified navigation across all registered modules
- FR20: Shell provides a consistent page layout (sidebar, main content area, top bar) for all modules
- FR21: Shell isolates module failures so one module's error does not affect other modules
- FR22: Shell displays contextual error messages when a module or backend service is unavailable
- FR23: Shell validates manifests at build time — type errors and semantic errors (duplicate routes, invalid navigation) prevent the build
- FR24: CI detects and rejects cross-module dependencies — zero imports between modules allowed
- FR25: End user can retry a failed module operation without leaving the current page
- FR26: End user can switch between modules without losing navigation and filter state
- FR27: End user can see an indicator when projection data freshness is degraded (SignalR disconnection, polling failures, or elevated latency)
- FR28: Shell validates that registered modules render successfully at runtime, with fallback to error boundary if loading fails
- FR29: Shell team can add a new module to the shell by adding its repository reference — module routes and navigation are automatically registered from the manifest

**Authentication & Multi-Tenancy (FR30-FR38)**
- FR30: End user can authenticate through the organization's identity provider
- FR31: Shell manages authentication tokens (acquisition, refresh, expiry) without module involvement
- FR32: Shell provides tenant context to all modules
- FR33: Module developer can access authenticated user information through shell-provided context
- FR34: Module developer can access current tenant information through shell-provided context
- FR35: System displays a diagnostic message when the authentication service is unreachable
- FR36: Authentication tokens are injected into every shell-managed backend request and connection establishment, including on token refresh
- FR37: End user can log out and terminate their authenticated session
- FR38: End user can switch between tenants they have access to without logging out

**Component Library (FR39-FR41)**
- FR39: Module developer can build standard UI patterns (tables, forms, detail views, layouts) using provided opinionated components — shell-facing surfaces use shared component library exclusively; module-internal visualizations may use any React library wrapped in shell layout components
- FR40: Module developer can compose page layouts using provided layout components
- FR41: Module developer can display standardized UI states (loading, error, empty) using provided components

**AI Module Generation (FR42-FR46)**
- FR42: Platform provides a machine-readable knowledge bundle describing manifest schema, hook API, and component catalog
- FR43: AI agent can generate a module from a domain description that passes all quality gates without manual correction
- FR44: AI-generated modules pass the same quality gates as human-authored modules
- FR45: Platform provides prompt templates for AI module generation
- FR46: Module developer can view validation results when an AI-generated module fails quality gates

**Build & Deployment (FR47-FR51)**
- FR47: Module developer can publish their module to the shell via git repository integration
- FR48: Shell CI pipeline validates module manifests and runs module tests on every build
- FR49: Shell build produces a static deployment artifact (HTML/CSS/JS) that can be served by any web server
- FR50: Shell can be configured for different environments without code changes (API URLs, auth provider, tenant configuration)
- FR51: Shell captures module error events and exposes them for external monitoring integration

**Testing Strategy & Quality Gates (FR52-FR57)**
- FR52: CI pipeline enforces a test-first workflow: ATDD workflow generates failing acceptance tests from story specifications; CI rejects implementation PRs that lack corresponding acceptance tests
- FR53: Test Design workflow produces a risk-calibrated test strategy per epic that adjusts test pyramid ratios based on risk profile
- FR54: Traceability workflow generates a requirements-to-tests matrix mapping every acceptance criterion to at least one test, with gap identification and quality gate recommendation (PASS/CONCERNS/FAIL)
- FR55: Test Review workflow validates test quality against defined standards (deterministic, isolated, explicit assertions, less than 300 lines per file, less than 1.5 minutes per test)
- FR56: Platform supports consumer-driven contract tests at the CQRS boundary (CommandApi and projection API) to verify frontend-backend compatibility independently
- FR57: CI pipeline blocks production deployment when contract verification fails

**Developer Documentation (FR58-FR59)**
- FR58: Module developer can follow a Getting Started guide to scaffold and ship their first module
- FR59: Platform provides a frontend-focused guide covering the complete module development lifecycle with backend context where needed

**Migration (FR60)**
- FR60: Module developer can migrate an existing custom React application to FrontShell by replacing infrastructure code with shell-provided equivalents while keeping domain components unchanged

**Phase 2 Capabilities (FR61-FR73)**
- FR61: Module developer can contribute UI to named shell slots (sidebar, toolbar, statusbar)
- FR62: Shell manages module lifecycle states (activate, deactivate, health/readiness)
- FR63: Shell broadcasts typed infrastructure signals to modules (auth changed, theme changed, tenant switched)
- FR64: Shell reconciles layout from module declarations and shell configuration
- FR65: Platform generates TypeScript types automatically from backend API contracts
- FR66: Module developer can verify their module's compatibility with current shell package versions
- FR67: Shell team can view platform adoption metrics (modules onboarded, self-service rate, build times)
- FR68: End user can search across module boundaries from a unified search interface
- FR69: System notifies the end user of command completion or failure even after navigating away from the originating module
- FR70: Shell exposes health status for monitoring
- FR71: Shell team can remove a module from the shell without affecting other modules
- FR72: Module developer can customize component library theming within shell-defined constraints
- FR73: Shell team can deprecate shell package APIs with automated warnings to affected modules

### NonFunctional Requirements

**Performance**
- NFR1: Module page load (navigation between modules) < 1 second
- NFR2: useProjection initial data < 500ms (excluding network latency)
- NFR3: useCommand round-trip < 2 seconds (includes backend processing)
- NFR4: Dev server hot-reload < 2 seconds
- NFR5: Build time <= 90 seconds with 10 modules
- NFR6: Shell initial load (cold start) < 3 seconds on 4G

**Security**
- NFR7: Authentication protocol: OIDC / OAuth2, shell manages token lifecycle
- NFR8: Module isolation via typed manifest boundary (MVP)
- NFR9: Tenant isolation: shell-enforced tenant context, all CQRS operations scoped to active tenant
- NFR10: Token propagation: automatic, module-transparent
- NFR11: Data in transit: TLS 1.2+ required
- NFR12: GDPR awareness: data minimization in frontend, no PII in storage beyond session token

**Scalability**
- NFR13: 5 modules without degradation (MVP)
- NFR14: 20 modules without degradation (Phase 2)
- NFR15: Manifest registry O(n) linear scaling
- NFR16: Per-module bundle size tracked, alert on > 30% increase

**Accessibility**
- NFR17: WCAG Level AA compliance
- NFR18: Full keyboard navigation support
- NFR19: Screen reader compatibility with ARIA landmarks and labels
- NFR20: Automated axe-core testing in CI, violations block merge

**Integration**
- NFR21: CommandApi compatibility with Hexalith.EventStore REST API
- NFR22: Projection queries via per-microservice REST endpoints
- NFR23: Projection freshness via SignalR push notifications with ETag-optimized re-query + configurable polling fallback
- NFR24: DAPR-agnostic at module level
- NFR25: Manual TypeScript type definitions (MVP), OpenAPI codegen Phase 2
- NFR26: Consumer-driven contract testing — frontend-backend API compatibility verified independently. Consumer contract tests define expected CommandApi and projection API interactions. Provider verification runs on backend PR. can-i-deploy gate blocks incompatible deployments.

**Reliability**
- NFR27: 99.9% availability at shell level
- NFR28: Partial failure tolerance: module error boundary with retry
- NFR29: Error boundary with no stale projections (MVP); stale-while-revalidate Phase 2
- NFR30: Shell crash recovery via full page reload with session preservation
- NFR31: Zero module code changes on transport switch (ports-and-adapters)

**Testing & Quality Gates**
- NFR32: CI pipeline — smoke stage less than 5 minutes
- NFR33: CI pipeline — regression stage less than 30 minutes
- NFR34: CI pipeline — release gate stage less than 60 minutes
- NFR35: Test flakiness rate less than 2%
- NFR36: Test quality — determinism: zero hard waits, zero conditional flow
- NFR37: Test quality — isolation: self-cleaning, parallel-safe, no shared state
- NFR38: Test quality — focus: less than 300 lines per test file, less than 1.5 minutes per test
- NFR39: Quality gate model: objective PASS/CONCERNS/FAIL decision
- NFR40: Acceptance criteria traceability: 100% mapped to at least 1 test
- NFR41: Test pyramid — risk-calibrated ratio adjusted per epic

**Developer Experience**
- NFR42: <= 15 public exports per foundation package
- NFR43: Descriptive error messages with context
- NFR44: Documentation examples compile and run
- NFR45: Strict semver on all @hexalith/* packages
- NFR46: One minor version deprecation grace period
- NFR47: Scaffold CI smoke test validates compilable, testable output
- NFR48: No module dependency conflicts, enforced at build time

### Additional Requirements

**From Architecture:**
- Starter template: Turborepo + pnpm workspaces (design-system example) — initialization command is first implementation story
- Implementation sequence: (1) Platform monorepo scaffold, (2) Design tokens + compliance scanner, (3) @hexalith/shell-api, (4) @hexalith/cqrs-client, (5) @hexalith/ui, (6) Shell application, (7) create-hexalith-module CLI, (8) Reference module (Tenants), (9) CI pipeline
- Client-side state: React Context (shell) + ETag-based projection caching with in-memory store
- Authentication: oidc-client-ts + react-oidc-context (provider-agnostic OIDC)
- REST client: native fetch API with auth/tenant injection via wrapper function
- Runtime validation: Zod for projection data validation
- Command lifecycle: status polling (GET /api/v1/commands/status/{correlationId}) with Retry-After: 1
- Projection freshness: SignalR push notifications triggering ETag-optimized re-query + command-complete invalidation + configurable background polling fallback
- Error hierarchy: typed HexalithError subclasses (ApiError, ValidationError, CommandRejectedError, CommandTimeoutError, AuthError, ForbiddenError, RateLimitError)
- Module loading: React.lazy() + Suspense + per-module error boundaries
- CI/CD: GitHub Actions + Turborepo Remote Cache, single pipeline with build-lint-test-coverage-manifest gates
- Deployment: static SPA (nginx) on Kubernetes, runtime /config.json via ConfigMap
- Environment config: Vite .env (build-time) + runtime /config.json (deployment-time)
- Package dependency rules: strict import boundaries enforced by ESLint
- Contract testing: parameterized test suites validating mock/real implementation parity
- Mock fidelity: MockCommandBus/MockQueryBus must simulate async timing, error modes, lifecycle events
- Naming conventions: PascalCase components, camelCase hooks, I-prefix interfaces, union types over enums
- File organization: co-located tests, no __tests__ dirs, barrel exports only at package root
- Git submodule module distribution: each module is independent repo consumed as submodule

**From UX Design:**
- Design tokens: 3-tier taxonomy (primitive ~60, semantic ~80, component ~30), budget: Tier 1+2 <= 150, Tier 3 <= 40
- CSS @layer cascade: reset → tokens → primitives → components → density → module
- Radix Primitives: encapsulated inside @hexalith/ui, module developers never import directly
- Component delivery roadmap: Week 1 tokens+scanner, Week 1-2 layout, Week 2 primitives, Week 2-3 feedback, Week 3 navigation, Week 3-4 data/overlay
- Component API: prop budgets (simple <= 12, complex <= 20), semantic props only, domain-terms not primitive-terms
- View-type density profiles: table (compact/Linear), form comfortable (Notion), form compact (enterprise), detail (Notion)
- Three-phase feedback: optimistic → confirming → confirmed (CQRS-specific)
- Status bar: tenant context, connection health, last command status, active module (28px, always visible)
- Dark mode: simultaneous light+dark design, token parity enforcement in CI
- Accessibility pipeline: token-level contrast, component-level axe-core, composition-level landmarks
- Storybook: product showcase with realistic data, composition stories, copy-friendly code
- Navigation cache: stale-while-revalidate for return visits, scroll/filter state preservation
- Signature interaction: design decision required — one visual moment for scaffold credibility
- Content-aware skeletons mandatory, generic spinners forbidden, CLS budget = 0
- Emotional registers: quiet (idle), neutral (work), assertive (feedback), urgent (alerts)
- Component contribution pipeline with triage tracks (fast-track 2d, standard 5d, emergency 1d)
- Migration coexistence policy: max 3 months warning-mode for legacy component libraries
- Responsive: desktop-first, breakpoint tokens, no mobile-specific MVP features

### FR Coverage Map

**Epic 1: Platform Foundation & Authentication**
- FR20: Shell provides a consistent page layout (sidebar, main content area, top bar) for all modules
- FR30: End user can authenticate through the organization's identity provider
- FR31: Shell manages authentication tokens (acquisition, refresh, expiry) without module involvement
- FR32: Shell provides tenant context to all modules
- FR33: Module developer can access authenticated user information through shell-provided context
- FR34: Module developer can access current tenant information through shell-provided context
- FR35: System displays a diagnostic message when the authentication service is unreachable
- FR36: Authentication tokens are injected into every shell-managed backend request and connection establishment
- FR37: End user can log out and terminate their authenticated session
- FR38: End user can switch between tenants they have access to without logging out
- FR49: Shell build produces a static deployment artifact (HTML/CSS/JS)
- FR50: Shell can be configured for different environments without code changes

**Epic 2: Backend Integration — Commands, Projections & Real-Time**
- FR9: Module developer can send commands without writing transport, serialization, or auth code *(Stories 2.2, 2.3)*
- FR10: Module developer can query projection data without writing transport code *(Stories 2.2, 2.4, 2.8)*
- FR11: Module developer can receive fresh projection data via SignalR push notifications and configurable polling *(Stories 2.5, 2.7)*
- FR12: Module developer can observe projection data connection state — HTTP + SignalR composite *(Stories 2.5, 2.7)*
- FR13: Module developer can rely on SignalR push as primary data freshness mechanism with polling fallback *(Stories 2.5, 2.7)*
- FR14: Module developer can test command, query, and SignalR interactions using provided mock implementations *(Story 2.6)*
- FR15: Module developer can simulate projection update events in tests using MockSignalRHub *(Story 2.6)*
- FR16: Module developer can access command execution results and pre-flight authorization status *(Stories 2.3, 2.9)*
- FR17: Module developer can configure projection refresh behavior — SignalR push, polling interval, on-demand *(Stories 2.4, 2.7)*

**Epic 3: Component Library — Beautiful by Default**
- FR39: Module developer can build standard UI patterns using provided opinionated components — shell-facing surfaces use shared component library exclusively; module-internal visualizations may use any React library wrapped in shell layout components
- FR40: Module developer can compose page layouts using provided layout components
- FR41: Module developer can display standardized UI states (loading, error, empty) using provided components

**Epic 4: Module Scaffold & Independent Development**
- FR1: Module developer can scaffold a new module with a single CLI command
- FR2: Module developer can run a scaffolded module with working example code immediately
- FR3: Module developer can run scaffolded tests that pass without modification
- FR4: Module developer can define module routes and navigation items through a typed manifest
- FR5: Module developer can use any React library or pattern within their module boundary
- FR6: Module developer can develop their module independently without cloning the full shell repository
- FR7: Module developer defines their own domain types within their module boundary
- FR58: Module developer can follow a Getting Started guide
- FR59: Platform provides a frontend-focused guide covering the complete module development lifecycle

**Epic 5: Shell Composition & Multi-Module Experience**
- FR18: Shell discovers and registers modules from their typed manifests at build time
- FR19: Shell provides unified navigation across all registered modules
- FR21: Shell isolates module failures so one module's error does not affect other modules
- FR22: Shell displays contextual error messages when a module or backend service is unavailable
- FR23: Shell validates manifests at build time — type errors and semantic errors prevent the build
- FR24: CI detects and rejects cross-module dependencies
- FR25: End user can retry a failed module operation without leaving the current page
- FR26: End user can switch between modules without losing navigation and filter state
- FR27: End user can see an indicator when projection data freshness is degraded (SignalR disconnection, polling failures, or elevated latency)
- FR28: Shell validates that registered modules render successfully at runtime
- FR29: Shell team can add a new module by adding its repository reference

**Epic 6: Build Pipeline, Quality Gates & Reference Module**
- FR47: Module developer can publish their module to the shell via git repository integration
- FR48: Shell CI pipeline validates module manifests and runs module tests on every build
- FR51: Shell captures module error events and exposes them for external monitoring integration
- FR52-FR57: Testing Strategy & Quality Gates (FR56 partially covered by Epic 2; FR52-FR55, FR57 covered by Story 6.6)
- (Validates all previous epics end-to-end via Tenants reference module)

**Epic 7: AI Module Generation**
- FR42: Platform provides a machine-readable knowledge bundle
- FR43: AI agent can generate a module that passes all quality gates without manual correction
- FR44: AI-generated modules pass the same quality gates as human-authored modules
- FR45: Platform provides prompt templates for AI module generation
- FR46: Module developer can view validation results when an AI-generated module fails quality gates

**Phase 2 (deferred)**
- FR8, FR60, FR61-FR73

**Coverage verification:** 60 MVP FRs assigned (FR1-FR7, FR9-FR59). 14 Phase 2 FRs deferred (FR8, FR60, FR61-FR73). Total 73 FRs. Zero gaps.

## Epic List

### Epic 1: Platform Foundation & Authentication
A developer sets up the monorepo and runs a shell application with full OIDC authentication, tenant switching, status bar, and the platform's visual identity. Basic CI (build + lint + test) runs from day one. ATDD practice (write failing acceptance tests from ACs before implementation) is established and used from this epic onward.
**FRs covered:** FR20, FR30-FR38, FR49, FR50
**NFRs addressed:** NFR6, NFR7-NFR12
**Key deliverables:** Turborepo + pnpm scaffold, design tokens + compliance scanner, @hexalith/shell-api (AuthProvider, TenantProvider, ThemeProvider, LocaleProvider, manifest types), basic shell app (sidebar, top bar, status bar), OIDC auth (oidc-client-ts + react-oidc-context), runtime /config.json, static build, basic CI pipeline (build + lint + test)
**Internal parallelism:** Stories 1.1-1.2 (scaffold + tokens) and Stories 1.3-1.4 (shell-api providers) are independent work streams that can execute in parallel within Epic 1. Story 1.2 unblocks Epic 3; Stories 1.3-1.4 unblock Epic 2. Plan sprints accordingly to avoid either parallel track becoming a bottleneck.
**ATDD practice:** Starting from Story 1.3, every story follows the pattern: write failing acceptance tests from ACs → implement → tests pass. This establishes the test-first discipline (FR52) as team habit before CI enforcement arrives in Epic 6.

### Epic 2: Backend Integration — Commands, Projections & Real-Time
Module developers can send CQRS commands, query projection data with ETag-optimized caching, receive real-time projection updates via SignalR, check authorization pre-flight, observe connection state, handle structured errors, and test with faithful mocks — zero infrastructure code. [Recommended before Epic 3 if team is small; can parallel with Epic 3 if team is sized for it]
**FRs covered:** FR9-FR17
**NFRs addressed:** NFR2, NFR3, NFR21-NFR25, NFR31
**Key deliverables:** @hexalith/cqrs-client package with `core/` (types, fetchClient, ProblemDetails parser, ULID correlationId), `commands/` (useSubmitCommand, useCommandStatus, useCommandPipeline), `queries/` (useQuery, etagCache), `notifications/` (useSignalR, useProjectionSubscription), `validation/` (useCanExecuteCommand, useCanExecuteQuery), mock implementations (MockCommandBus, MockQueryBus, MockSignalRHub), contract tests, Zod runtime validation, typed error hierarchy
**Dependencies:** `@microsoft/signalr` (~30KB gzipped), `ulidx` (ULID generation)
**Sequencing note:** Stories 2.1-2.6 deliver the polling-first MVP. Stories 2.7-2.8 layer SignalR and ETag caching on top. Story 2.9 adds pre-flight authorization. Each phase is independently shippable. If team cannot staff two parallel tracks, execute Epic 2 before Epic 3.

### Epic 3: Component Library — Beautiful by Default
Module developers build production-quality pages using @hexalith/ui. Layout, feedback, navigation, data, and overlay components work beautifully in light and dark themes with WCAG AA accessibility. [Recommended after Epic 2 if team is small; can parallel with Epic 2 if team is sized for it]
**FRs covered:** FR39-FR41
**NFRs addressed:** NFR17-NFR20
**Key deliverables:** @hexalith/ui package (Radix wrapping), CSS @layer enforcement, 3-tier design tokens, structural components (PageLayout, Stack, Inline, Divider), feedback (Toast, Skeleton, EmptyState, ErrorBoundary), navigation (Sidebar, Tabs), interactive (Button, Input, Select, Tooltip), data (Table, Form, DetailView), overlay (Modal, AlertDialog, DropdownMenu, Popover), Storybook product showcase, dual-theme parity, accessibility pipeline
**Internal sequence:** Tokens/layout (Week 1-2) → feedback/navigation (Week 2-3) → data/overlay (Week 3-4)
**Acceleration option:** Epic 3 can be split into 3A (core: Stories 3.1-3.3 + 3.5 — PageLayout, Stack, Button, Input, Select, Table core, Skeleton, EmptyState, ErrorBoundary — the minimum set Epic 4's scaffold needs) and 3B (polish: Stories 3.4, 3.6-3.9 — Sidebar, Tabs, advanced table, Form, DetailView, overlays, Storybook showcase). 3A blocks Epic 4; 3B can run in parallel with Epic 4. This reduces the "foundation tax" before the first scaffold demo.

### Epic 4: Module Scaffold & Independent Development
A developer runs one CLI command and has a complete, premium-looking module with example code using CQRS hooks and @hexalith/ui components, passing tests, and a dev host — productive within 30 minutes. Documentation guides the full lifecycle.
**FRs covered:** FR1-FR7, FR58-FR59
**NFRs addressed:** NFR4, NFR42-NFR48
**Key deliverables:** create-hexalith-module CLI, dev host (MockShellProvider + mock auth/tenant + MockSignalRHub), scaffold showcase (Table + DetailView + Form + command feedback using `useCommandPipeline` and `useQuery`), Getting Started guide, module development lifecycle guide
**Dependencies:** Epics 1, 2, 3

### Epic 5: Shell Composition & Multi-Module Experience
End users navigate between multiple modules as one seamless application. Module failures are isolated, state and scroll position are preserved, and manifests are validated at build time. Navigation is unified and modules integrate automatically.
**FRs covered:** FR18-FR19, FR21-FR29
**NFRs addressed:** NFR1, NFR8, NFR13, NFR15, NFR27-NFR30
**Key deliverables:** Module registry, React.lazy() + Suspense loading, per-module error boundaries, navigation cache (stale-while-revalidate), scroll/filter preservation, manifest validation (type + semantic), cross-module dependency detection (ESLint), unified sidebar navigation
**Dependencies:** Epics 1, 4

### Epic 6: Build Pipeline, Quality Gates & Reference Module
Module developers publish via git integration with full CI enforcement. The Tenants reference module validates the complete platform stack end-to-end. Elena can manage tenants through the shell.
**FRs covered:** FR47-FR48, FR51-FR57
**NFRs addressed:** NFR5, NFR16, NFR47
**Key deliverables:** Full GitHub Actions pipeline (Turborepo remote cache, scaffold smoke test, Design System Health gate, coverage gates ≥80%/≥95%, manifest validation, a11y audit), Tenants module as git submodule (realistic CQRS integration, all @hexalith/ui components exercised), monitoring integration hooks, CI-enforced ATDD workflow (formalizing the practice established in Epic 1), traceability matrix, test review workflow
**Dependencies:** Epics 1-5
**External dependency (RISK):** Stories 6.3-6.4 (Tenants reference module) require a working Tenants backend (CommandApi endpoints for create/update/disable tenant, projection query endpoints for tenant list/detail). If the Tenants backend is not available, these stories are blocked on an external team.
**Entry criteria:** Before sprint planning Epic 6, verify: (1) Tenants CommandApi endpoints return 202 for valid commands, (2) Tenants projection query endpoints return realistic data, (3) command status polling endpoint works for tenant commands. If any criterion fails, swap Stories 6.3-6.4 for "mock-backend integration test" variants using MockCommandBus/MockQueryBus and defer real E2E to a fast-follow sprint once backend is ready.

### Epic 7: AI Module Generation
AI agents can generate complete modules from domain descriptions that pass all quality gates without manual correction. Knowledge bundles and prompt templates enable reliable AI generation.
**FRs covered:** FR42-FR46
**Key deliverables:** Machine-readable knowledge bundle (manifest schema, hook API, component catalog), prompt templates, AI generation pipeline, validation feedback for failed gates
**Dependencies:** Epics 1-6
**Note:** Last MVP epic — can slip to early Phase 2 if timeline pressure

### Phase 2 Capabilities (deferred)
**FRs covered:** FR8, FR60, FR61-FR73
**Includes:** CLI generators (FR8), migration (FR60), shell slots (FR61), module lifecycle (FR62), typed signals (FR63), layout reconciliation (FR64), OpenAPI codegen (FR65), compatibility checker (FR66), adoption metrics (FR67), cross-module search (FR68), cross-module notifications (FR69), health endpoint (FR70), module removal (FR71), theming customization (FR72), API deprecation (FR73)

### Dependency Flow

**If team supports parallel tracks (≥ 4 developers):**
```
Epic 1 (Foundation) ─── internal parallel: [1.1-1.2 tokens] + [1.3-1.4 providers]
  ├──→ Epic 2 (CQRS)  ──┐
  └──→ Epic 3 (UI)    ──┤
                         ├──→ Epic 4 (Scaffold) ──→ Epic 5 (Composition) ──→ Epic 6 (Pipeline + Tenants) ──→ Epic 7 (AI)
```

**If team is small (2-3 developers) — recommended sequence:**
```
Epic 1 (Foundation) → Epic 2 (CQRS) → Epic 3 (UI) → Epic 4 (Scaffold) → Epic 5 (Composition) → Epic 6 (Pipeline + Tenants) → Epic 7 (AI)
```

**ATDD practice:** Established in Epic 1, used throughout all epics. CI enforcement of ATDD formalized in Epic 6 Story 6.6.

**External dependency:** Epic 6 Stories 6.3-6.4 require Tenants backend availability (see Epic 6 risk note).

---

## Epic 1: Platform Foundation & Authentication

A developer sets up the monorepo and runs a shell application with full OIDC authentication, tenant switching, status bar, and the platform's visual identity. Basic CI (build + lint + test) runs from day one. ATDD practice established: from Story 1.3 onward, every story begins with failing acceptance tests written from ACs before implementation.

**Internal parallelism:** Stories 1.1-1.2 (scaffold + tokens) and Stories 1.3-1.4 (providers) can execute in parallel. Story 1.2 unblocks Epic 3; Stories 1.3-1.4 unblock Epic 2.

### Story 1.1: Monorepo Scaffold with Running Dev Server

As a shell team developer,
I want to initialize the project monorepo with Turborepo and pnpm workspaces,
So that I have a structured project foundation with running dev server and all package directories ready.

**Acceptance Criteria:**

**Given** a developer runs the Turborepo initialization command
**When** the scaffold completes
**Then** the following workspace structure exists: `apps/shell/`, `packages/shell-api/`, `packages/cqrs-client/`, `packages/ui/`, `packages/tsconfig/`, `packages/eslint-config/`, `modules/`, `tools/create-hexalith-module/`
**And** `pnpm-workspace.yaml` includes `packages/*`, `apps/*`, `modules/*`, `tools/*`
**And** `turbo.json` defines `build`, `lint`, `test`, and `dev` task pipelines with correct dependency order
**And** a shared base `tsconfig.json` exists with TypeScript strict mode enabled
**And** a shared ESLint config exists with `no-restricted-imports` rules for Radix, oidc-client-ts, and CSS-in-JS libraries
**And** `apps/shell` is a Vite + React + TypeScript application that renders a placeholder page
**And** `pnpm dev` starts the shell dev server with HMR working
**And** `pnpm build` produces a production build without errors
**And** `pnpm lint` runs ESLint across all packages without errors

### Story 1.2: Design Tokens & Visual Identity

As a shell team developer,
I want to define the design token system with light and dark themes and a CI compliance scanner,
So that all future components inherit a consistent, premium visual identity that is structurally enforced.

**Acceptance Criteria:**

**Given** the token package is created
**When** a developer inspects the token definitions
**Then** Tier 1 (primitive) tokens exist with naming pattern `--primitive-{category}-{value}` covering colors, spacing, typography, and motion
**And** Tier 2 (semantic) tokens exist with naming pattern `--{category}-{element}-{property}-{variant?}` for text, surface, border, spacing, font, and motion
**And** both `light` and `dark` theme definitions exist under `:root[data-theme="light"]` and `:root[data-theme="dark"]`
**And** the CSS `@layer` cascade order is defined: `reset, tokens, primitives, components, density, module`
**And** a CSS reset layer normalizes box-sizing and margins
**And** spacing tokens follow a 4px base grid (8px preferred rhythm)
**And** typography tokens define a strict scale of 6-8 sizes with weight encoding hierarchy
**And** motion tokens default to 200ms ease-out with `prefers-reduced-motion` support

**Given** the token compliance scanner (PostCSS/Stylelint plugin) is created
**When** a CSS file contains a hardcoded color value like `#f5f5f5` instead of a token
**Then** the scanner reports a violation with actionable remediation guidance
**And** the scanner validates that every light theme token has a corresponding dark theme definition
**And** spatial tokens (spacing, radius, sizing) have identical values across themes
**And** the scanner runs as part of `pnpm lint` and produces a compliance score
**And** the scanner supports two modes: `development` (warn on violations, do not fail) and `ci` (fail on violations). Default is `development` for local `pnpm lint`; CI pipeline uses `ci` mode.

**Given** a deliberate token violation is introduced
**When** the CI pipeline runs in `ci` mode
**Then** the build fails with a clear error message identifying the violation and suggesting the correct token

**Given** a developer is iterating on a new component locally
**When** the scanner runs in `development` mode
**Then** violations are reported as warnings (yellow) with remediation guidance but do not block the build
**And** the developer can iterate on component structure before satisfying all token constraints

### Story 1.3: Shell API — Authentication Provider

As a module developer,
I want to access authenticated user information through shell-provided context,
So that I never handle tokens directly and authentication is completely invisible to my module code.

**Acceptance Criteria:**

**Given** the `@hexalith/shell-api` package is created with `AuthProvider` and `useAuth` hook
**When** a module developer calls `useAuth()` inside a component wrapped by `AuthProvider`
**Then** the hook returns `{ user, isAuthenticated, isLoading }` with typed user information including `sub` (user ID) and tenant claims
**And** the `AuthProvider` wraps `react-oidc-context` with `oidc-client-ts` for provider-agnostic OIDC

**Given** the user is not authenticated
**When** the `AuthProvider` detects no valid session
**Then** the user is redirected to the OIDC provider login page

**Given** the user has an active session with an expiring token
**When** silent token refresh occurs via iframe
**Then** the refresh is non-destructive: no navigation, no page reload, no React tree remount
**And** in-progress form data, scroll position, and component state survive the refresh

**Given** a module developer calls `useAuth()` outside of `AuthProvider`
**When** the hook is invoked
**Then** it throws a descriptive error: "useAuth must be used within AuthProvider"

**Given** the `@hexalith/shell-api` package is built
**When** inspecting the public API
**Then** `AuthProvider` and `useAuth` are named exports from `src/index.ts`
**And** the auth token is available internally for injection into HTTP requests (not exposed to modules)
**And** the package has co-located Vitest tests that pass

*FRs covered: FR30, FR31, FR33, FR36*

### Story 1.4: Shell API — Tenant, Theme & Locale Providers

As a module developer,
I want to access current tenant, theme preference, and locale through shell-provided context,
So that my module renders correctly for the active tenant in the user's preferred theme and language.

**Acceptance Criteria:**

**Given** `TenantProvider` and `useTenant` hook are implemented in `@hexalith/shell-api`
**When** a module developer calls `useTenant()`
**Then** the hook returns `{ activeTenant, availableTenants, switchTenant }` with typed tenant information
**And** `availableTenants` is populated from the JWT `eventstore:tenant` claim (multi-value)

**Given** `ThemeProvider` and `useTheme` hook are implemented
**When** a module developer calls `useTheme()`
**Then** the hook returns `{ theme, toggleTheme }` where theme is `'light' | 'dark'`
**And** the provider sets `data-theme` attribute on the document root element
**And** theme preference is persisted in localStorage

**Given** `LocaleProvider` and `useLocale` hook are implemented
**When** a module developer calls `useLocale()`
**Then** the hook returns `{ locale, formatDate, formatNumber, formatCurrency }` using `Intl.*` APIs

**Given** `ModuleManifest` type is defined in `@hexalith/shell-api`
**When** a module developer creates a manifest
**Then** TypeScript enforces required fields: `name`, `displayName`, `version`, `routes`, `navigation`
**And** the type supports `manifestVersion` discriminated union field for future schema evolution

**Given** any hook is called outside its provider
**When** the hook is invoked
**Then** it throws a descriptive error with the hook name and expected provider

*FRs covered: FR32, FR34*

### Story 1.5: Shell Application — Layout & Auth Flow

As an end user,
I want to authenticate via OIDC and see a consistent shell layout with sidebar, top bar, and content area,
So that I have a reliable, visually consistent entry point to the platform.

**Acceptance Criteria:**

**Given** the shell application in `apps/shell` is configured with all providers
**When** the app loads
**Then** the provider hierarchy is: `AuthProvider` → `TenantProvider` → `ThemeProvider` → `LocaleProvider` → layout
**And** the layout renders a sidebar (collapsible), top bar, and main content area using CSS Grid/Flexbox with design tokens

**Given** a user navigates to the shell URL without authentication
**When** the app detects no valid session
**Then** the user is redirected to the configured OIDC provider (from runtime `/config.json`)
**And** after successful authentication, the user is returned to the originally requested URL

**Given** an authenticated user is viewing the shell
**When** the user clicks the logout action
**Then** the authenticated session is terminated
**And** the user is redirected to the OIDC provider's logout endpoint
**And** session storage is cleared

**Given** the shell is rendered
**When** inspecting the HTML
**Then** semantic landmarks exist: `<nav>` for sidebar, `<main>` for content, `<header>` for top bar
**And** the layout uses design tokens exclusively — the token compliance scanner from Story 1.2 passes at 100% on all shell app CSS (zero hardcoded spacing, colors, or typography values)

**Given** a user accesses the shell on a 1280px desktop viewport
**When** the layout renders
**Then** the sidebar is visible and the content area fills the remaining width
**And** the layout does not produce horizontal overflow

**Given** the shell has no real modules yet
**When** the shell loads after authentication
**Then** a hardcoded placeholder module route renders a "Welcome to Hexalith.FrontShell" page with the platform's design tokens applied
**And** the placeholder demonstrates: authenticated user name in top bar, active tenant in status bar, sidebar with placeholder navigation, theme toggle working
**And** this is demo-ready — stakeholders can see auth + tenant + layout + navigation working end-to-end before any real module exists

*FRs covered: FR20, FR30, FR37*

### Story 1.6: Tenant Switching & Status Bar

As an end user,
I want to switch between tenants from the status bar and see operational context (connection health, last command status),
So that I always know which tenant I'm working in and whether the system is healthy.

**Acceptance Criteria:**

**Given** the status bar component is rendered at the bottom of the viewport
**When** the user inspects it
**Then** four segments are visible: tenant context, connection health, last command status, and active module
**And** the status bar is 28px tall, always visible, not collapsible
**And** the status bar uses `--color-surface-secondary` background and `--font-size-xs` for most segments
**And** the tenant segment uses `--font-size-sm` + `--font-weight-medium` + `--color-text-primary` for readability

**Given** a user has access to multiple tenants
**When** the user clicks the tenant segment in the status bar
**Then** a dropdown displays all available tenants from the JWT `eventstore:tenant` claim
**And** if the user has unsaved form data (dirty form state), a confirmation dialog appears: "Switching tenants will discard unsaved changes. Continue?" before updating `TenantProvider` context
**And** if no unsaved state exists, selecting a different tenant updates `TenantProvider` context immediately
**And** the tenant name truncates at 20 characters with full name on hover tooltip

**Given** the authentication service is unreachable
**When** the shell detects the failure
**Then** a diagnostic message is displayed to the user explaining the issue
**And** the connection health segment shows a red dot with "Disconnected" text

**Given** the connection health changes state
**When** the status transitions
**Then** connected shows a green dot (quiet register), reconnecting shows an amber pulse (neutral), disconnected shows a red dot + text (urgent register)
**And** after 10 seconds of disconnection, a non-dismissable banner appears above the status bar
**And** MVP connection health is based on HTTP reachability (successful/failed API requests), not WebSocket/SignalR state — SignalR is deferred to Phase 2

*FRs covered: FR35, FR38*

### Story 1.7: Environment Configuration & Static Build

As a platform operator,
I want to configure the shell for different environments via runtime config without code changes,
So that the same Docker image deploys against Keycloak (dev/staging) or Entra ID (production).

**Acceptance Criteria:**

**Given** the shell application is built
**When** the build completes
**Then** a static deployment artifact is produced (HTML/CSS/JS) servable by any web server
**And** the build output includes content-hashed filenames for long-term browser caching

**Given** a runtime `/config.json` file exists alongside the built application
**When** the shell loads
**Then** it reads `oidcAuthority`, `commandApiBaseUrl`, and `tenantClaimName` from `/config.json`
**And** the OIDC provider is configured from the runtime config (not build-time)
**And** Vite `.env` files provide build-time constants (`VITE_API_VERSION`, `VITE_APP_VERSION`)

**Given** the same built artifact is deployed to two environments with different `/config.json` files
**When** each environment loads the shell
**Then** one authenticates against Keycloak and the other against Entra ID, without any code changes
**And** the `commandApiBaseUrl` routes CQRS requests to the correct backend

**Given** `/config.json` is missing or malformed
**When** the shell attempts to load
**Then** a clear error message is displayed explaining what's wrong and what the expected format is

**Given** `/config.json` is valid and the shell starts
**When** the startup sequence runs
**Then** the shell performs a lightweight health check against `commandApiBaseUrl` (e.g., HEAD request or OPTIONS)
**And** if the backend is unreachable, a startup diagnostic is displayed: "Cannot reach backend at [URL]. Check commandApiBaseUrl in /config.json."
**And** the shell still loads (auth may work even if backend is down) but the status bar shows disconnected state immediately

*FRs covered: FR49, FR50*

### Story 1.8: Basic CI Pipeline

As a shell team developer,
I want automated CI that builds, lints, and tests on every PR with Turborepo caching,
So that quality is enforced from the first commit and builds are fast.

**Acceptance Criteria:**

**Given** a GitHub Actions workflow is configured for pull requests
**When** a PR is opened or updated
**Then** the pipeline executes: checkout (with submodules: recursive) → install (pnpm install --frozen-lockfile) → build (turbo build) → lint (turbo lint) → test (turbo test)
**And** Turborepo remote caching is configured for cross-run caching
**And** unchanged packages skip build/lint/test entirely

**Given** a TypeScript error exists in any package
**When** the CI pipeline runs `turbo build`
**Then** the build fails with a clear error identifying the package and file

**Given** an ESLint violation exists (e.g., direct Radix import in module code)
**When** the CI pipeline runs `turbo lint`
**Then** the lint step fails with the rule name and remediation guidance

**Given** a token compliance violation exists
**When** the CI pipeline runs
**Then** the token compliance scanner reports the violation within the lint step

**Given** the CI pipeline completes successfully on a push to main
**When** all checks pass
**Then** the shell application production build is generated as a CI artifact
**And** build duration is logged per commit and tracked over time
**And** CI alerts on > 20% build time regression compared to the 10-commit rolling average

---

**Epic 1 Summary:** 8 stories covering 12 FRs (FR20, FR30-FR38, FR49, FR50). Stories 1.1-1.2 establish foundation infrastructure (parallel track A), 1.3-1.4 deliver @hexalith/shell-api (parallel track B), 1.5-1.6 deliver the running shell, 1.7-1.8 deliver deployment and CI. ATDD practice established from Story 1.3 onward — every story starts with failing acceptance tests.

All FR20 and FR30-FR38 and FR49-FR50 are covered.

---

## Epic 2: Backend Integration — Commands & Projections

Module developers can send CQRS commands, query projection data, observe connection state, handle results, and test with faithful mocks — zero infrastructure code. [Parallel with Epic 3]

### Story 2.1: CQRS Client Package & Error Hierarchy

As a shell team developer,
I want to create the @hexalith/cqrs-client package with typed interfaces and a structured error hierarchy,
So that all CQRS communication has a consistent contract and error handling foundation.

**Acceptance Criteria:**

**Given** the `@hexalith/cqrs-client` package is created in `packages/cqrs-client/`
**When** a developer inspects the public API
**Then** `ICommandBus` interface exists with `send(command: SubmitCommandRequest): Promise<SubmitCommandResponse>` method
**And** `IQueryBus` interface exists with `query<T>(request: SubmitQueryRequest, schema: ZodSchema<T>): Promise<T>` method
**And** interface names use `I` prefix following .NET backend conventions

**Given** the error hierarchy is defined in `src/errors.ts`
**When** a developer inspects the error types
**Then** `HexalithError` abstract base class extends `Error` with abstract `code: string`
**And** `ApiError` (statusCode, body), `ValidationError` (ZodIssue[]), `CommandRejectedError` (rejectionEventType, correlationId), `CommandTimeoutError` (duration, correlationId), `AuthError`, `ForbiddenError`, and `RateLimitError` subclasses exist
**And** each error class has a unique `code` string identifier

**Given** the package types are defined in `src/core/types.ts`
**When** a developer inspects them
**Then** `SubmitCommandRequest`, `SubmitCommandResponse`, `CommandStatusResponse`, `SubmitQueryRequest`, `SubmitQueryResponse`, `ValidateCommandRequest`, `PreflightValidationResult`, and `ProblemDetails` types match the backend API payload shapes exactly (camelCase, matching field names)
**And** `SubmitQueryRequest` includes optional `entityId: string` field for entity-scoped query routing
**And** `CommandStatus` is a union type: `'Received' | 'Processing' | 'EventsStored' | 'EventsPublished' | 'Completed' | 'Rejected' | 'PublishFailed' | 'TimedOut'`
**And** no TypeScript `enum` is used — union types only

**Given** the error response parser is defined in `src/core/problemDetails.ts`
**When** the HTTP client receives a 4xx or 5xx response
**Then** the response body is parsed as RFC 9457 ProblemDetails
**And** the parser maps HTTP status codes to the typed error hierarchy: 400→ValidationError, 401→AuthError, 403→ForbiddenError, 429→RateLimitError, others→ApiError
**And** `correlationId` and `tenantId` from the ProblemDetails body are preserved in the error instance

**Given** the correlation ID utility is defined in `src/core/correlationId.ts`
**When** the HTTP client sends a request without an existing correlation ID
**Then** a ULID is generated via `ulidx` and set as the `X-Correlation-ID` header
**And** ULIDs are lexicographically sortable and timestamp-embedded for debugging

**Given** the package is built with tsup
**When** the build completes
**Then** ESM output with `.d.ts` type declarations is produced
**And** all co-located Vitest tests pass

### Story 2.2: Authenticated Fetch Client with Correlation ID Propagation

As a module developer,
I want backend requests to automatically include my authentication token, active tenant, and correlation ID,
So that I never write authentication, tenant-scoping, or request tracking code in my modules.

**Acceptance Criteria:**

**Given** a `createFetchClient` internal utility is created in `src/core/fetchClient.ts`
**When** the shell configures the fetch client at startup
**Then** the factory accepts `tokenGetter: () => Promise<string | null>` and `tenantGetter: () => string | null` — callback functions provided by the shell from `AuthProvider` and `TenantProvider` context
**And** the client is configured with the `commandApiBaseUrl` from runtime `/config.json`
**And** the shell wires the getters during app initialization (outside React render) so the fetch client can access current auth/tenant state without calling React hooks

**Given** an authenticated user with an active tenant makes a CQRS request
**When** the fetch client sends an HTTP request
**Then** `Authorization: Bearer {token}` header is injected from the auth context
**And** `X-Correlation-ID` header is set (ULID generated or propagated from caller)
**And** `Content-Type: application/json` is set for POST requests
**And** the token is refreshed transparently if expired (via oidc-client-ts silent refresh)

**Given** the backend returns a 4xx or 5xx response
**When** the fetch client processes it
**Then** the response body is parsed as RFC 9457 ProblemDetails
**And** the appropriate typed error is thrown (AuthError for 401, ForbiddenError for 403, RateLimitError for 429, ApiError for others)
**And** `RateLimitError` preserves the `Retry-After` header value for caller retry logic

**Given** the backend returns a 401 response
**When** the fetch client receives it
**Then** an `AuthError` is thrown (triggering silent refresh or OIDC redirect)

**Given** the backend returns a 403 response
**When** the fetch client receives it
**Then** a `ForbiddenError` is thrown with the tenant context from ProblemDetails

**Given** the backend returns a 429 response
**When** the fetch client receives it
**Then** a `RateLimitError` is thrown with the `Retry-After` header value and a user-facing "too many requests" message

**Given** the fetch client is an internal utility
**When** inspecting the package's `src/index.ts`
**Then** `createFetchClient` is NOT exported — it lives in `src/core/` and is used only by hook implementations

*FRs covered: FR9 (partial), FR10 (partial)*

### Story 2.3: Command Hooks — Submit, Status & Pipeline

As a module developer,
I want to send commands to the backend and receive lifecycle feedback (success, rejection, timeout),
So that I can provide clear user feedback without writing transport or polling code.

**Acceptance Criteria:**

**Given** `useSubmitCommand` hook is created in `src/commands/useSubmitCommand.ts`
**When** a module developer calls `const { submit, correlationId, error } = useSubmitCommand()`
**Then** `submit(command)` sends a `POST /api/v1/commands` request and returns `{ correlationId }`
**And** the return shape uses object destructuring (never tuples)

**Given** `useCommandStatus` hook is created in `src/commands/useCommandStatus.ts`
**When** a module developer calls `const { status, error } = useCommandStatus(correlationId)`
**Then** the hook polls `GET /api/v1/commands/status/{correlationId}` every 1 second
**And** polling stops on any terminal status (`Completed`, `Rejected`, `PublishFailed`, `TimedOut`)

**Given** `useCommandPipeline` hook is created in `src/commands/useCommandPipeline.ts`
**When** a module developer calls `const { send, status, error, correlationId, replay } = useCommandPipeline()`
**Then** the hook composes `useSubmitCommand` + `useCommandStatus` into a single state machine
**And** `status` updates through: `'idle'` → `'sending'` → `'polling'` → `'completed'` | `'rejected'` | `'failed'` | `'timedOut'`

**Given** the backend returns `Completed` status
**When** the polling detects it
**Then** polling stops
**And** a `commandCompleted` event is emitted for projection cache invalidation (SignalR handles cross-client invalidation; this handles same-client immediate invalidation)
**And** `status` becomes `'completed'`

**Given** the backend returns `Rejected` status
**When** the polling detects it
**Then** polling stops and a `CommandRejectedError` is surfaced via the `error` return value
**And** `status` becomes `'rejected'`

**Given** the backend returns `PublishFailed` or `TimedOut` status
**When** the polling detects it
**Then** polling stops and the appropriate error (`CommandTimeoutError`) is surfaced
**And** the hook exposes a `replay` function for retrying via `POST /api/v1/commands/replay/{correlationId}`

**Given** `useCommandPipeline` is called outside the shell provider context
**When** the hook attempts to access auth/tenant context
**Then** a descriptive error is thrown

*FRs covered: FR9, FR16*

### Story 2.4: Query Hook — Projection Data with Zod Validation

As a module developer,
I want to query projection data with automatic ETag caching, type safety, and runtime validation,
So that I get typed, validated data without writing transport or caching code.

**Acceptance Criteria:**

**Given** `useQuery<T>` hook is created in `src/queries/useQuery.ts`
**When** a module developer calls `const { data, isLoading, error, refetch } = useQuery(schema, queryParams)`
**Then** a `POST /api/v1/queries` request is made with the query payload
**And** the response `payload` is validated against the provided Zod schema at runtime
**And** if validation fails, a `ValidationError` is thrown with the Zod issues
**And** `data` is typed as `T | undefined` inferred from the Zod schema

**Given** ETag caching is implemented in `src/queries/etagCache.ts`
**When** a query receives a `200` response with an `ETag` header
**Then** the ETag and response data are stored in an in-memory Map keyed by `{tenantId}:{domain}:{queryType}:{aggregateId}:{entityId?}`
**And** subsequent requests for the same key send `If-None-Match: "{etag}"` header
**And** a `304 Not Modified` response returns the cached data without re-downloading
**And** a `200` response updates both the cached data and ETag

**Given** the `useQuery` hook accepts an optional `options` parameter
**When** a module developer provides options
**Then** `refetchInterval` enables background polling at the specified interval
**And** `enabled` controls whether the query is active (default: true)
**And** `refetchOnWindowFocus` triggers re-query on tab return (default: true)

**Given** the user switches tenants via `TenantProvider`
**When** the tenant context changes
**Then** the entire ETag cache is cleared (all entries are tenant-scoped)
**And** active queries re-fetch with no `If-None-Match` (cold start for new tenant)

**Given** the backend returns a payload that doesn't match the Zod schema
**When** `useQuery` processes the response
**Then** a clear `ValidationError` is surfaced via the `error` return value (not a runtime crash)

*FRs covered: FR10, FR17*

### Story 2.5: Projection Freshness & Connection State

As a module developer,
I want projection data to stay fresh automatically via polling after commands complete, with observable connection state,
So that end users see current data without manual refresh and I can display connection health.

**Acceptance Criteria:**

**Given** a command completes successfully via `useCommand`
**When** the command status reaches `'Completed'`
**Then** `useCommand` triggers `queryClient.invalidateQueries` for the affected projection domain
**And** active `useProjection` hooks for that domain automatically refetch fresh data

**Given** the shell manages a connection health state
**When** a module developer calls `useConnectionState()` from `@hexalith/cqrs-client`
**Then** the hook returns `{ state: 'connected' | 'reconnecting' | 'disconnected', transport: 'signalr' | 'polling' }`
**And** connection state reflects both HTTP reachability and SignalR connection status
**And** SignalR disconnection degrades to polling-only mode (not a fatal error)

**Given** a command completes successfully via `useCommandPipeline`
**When** the command status reaches `'Completed'`
**Then** active `useQuery` hooks for the affected domain automatically re-fetch with ETag validation

**Given** polling serves as fallback for data freshness
**When** a module developer uses `useQuery` with `refetchInterval`
**Then** the projection data is refreshed at the specified interval
**And** polling continues independently of SignalR connection state (belt and suspenders)

**Given** the backend becomes temporarily unavailable
**When** projection queries fail
**Then** the connection state transitions to `'disconnected'`
**And** previously cached data remains available (not cleared)
**And** the hook automatically retries with jittered exponential backoff

**Given** the backend recovers
**When** a retry succeeds
**Then** the connection state transitions back to `'connected'`
**And** stale projections are automatically revalidated

*FRs covered: FR11, FR12, FR13*

### Story 2.6: Mock Implementations & Contract Tests

As a module developer,
I want faithful mock implementations of the command and query buses for testing,
So that my tests accurately simulate real backend behavior without requiring a running backend.

**Acceptance Criteria:**

**Given** `MockCommandBus` implements `ICommandBus` in `src/commands/__mocks__/`
**When** a test calls `mockBus.send(command)`
**Then** the mock simulates async delay (configurable, not instant)
**And** the mock supports the full command lifecycle (Received → Processing → Completed)
**And** the mock can be configured to simulate rejection (`CommandRejectedError`), timeout (`CommandTimeoutError`), publish failure, and replay scenarios
**And** the mock returns RFC 9457 ProblemDetails error responses matching real backend format

**Given** `MockQueryBus` implements `IQueryBus` in `src/queries/__mocks__/`
**When** a test calls `mockBus.query(request, schema)`
**Then** the mock returns configurable response data after simulated async delay
**And** the mock validates responses against the provided Zod schema (same as real implementation)
**And** the mock supports ETag behavior: returns `ETag` header on 200, returns 304 when `If-None-Match` matches current ETag

**Given** `MockSignalRHub` is provided in `src/notifications/__mocks__/`
**When** a test needs to simulate real-time projection changes
**Then** the mock supports `JoinGroup`, `LeaveGroup`, and emitting `ProjectionChanged` signals
**And** the mock simulates connection lifecycle (connected, disconnected, reconnecting)

**Given** a module developer uses `useCommandPipeline` or `useQuery` in tests
**When** they configure the test with mock implementations
**Then** the hooks behave identically to production (same status transitions, same error types, same ETag caching, same SignalR invalidation)

**Given** contract test suites exist in `src/__contracts__/`
**When** `commandBus.contract.test.ts` runs
**Then** the same parameterized test suite validates: correlationId format, async delay, rejection error type, timeout error type, ProblemDetails error shape, `X-Correlation-ID` header propagation
**And** contract test expectations (response shapes, status codes, field names) are derived from the documented backend API specifications (Architecture Decision Document § API & Communication Patterns), not from frontend code assumptions

**Given** `queryBus.contract.test.ts` runs
**When** executed against both mock and real implementations
**Then** both produce identical behavior for: valid query response, Zod validation failure, ETag cache hit (304), network error, `entityId`-scoped queries

**Given** the mock implementation diverges from the real implementation
**When** the contract tests run in CI
**Then** the divergence is caught and the build fails with a clear message identifying the behavioral difference

**Given** the backend API specification changes
**When** the contract test expectations are reviewed
**Then** the expectations are updated to match the new spec before updating the implementations — spec drives tests, tests drive code

*FRs covered: FR14, FR15*

### Story 2.7: SignalR Connection & Projection Subscriptions

As a module developer,
I want projection data to update automatically when any client changes it, without polling,
So that end users see real-time data across all browser sessions.

**Acceptance Criteria:**

**Given** `useSignalR` hook is created in `src/notifications/useSignalR.ts`
**When** the shell initializes
**Then** a single SignalR connection is established to `{commandApiBaseUrl}/hubs/projection-changes`
**And** the connection uses WebSocket transport with auto-fallback to Server-Sent Events
**And** the access token is provided via `accessTokenFactory` callback from `useAuth()`
**And** only one connection exists regardless of how many projections are active (multiplexed)

**Given** the SignalR connection is established
**When** the connection drops
**Then** automatic reconnection begins with exponential backoff (1s, 3s, 5s, 10s, 30s max)
**And** `useConnectionState` transitions to `'reconnecting'`
**And** on successful reconnect, all previously subscribed groups are automatically rejoined
**And** `useConnectionState` transitions back to `'connected'`

**Given** `useProjectionSubscription` hook is created in `src/notifications/useProjectionSubscription.ts`
**When** a `useQuery` hook mounts with `projectionType` and `tenantId`
**Then** the hook calls `JoinGroup(projectionType, tenantId)` on the SignalR connection
**And** when the component unmounts, `LeaveGroup(projectionType, tenantId)` is called

**Given** the SignalR hub broadcasts `ProjectionChanged(projectionType, tenantId)`
**When** the client receives the signal
**Then** all active `useQuery` hooks matching that `projectionType` and `tenantId` re-fetch with `If-None-Match` ETag header
**And** if the backend returns `304 Not Modified`, cached data is retained (zero network payload)
**And** if the backend returns `200`, new data and ETag replace the cache entry

**Given** SignalR connection fails entirely (server unavailable)
**When** all reconnection attempts are exhausted
**Then** `useConnectionState` transitions to `'disconnected'`
**And** polling fallback continues providing data freshness via `refetchInterval`
**And** no error is surfaced to module developers — degradation is transparent

**Given** the maximum group subscription limit (50 per connection) is reached
**When** a new `useQuery` attempts to subscribe
**Then** a warning is logged to console with the projectionType that was not subscribed
**And** the query still functions via polling — only real-time push is unavailable for that projection

*FRs covered: FR11, FR12, FR13*
*Dependency: `@microsoft/signalr` npm package (~30KB gzipped)*

### Story 2.8: ETag Query Cache Integration

As a module developer,
I want query responses cached and validated via ETags so repeat queries avoid re-downloading unchanged data,
So that the application is fast and bandwidth-efficient without any caching code in my module.

**Acceptance Criteria:**

**Given** `ETagCache` is implemented in `src/queries/etagCache.ts`
**When** inspecting the implementation
**Then** it is an in-memory `Map<string, { etag: string; data: unknown }>` keyed by `{tenantId}:{domain}:{queryType}:{aggregateId}:{entityId?}`
**And** the cache is cleared entirely on tenant switch
**And** the cache is cleared on page refresh (no persistence — acceptable for projections)

**Given** a `useQuery` hook sends its first request for a projection
**When** the backend responds with `200` and an `ETag` header
**Then** the response data and ETag are stored in the cache

**Given** a `useQuery` hook sends a subsequent request for the same projection
**When** a cached ETag exists for the query key
**Then** the request includes `If-None-Match: "{etag}"` header

**Given** the backend responds with `304 Not Modified`
**When** the `useQuery` hook processes the response
**Then** the previously cached data is returned
**And** no response body is parsed (zero-payload optimization)
**And** `isLoading` remains `false` throughout (no loading flicker)

**Given** the backend responds with `200` and a new `ETag`
**When** the `useQuery` hook processes the response
**Then** the cache entry is updated with new data and new ETag
**And** the Zod schema validation runs on the new data

**Given** a SignalR `ProjectionChanged` signal is received for a subscribed projection
**When** the re-fetch query is sent
**Then** `If-None-Match` is included — if the projection didn't actually change for this tenant, `304` avoids redundant data transfer

**Given** a module developer inspects the `useQuery` hook API
**When** reviewing the return type
**Then** ETag caching is entirely transparent — no ETag-related props or configuration exposed to module developers

*FRs covered: FR10, FR17*
*Note: ETag caching is an infrastructure concern — module developers never interact with it directly*

### Story 2.9: Pre-flight Authorization Validation

As a module developer,
I want to check whether the current user is authorized to execute a command or query before showing the UI for it,
So that I can hide or disable buttons and forms the user cannot use, avoiding unnecessary rate limit consumption.

**Acceptance Criteria:**

**Given** `useCanExecuteCommand` hook is created in `src/validation/useCanExecute.ts`
**When** a module developer calls `const { isAuthorized, reason, isLoading } = useCanExecuteCommand({ domain, commandType, aggregateId? })`
**Then** a `POST /api/v1/commands/validate` request is sent with the command metadata
**And** the hook returns `{ isAuthorized: boolean, reason?: string, isLoading: boolean }`

**Given** `useCanExecuteQuery` hook is created in the same file
**When** a module developer calls `const { isAuthorized, reason, isLoading } = useCanExecuteQuery({ domain, queryType, aggregateId? })`
**Then** a `POST /api/v1/queries/validate` request is sent with the query metadata
**And** the hook returns the same shape as `useCanExecuteCommand`

**Given** the backend returns `{ isAuthorized: false, reason: "Insufficient tenant permissions" }`
**When** the hook processes the response
**Then** `isAuthorized` is `false` and `reason` contains the explanation
**And** the module developer can use this to disable a button with a tooltip showing the reason

**Given** the validation endpoint returns a network error or 503
**When** the hook processes the failure
**Then** `isAuthorized` defaults to `false` (fail-closed)
**And** `reason` is set to a descriptive message: "Authorization service unavailable"

**Given** multiple components check the same authorization
**When** identical validation requests are made within 30 seconds
**Then** the result is cached in-memory to avoid redundant API calls
**And** the cache is cleared on tenant switch

*FRs covered: FR16 (partial — extends command result feedback to include pre-flight authorization)*
*Note: Pre-flight validation is optional — module developers can skip it and let the command/query fail with a 403 if they prefer*

---

**Epic 2 Summary:** 9 stories covering 9 FRs (FR9-FR17). Stories 2.1-2.2 establish the package foundation and authenticated fetch client. Stories 2.3-2.4 deliver command and query hooks. Story 2.5 adds freshness and connection state. Story 2.6 provides mocks, SignalR simulation, and contract tests. Story 2.7 adds SignalR real-time push. Story 2.8 adds ETag query cache integration. Story 2.9 adds pre-flight authorization validation. The epic follows a 5-phase incremental build: foundation → commands → queries → SignalR → validation.

---

## Epic 3: Component Library — Beautiful by Default

Module developers build production-quality pages using @hexalith/ui. Layout, feedback, navigation, data, and overlay components work beautifully in light and dark themes with WCAG AA accessibility. [Parallel with Epic 2]

### Story 3.1: UI Package Setup & Structural Layout Components

As a module developer,
I want layout primitives that use the design token system and enforce the CSS layer cascade,
So that I can compose page layouts with consistent spacing that cannot be overridden by module styles.

**Acceptance Criteria:**

**Given** the `@hexalith/ui` package is created in `packages/ui/`
**When** a developer inspects the package configuration
**Then** tsup is configured to produce ESM output with `.d.ts` declarations
**And** `@hexalith/shell-api` is declared as a peer dependency (for `useLocale`)
**And** Radix packages are direct dependencies (not peer — encapsulated)
**And** the package's ESLint config enforces `no-restricted-imports` blocking direct Radix imports from outside the package

**Given** the CSS `@layer` cascade is configured in the package
**When** styles are loaded
**Then** layers are declared in order: `reset, tokens, primitives, components, density, module`
**And** component styles live in the `components` layer
**And** module styles live in the `module` layer which cannot override `components` layer token references

**Given** `<PageLayout>` component is implemented
**When** a module developer uses `<PageLayout>`
**Then** it renders a CSS Grid layout with designated areas for page header and page content
**And** all spacing uses design tokens via `gap` property (zero hardcoded values)
**And** the component has zero external margin

**Given** `<Stack>`, `<Inline>`, and `<Divider>` components are implemented
**When** a module developer uses them
**Then** `<Stack>` arranges children vertically with `gap` from spacing tokens
**And** `<Inline>` arranges children horizontally with `gap` and `align` options
**And** `<Divider>` renders a horizontal rule using `--color-border-default`
**And** all components have zero external margin — spacing is controlled by parent containers

**Given** structural layout components are built
**When** inspecting their APIs
**Then** each component has ≤ 12 props (simple classification)
**And** all prop names are expressed in domain terms, not primitive terms
**And** co-located Vitest tests pass for each component

*FRs covered: FR40*

### Story 3.2: Core Interactive Components

As a module developer,
I want core interactive components (Button, Input, Select, Tooltip) that are accessible and visually consistent,
So that I can build forms and interactions without worrying about keyboard navigation, focus management, or styling.

**Acceptance Criteria:**

**Given** `<Button>` component is implemented (custom, no Radix)
**When** a module developer uses `<Button emphasis="high">Save</Button>`
**Then** the button renders with the correct token-driven styles for the `high` emphasis variant
**And** variants include `emphasis: 'high' | 'medium' | 'low'` and `size: 'sm' | 'md' | 'lg'`
**And** all interaction states (default, hover, focus-visible, active, disabled) are styled via state tokens
**And** `prefers-reduced-motion` collapses transition durations to 0ms

**Given** `<Input>` component is implemented (custom HTML input with tokens)
**When** a module developer uses `<Input label="Name" required />`
**Then** a `<label>` is associated with the input via `htmlFor`/`id`
**And** required fields show a visual indicator
**And** error states display contextual messages below the field
**And** focus ring uses `--state-focus-ring` token with minimum 3:1 contrast

**Given** `<Select>` component wraps `@radix-ui/react-select`
**When** a module developer uses `<Select options={options} />`
**Then** keyboard navigation works (arrow keys, type-ahead search, Enter to select, Escape to close)
**And** the component supports search/filter for long option lists
**And** grouped options are supported
**And** Radix's built-in ARIA attributes are preserved (no duplicate `aria-*` added)
**And** all animations use motion tokens with `prefers-reduced-motion` support

**Given** `<Tooltip>` component wraps `@radix-ui/react-tooltip`
**When** a module developer uses `<Tooltip content="Help text"><Button>?</Button></Tooltip>`
**Then** the tooltip appears on hover/focus after a short delay
**And** the tooltip is keyboard accessible (visible on focus, dismissible with Escape)
**And** the tooltip uses `--z-popover` z-index token

**Given** any interactive component is rendered in both light and dark themes
**When** inspecting the visual output
**Then** both themes produce visually correct, contrast-compliant results
**And** token compliance scan reports 100% for all component CSS

### Story 3.3: Feedback & State Components

As a module developer,
I want standardized components for loading, error, empty, and notification states,
So that every state in my module looks intentional and designed — not like something broke.

**Acceptance Criteria:**

**Given** `<Toast>` component wraps `@radix-ui/react-toast`
**When** a notification is triggered
**Then** the toast renders at the configured anchor point with auto-dismiss behavior
**And** maximum 3 visible toasts — oldest auto-dismisses when 4th arrives
**And** toasts stack vertically from the anchor point
**And** the toast uses `--z-toast: 400` z-index token
**And** success toasts use the assertive emotional register; error toasts use the urgent register

**Given** `<Skeleton>` / `<LoadingState>` component is implemented
**When** a module developer uses `<Skeleton variant="table" rows={5} />`
**Then** a content-aware skeleton is rendered matching the table layout dimensions exactly (CLS budget = 0)
**And** variants include `'table'`, `'form'`, `'detail'`, `'card'`
**And** skeleton animation uses motion tokens and respects `prefers-reduced-motion`
**And** skeleton displays for a minimum 300ms to prevent flicker
**And** no generic pulsing blocks or spinners — every skeleton matches its content shape

**Given** `<EmptyState>` component is implemented
**When** a module developer uses `<EmptyState title="No orders yet" action={{ label: "Create order", onClick }}/>`
**Then** the component renders an illustration + title + optional description + optional action CTA
**And** the design is consistent across all modules using the component
**And** the component supports anticipatory context: "Orders will appear here as they're created for [Tenant Name]"

**Given** `<ErrorBoundary>` component is implemented as a React error boundary
**When** a child component throws an error
**Then** the boundary catches it and renders a contextual error UI with retry button
**And** the error display component (`<ErrorDisplay>`) accepts `error` and `onRetry` props
**And** the component does NOT catch errors internally from hooks — it is a module/shell-level boundary
**And** the rest of the application remains functional

**Given** any feedback component is rendered
**When** inspecting the output
**Then** it uses design tokens exclusively and passes token compliance scan

*FRs covered: FR41*

### Story 3.4: Navigation Components

As an end user,
I want a collapsible sidebar with grouped modules and searchable navigation, and tabbed content views,
So that I can quickly find and switch between modules and organize content within a module.

**Acceptance Criteria:**

**Given** `<Sidebar>` component wraps `@radix-ui/react-navigation-menu` and `@radix-ui/react-collapsible`
**When** the sidebar is rendered with module navigation items
**Then** modules are displayed as a list with icons and display names from manifests
**And** an active item indicator is shown with a sliding highlight transition using `--transition-duration-default` (200ms) ease-out, respecting `prefers-reduced-motion`
**And** the sidebar is collapsible (toggle between expanded with labels and collapsed with icons only)

**Given** the sidebar has search/filter functionality
**When** a user types in the sidebar search field
**Then** the module list filters to show only matching modules (type-to-filter)
**And** filtering is instant (client-side)

**Given** modules declare categories in their manifests
**When** the sidebar renders with categorized modules
**Then** modules are grouped under collapsible section headers by category
**And** section headers are collapsible/expandable

**Given** `<Tabs>` component wraps `@radix-ui/react-tabs`
**When** a module developer uses `<Tabs items={[{ label, content }]} />`
**Then** tabs are keyboard navigable (arrow keys switch tabs, Tab moves to content)
**And** the active tab indicator uses motion tokens for transitions
**And** ARIA roles are properly set by Radix (no duplicate attributes added)

**Given** the sidebar and tabs are rendered at breakpoint `--breakpoint-md` (1024px)
**When** the viewport is 1024px wide
**Then** components render without horizontal overflow
**And** the sidebar collapses gracefully

### Story 3.5: Data Table — Core Features

As a module developer,
I want a data table with sorting, pagination, row click, and density support,
So that end users can browse and navigate data sets with a consistent, accessible table component.

**Acceptance Criteria:**

**Given** `<Table>` component is built with TanStack Table and design tokens (no Radix dependency)
**When** a module developer uses `<Table data={orders} columns={columns} />`
**Then** the table renders with design token styling, semantic HTML (`<table>`, `<th scope>`, `<caption>`)
**And** the component is classified as complex with ≤ 20 props total (core + advanced)

**Given** client-side sorting is enabled
**When** a user clicks a column header
**Then** the column sorts ascending, then descending on second click, then unsorted on third click
**And** sort direction is indicated with a visual arrow using `--transition-duration-default` (200ms) motion token

**Given** client-side pagination is enabled
**When** data exceeds the page size
**Then** pagination controls appear below the table
**And** the current page, total pages, and page size selector are displayed

**Given** `onRowClick` is provided
**When** a user clicks a table row
**Then** the callback fires with the row data
**And** interactive components inside cells call `event.stopPropagation()` (built into cell renderer)

**Given** the table uses Linear-inspired density
**When** rendered with default density
**Then** rows are compact with muted secondary info (`--color-text-secondary`) and bold primary info (`--font-weight-semibold`) for maximum visible rows
**And** `stickyHeader` and `scrollable` props are supported

**Given** the table is rendered in both themes
**When** inspecting accessibility
**Then** the table passes axe-core validation with zero violations
**And** token compliance scan reports 100% for all table CSS

*FRs covered: FR39 (partial)*

### Story 3.6: Data Table — Advanced Features

As a module developer,
I want server-side mode, search, filtering, CSV export, and row-level formatting in the table,
So that end users can process large server-paginated data sets, export reports, and see visual indicators for domain conditions.

**Acceptance Criteria:**

**Given** server-side mode is enabled via `serverSide` prop
**When** the user sorts, filters, or changes pages
**Then** `onSort`, `onFilter`, and `onPageChange` callbacks are invoked instead of client-side processing
**And** `useProjection` can accept pagination/filter params for server-delegated queries

**Given** `globalSearch` prop is enabled
**When** the user types in the search filter bar
**Then** text search filters across all visible columns (client-side) or delegates to `onFilter` (server-side)

**Given** per-column filtering is enabled via `columnFilters` prop
**When** a column filter is activated
**Then** the filter type matches the column type: text input, select dropdown, or date range

**Given** `csvExport` prop is enabled
**When** the user clicks the "Download CSV" button in the table toolbar
**Then** the current filtered/sorted view (not all data) is exported as a CSV file

**Given** `rowClassName` prop is provided with a function `(row) => string | undefined`
**When** a row matches a domain condition (e.g., overdue order)
**Then** the row receives a semantic class name (`"row-urgent"`, `"row-warning"`, `"row-success"`)
**And** the visual expression uses `--color-status-*` tokens as subtle row background tint
**And** no arbitrary row styling is permitted — only bounded semantic status classes

**Given** all advanced features are combined with core features
**When** inspecting the total prop count
**Then** the combined Table component remains within the ≤ 20 prop budget (~19 total: `data`, `columns`, `sorting`, `pagination`, `onRowClick`, `globalSearch`, `columnFilters`, `density`, `stickyHeader`, `scrollable`, `emptyState`, `loadingState`, `loading`, `onSort`, `onPageChange`, `onFilter`, `serverSide`, `csvExport`, `rowClassName`)

*FRs covered: FR39 (partial)*

### Story 3.7: Form & Detail View Components

As a module developer,
I want form and detail view components with built-in validation and density options,
So that end users can enter data with inline validation feedback and view entity details in a consistent layout.

**Acceptance Criteria:**

**Given** `<Form>` component integrates React Hook Form internally
**When** a module developer uses `<Form schema={CreateTenantSchema} onSubmit={handleSubmit}>`
**Then** the form wires React Hook Form with Zod resolver automatically from the provided schema
**And** validation logic lives in the Zod schema only — no duplicated validation in component code
**And** the form supports submit and reset actions

**Given** form fields validate inline
**When** a user types in a required field and leaves it empty
**Then** a contextual error message appears on the field (not a disconnected banner)
**And** error messages come from the Zod schema definitions

**Given** the `density` prop is provided
**When** `density="comfortable"` (default, for ≤ 10 fields)
**Then** the form uses Notion-inspired spacing with constrained width and generous breathing room
**When** `density="compact"` (for > 10 fields)
**Then** the form uses tighter spacing with more fields visible per screen

**Given** `<DetailView>` component is implemented
**When** a module developer uses `<DetailView sections={[{ title, fields }]} actions={actionButtons} />`
**Then** the component renders a section-based layout with key-value display pairs
**And** action buttons are positioned consistently
**And** the layout uses Notion-inspired constrained width with readable sections

**Given** `<DatePicker>` wraps `react-day-picker` inside a Radix `<Popover>`
**When** a user activates the date picker
**Then** a calendar popover appears with keyboard navigation
**And** the calendar uses design tokens for all styling

**Given** form and detail view components are rendered
**When** inspecting their APIs
**Then** `<Form>` has ≤ 20 props (complex classification) and `<DetailView>` has ≤ 20 props
**And** all components have zero external margin
**And** both themes produce correct, contrast-compliant results

*FRs covered: FR39, FR40*

### Story 3.8: Overlay Components

As a module developer,
I want modal, dialog, dropdown, and popover components with proper focus management,
So that overlay interactions are accessible, visually consistent, and never trap users.

**Acceptance Criteria:**

**Given** `<Modal>` wraps `@radix-ui/react-dialog`
**When** a module developer uses `<Modal title="Confirm" onClose={close}>{children}</Modal>`
**Then** the modal renders with an overlay, focus is trapped inside the modal
**And** pressing Escape closes the modal
**And** closing returns focus to the trigger element
**And** only one focus trap is active at any time
**And** the modal uses `--z-modal: 300` z-index token
**And** Radix built-in animations are disabled via `forceMount` — custom CSS transitions use motion tokens

**Given** `<AlertDialog>` wraps `@radix-ui/react-alert-dialog`
**When** used for destructive confirmations
**Then** the dialog requires explicit user action (no click-outside dismiss)
**And** the destructive action button uses the urgent emotional register tokens

**Given** `<DropdownMenu>` wraps `@radix-ui/react-dropdown-menu`
**When** a user opens the menu
**Then** items are keyboard navigable (arrow keys, type-ahead, Enter to select)
**And** the menu uses `--z-dropdown: 100` z-index token
**And** submenus are supported

**Given** `<Popover>` wraps `@radix-ui/react-popover`
**When** a module developer uses `<Popover trigger={<Button>Info</Button>}>{content}</Popover>`
**Then** the popover appears anchored to the trigger element
**And** it uses `--z-popover: 200` z-index token
**And** it is keyboard dismissible (Escape) and click-outside dismissible

**Given** any overlay component is opened
**When** checking accessibility
**Then** Radix's built-in ARIA attributes are preserved
**And** no duplicate `aria-*` attributes are added by the wrapper
**And** `prefers-reduced-motion` disables all transition animations

### Story 3.9: Storybook Showcase & Accessibility Pipeline

As a module developer,
I want a Storybook that showcases all components with realistic data and validates accessibility,
So that I can discover, test, and copy-paste components with confidence they're accessible in both themes.

**Acceptance Criteria:**

**Given** Storybook 10 is configured with `@storybook/react-vite`
**When** `pnpm storybook` is run
**Then** Storybook launches with all `@hexalith/ui` components organized by category
**And** sidebar titles follow: `@hexalith/ui/{Category}/{ComponentName}`
**And** categories are: Layout, Data Display, Forms, Feedback, Overlay, Navigation

**Given** a component's default story is displayed
**When** viewing the story
**Then** it shows the best-looking configuration with realistic domain data (order names, tenant names, dates, statuses)
**And** no lorem ipsum or "Item 1, Item 2" placeholder text is used
**And** each story has a "View Code" panel showing clean, copy-pasteable usage code

**Given** composition stories exist
**When** viewing a "kitchen sink" page story
**Then** realistic page compositions are shown: order list page (table + filter bar + pagination), tenant detail page (detail view + related data), form page (form + validation errors + action buttons)
**And** compositions demonstrate multiple components working together
**And** at least one composition story replicates the exact component combination that Epic 4's scaffold will use (Table with useProjection mock data + DetailView + Form with useCommand mock submission) — catching integration issues within Epic 3 before the scaffold depends on them

**Given** Storybook requires shell context (locale, theme)
**When** components are rendered in isolation
**Then** a mock `ShellProvider` provides locale and theme context for isolated development

**Given** axe-core accessibility tests are configured
**When** running Playwright component tests (`.spec.tsx`) for each `@hexalith/ui` component
**Then** every component includes `expect(await new AxeBuilder({ page }).analyze()).toHaveNoViolations()`
**And** tests run against both light and dark themes
**And** composition-level stories are tested for context-dependent issues (duplicate landmarks, heading hierarchy)

**Given** the Design System Health gate runs in CI
**When** a PR modifies `@hexalith/ui` components
**Then** the gate validates: token compliance (100%), token parity (light/dark), naming conventions, accessibility (axe-core), prop budget compliance, import boundaries, inline style ban
**And** every PR displays a single Design System Health score

**Given** Storybook viewport tests are configured
**When** running responsive checks
**Then** all components render without overflow at `--breakpoint-md` (1024px) and `--breakpoint-lg` (1280px)

**Given** the Slack test protocol is defined as a manual validation gate
**When** the component library reaches feature-complete for MVP
**Then** the shell team posts TWO scaffold screenshots to 5 engineers with no context: (A) a default MUI/Ant Design scaffold, (B) the FrontShell scaffold
**And** pass criteria: 3+ identify FrontShell as "the real product" or ask "what tool is B?"
**And** bundled glance test: "What's the primary action on screenshot B?" — 4/5 answer correctly in 3 seconds
**And** this is a manual gate — not automatable, run once before first module ships

---

**Epic 3 Summary:** 9 stories covering 3 FRs (FR39-FR41). Stories 3.1-3.2 deliver layout and interactive foundations, 3.3-3.4 add feedback and navigation, 3.5-3.6 deliver the data table (split into core and advanced), 3.7 adds forms and detail views, 3.8 delivers overlays, 3.9 validates everything with Storybook, accessibility, and the Slack test. This is the largest implementation epic with ~15 components, dual-theme support, and comprehensive accessibility testing.

---

## Epic 4: Module Scaffold & Independent Development

A developer runs one CLI command and has a complete, premium-looking module with example code using CQRS hooks and @hexalith/ui components, passing tests, and a dev host — productive within 30 minutes. Documentation guides the full lifecycle.

### Story 4.1: create-hexalith-module CLI

As a module developer,
I want to scaffold a new module with a single CLI command,
So that I get a complete, correctly structured module project without manual setup.

**Acceptance Criteria:**

**Given** the `create-hexalith-module` CLI tool is implemented in `tools/create-hexalith-module/`
**When** a developer runs `pnpm create hexalith-module my-orders`
**Then** a complete module directory is generated with the correct structure:
```
hexalith-my-orders/
├── src/
│   ├── index.ts
│   ├── manifest.ts
│   ├── routes.tsx
│   ├── schemas/
│   ├── pages/
│   ├── components/
│   └── hooks/
├── dev-host/
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── package.json
```

**Given** the CLI runs
**When** the scaffold completes
**Then** `package.json` declares `@hexalith/shell-api`, `@hexalith/cqrs-client`, and `@hexalith/ui` as versioned peer dependencies
**And** `tsconfig.json` extends the shared base configuration with TypeScript strict mode
**And** `.eslintrc` includes the shared ESLint config with `no-restricted-imports` rules pre-configured
**And** Vitest config includes pattern `**/*.test.ts(x)` and excludes `**/*.spec.ts(x)`

**Given** the CLI accepts a module name argument
**When** the name is provided (e.g., `my-orders`)
**Then** all generated files use the correct module name in package.json `name`, manifest `name`/`displayName`, and component names
**And** the module name is validated (lowercase alphanumeric with hyphens)

**Given** the CLI encounters an error (e.g., directory already exists)
**When** the error occurs
**Then** a descriptive error message is displayed with remediation guidance

*FRs covered: FR1*

### Story 4.2: Scaffold Example Code — Premium Showcase

As a module developer,
I want the scaffolded module to contain a premium-looking, working example with real CQRS hooks and UI components,
So that I see a beautiful, interactive page in the browser before writing any code — not a generic template.

**Acceptance Criteria:**

**Given** the scaffold generates example code
**When** a developer inspects the generated pages
**Then** `TenantListPage.tsx` (or domain-appropriate equivalent) demonstrates `useProjection` with a `<Table>` component showing realistic sample data
**And** `TenantDetailPage.tsx` demonstrates `<DetailView>` with key-value sections and action buttons
**And** a form page demonstrates `<Form>` with Zod schema validation and `useCommand` for submission
**And** all pages handle loading (`<Skeleton>`), error (`<ErrorDisplay>`), and empty (`<EmptyState>`) states

**Given** the scaffold generates Zod schemas
**When** inspecting `src/schemas/`
**Then** example schemas define realistic domain types with proper validation rules
**And** types are inferred from schemas using `z.infer<typeof Schema>` (no manual duplication)

**Given** the scaffold generates domain types
**When** a developer inspects the module
**Then** the module defines its own command shapes and projection view models in its boundary
**And** types match the pattern expected by `useCommand` and `useProjection`

**Given** the scaffolded module runs in the dev host
**When** a developer opens the browser
**Then** the page uses the project's distinctive design tokens (non-default typeface, warm neutral palette, accent color) — visually distinguishable from default MUI or Ant Design scaffolds
**And** the example uses realistic domain data (names, dates, statuses) — not placeholder text
**And** token compliance scan passes at 100% on all scaffold-generated CSS
**And** **(Manual validation gate):** the scaffold screenshot should pass the Slack test protocol defined in Story 3.9 — this is a manual quality check, not an automatable AC
**And** the scaffold example code uses the same page composition patterns (table list → detail → form → command) that the Tenants reference module (Stories 6.3-6.4) will use — any structural divergence between scaffold and Tenants is a bug

*FRs covered: FR2, FR7*

### Story 4.3: Dev Host for Independent Module Development

As a module developer,
I want to develop my module in isolation with a standalone dev server and mock shell context,
So that I don't need to clone the full shell repository to build and test my module.

**Acceptance Criteria:**

**Given** the scaffold generates a `dev-host/` directory
**When** a developer runs `pnpm dev` from the module root
**Then** a standalone Vite dev server starts serving the module via `dev-host/main.tsx`
**And** HMR works with < 2 second reload on file changes

**Given** `dev-host/main.tsx` renders the module
**When** the dev host initializes
**Then** a `MockShellProvider` wraps the module providing mock implementations of:
  - `AuthProvider` with a fake authenticated user (hardcoded JWT claims)
  - `TenantProvider` with configurable mock tenants
  - `ThemeProvider` with working light/dark toggle
  - `LocaleProvider` with default locale
**And** mock `ICommandBus` and `IQueryBus` are configured with realistic sample responses

**Given** the module is developed independently
**When** the developer has no access to the shell repository
**Then** the module compiles, runs, and tests using only its declared peer dependencies
**And** `pnpm install` resolves all dependencies from the npm registry (or GitHub Packages for @hexalith/* packages)

**Given** the dev host is running
**When** the developer modifies a component
**Then** the browser updates via HMR without full page reload
**And** form state and scroll position are preserved during HMR

*FRs covered: FR6*

### Story 4.4: Scaffolded Tests & Test Fixtures

As a module developer,
I want pre-generated tests that pass immediately without modification,
So that I have a working test foundation and can run tests from minute one.

**Acceptance Criteria:**

**Given** the scaffold generates test files
**When** a developer runs `pnpm test` from the module root
**Then** all generated Vitest tests (`.test.tsx`) pass without any modifications
**And** tests cover: at least one page component rendering, one `useProjection` data fetch, one `useCommand` submission

**Given** the scaffold generates test fixtures
**When** a developer inspects the test setup
**Then** base test fixtures provide `MockCommandBus` and `MockQueryBus` pre-configured with sample data
**And** fixtures simulate realistic async behavior (configurable delay, not instant)
**And** a `renderWithProviders` utility wraps components in `MockShellProvider` for testing
**And** fixtures match the three-phase command lifecycle to prevent mock/real divergence

**Given** the scaffold generates Playwright component test files (`.spec.tsx`)
**When** a developer runs Playwright tests
**Then** at least one component test passes validating the scaffold renders correctly
**And** the test includes an axe-core accessibility check

**Given** tests use the mock implementations
**When** the mock behavior diverges from real implementations
**Then** the contract test suites from `@hexalith/cqrs-client` catch the divergence

*FRs covered: FR3*

### Story 4.5: Typed Manifest & Module Boundary

As a module developer,
I want to define my module's routes and navigation through a typed manifest, and use any React library within my boundary,
So that the shell discovers my module automatically and I have full flexibility within my module code.

**Acceptance Criteria:**

**Given** the scaffold generates `src/manifest.ts`
**When** a developer inspects the manifest
**Then** it exports a typed `ModuleManifest` object with: `name`, `displayName`, `version`, `manifestVersion`, `routes` (path + component mapping), `navigation` (label, icon, category), and optional `category` for sidebar grouping
**And** TypeScript enforces the manifest type — missing or incorrectly typed fields produce compile errors

**Given** the manifest declares routes
**When** the shell processes the manifest
**Then** routes follow the URL pattern `/{module}/{entity}/{id}` (e.g., `/orders/detail/4521`)
**And** each route maps to a lazy-loaded component

**Given** the manifest declares navigation items
**When** the shell renders the sidebar
**Then** the module appears in the sidebar with the declared label, icon, and category group

**Given** a module developer wants to use a third-party React library (e.g., a charting library)
**When** the library is installed in the module's `package.json`
**Then** the module compiles and runs without restriction
**And** the module's ESLint config only blocks: `@radix-ui/*` direct imports, CSS-in-JS libraries, and `oidc-client-ts`
**And** all other React libraries and patterns are permitted within the module boundary

**Given** the module defines its own domain types
**When** inspecting the module code
**Then** command shapes, projection view models, and Zod schemas are defined within the module's `src/` directory
**And** no types are imported from other modules — all shared types come from `@hexalith/*` packages only

*FRs covered: FR4, FR5*

### Story 4.6: Module Developer Documentation

As a module developer,
I want a Getting Started guide and a module development lifecycle guide,
So that I can scaffold and ship my first module with clear, accurate instructions.

**Acceptance Criteria:**

**Given** a Getting Started guide exists
**When** a new module developer reads it
**Then** it covers the complete path: prerequisites → registry access → scaffold command → run dev host → modify example → add domain types → write tests → integrate with shell
**And** prerequisites include: how to request access to the `@hexalith` GitHub Packages scope, with a clear "request access" path for evaluators who don't have organization access yet
**And** the guide targets a ≤ 30 minute first-module experience (measured from "I have registry access" to "my module runs in the dev host")
**And** all code examples in the guide are extracted from tested source (not hand-written snippets that may drift)

**Given** a module development lifecycle guide exists
**When** a developer references it during development
**Then** it covers: manifest definition, CQRS hook usage (`useCommand`, `useProjection`), UI component patterns, Zod schema creation, testing strategy, dev host usage, and shell integration via git submodule
**And** the guide provides backend context where needed (CommandApi endpoints, projection query patterns, command lifecycle) without requiring backend expertise

**Given** the documentation is frontend-focused
**When** a developer reads about CQRS integration
**Then** examples show the frontend hooks and types — not backend implementation details
**And** the backend is described as "the existing REST API that your hooks talk to" with endpoint reference

**Given** the documentation includes code examples
**When** the examples are tested
**Then** all code examples compile and run (stale examples are a P1 bug per the DX NFRs)

*FRs covered: FR58, FR59*

---

**Epic 4 Summary:** 6 stories covering 9 FRs (FR1-FR7, FR58-FR59). Stories 4.1-4.2 deliver the CLI scaffold with premium example code, 4.3 enables independent development, 4.4 provides test infrastructure, 4.5 defines the manifest contract, 4.6 provides documentation. This epic delivers the "defining experience" — Lucas's first 30 minutes with the platform.

---

## Epic 5: Shell Composition & Multi-Module Experience

End users navigate between multiple modules as one seamless application. Module failures are isolated, state and scroll position are preserved, and manifests are validated at build time. Navigation is unified and modules integrate automatically.

### Story 5.1: Module Registry & Build-Time Discovery

As a shell team developer,
I want the shell to discover and register modules from their typed manifests at build time,
So that adding a new module requires only adding its repository reference — routes and navigation register automatically.

**Acceptance Criteria:**

**Given** module repositories are added as git submodules in the `modules/` directory
**When** the shell build runs
**Then** the build system discovers all `manifest.ts` files from registered modules
**And** each module's default export (root component) is registered with `React.lazy()` for code splitting
**And** only the active module's code is loaded at runtime

**Given** a module manifest is imported at build time
**When** the shell processes the manifest
**Then** routes from `manifest.routes` are registered with `react-router-dom` v7
**And** navigation items from `manifest.navigation` are added to the sidebar
**And** each module route is wrapped in `<ModuleErrorBoundary>` and `<Suspense fallback={<ModuleSkeleton />}>`

**Given** a shell team developer wants to add a new module
**When** they add the module's git repository as a submodule in `modules/` and add it to `pnpm-workspace.yaml`
**Then** the module's routes and navigation appear in the shell on next build
**And** no code changes to the shell application are required beyond the submodule addition

**Given** `React.lazy()` loads a module
**When** the module chunk is fetched
**Then** a content-aware `<ModuleSkeleton>` is displayed during loading (not a spinner)
**And** the skeleton matches the expected page layout shape

**Given** multiple modules are registered
**When** the shell builds with 5 modules
**Then** build time is measured and logged — must be ≤ 90 seconds (NFR5 MVP target). Story fails if exceeded.
**And** module page load (route change to first meaningful paint) is measured — must be < 1 second (NFR1). Story fails if exceeded.
**And** shell initial cold start is measured — must be < 3 seconds on simulated 4G (NFR6). Story fails if exceeded.
**And** per-module code splitting produces separate chunks for each module via dynamic `import()` boundaries — each `React.lazy(() => import(...))` creates a distinct Vite chunk
**And** Vite `manualChunks` configuration splits vendor libraries (React, react-router, TanStack Query, Radix primitives) into separate cached chunks that persist across deploys
**And** asset filenames use content hashing for long-term browser caching with cache-busting on change

*FRs covered: FR18, FR29*

### Story 5.2: Unified Navigation & Route Generation

As an end user,
I want unified sidebar navigation across all modules that feels like one application,
So that I can find and switch between modules without perceiving architectural boundaries.

**Acceptance Criteria:**

**Given** multiple modules declare navigation items in their manifests
**When** the sidebar renders
**Then** all module navigation items are displayed with their declared labels, icons, and categories
**And** modules are grouped by `category` from the manifest with collapsible group headers
**And** the sidebar search/filter from Story 3.4 works across all registered modules

**Given** a user clicks a module's navigation item
**When** the route changes
**Then** the URL updates to the module's declared route pattern (e.g., `/tenants`, `/orders`)
**And** the sidebar active indicator transitions smoothly to the selected item
**And** the status bar "active module" segment updates to the module's `displayName`

**Given** routes are generated from manifests
**When** two modules declare conflicting routes
**Then** the build fails with a clear error identifying both modules and the conflicting path (handled by Story 5.5 validation)

**Given** a user navigates between modules via the sidebar
**When** switching from module A to module B
**Then** the sidebar remains visible and stable (no re-render, no flash)
**And** the top bar remains consistent
**And** the transition feels like navigating within one application — zero visual seams

**Given** deep-linkable URLs are configured
**When** a user shares a URL like `/orders/detail/4521?status=overdue&sort=date`
**Then** the correct module loads at the specified route with filter/sort params applied

*FRs covered: FR19*

### Story 5.3: Module Error Isolation & Recovery

As an end user,
I want module failures to be contained so the rest of the application keeps working,
So that one broken module doesn't prevent me from using other modules.

**Acceptance Criteria:**

**Given** a per-module `<ModuleErrorBoundary>` wraps each module
**When** a module throws an unhandled error during rendering
**Then** the error boundary catches it and displays a contextual error UI
**And** the error UI shows the module name, a user-friendly error message, and a retry button
**And** all other modules remain fully functional
**And** the sidebar and status bar continue working normally

**Given** a module's backend service is unavailable
**When** `useProjection` or `useCommand` fails with a network error
**Then** a contextual error message is displayed: "Unable to reach [Module Name] service. Please try again."
**And** the error is specific to the affected module — not a generic "something went wrong"

**Given** a user sees a module error
**When** the user clicks the retry button
**Then** the module attempts to re-render without a full page reload
**And** the user does not need to leave the current page or navigate away

**Given** a module error occurs
**When** the shell captures the error event
**Then** the error is logged with: module name, error type, stack trace, and timestamp
**And** the error event is available for external monitoring integration (prepared for Epic 6 FR51)

**Given** expected business errors occur (rejected commands, validation failures)
**When** `useCommand` or `useProjection` surfaces the error via return value
**Then** the module handles them inline (alert, field-level errors) — they do NOT bubble to the error boundary

*FRs covered: FR21, FR22, FR25*

### Story 5.4: Navigation State Preservation & Caching

As an end user,
I want my scroll position, filter state, and table sort to be preserved when I switch between modules,
So that returning to a module feels instant and I don't lose my place.

**Acceptance Criteria:**

**Given** a user is viewing a filtered, sorted table in module A
**When** the user navigates to module B via the sidebar
**Then** module A's component is unmounted but its projection data remains in TanStack Query cache
**And** filter and sort state are persisted in URL search params (e.g., `?status=overdue&sort=date`) so they survive browser refresh, not just in-session navigation

**Given** the user returns to module A within the same session
**When** the cached data is less than 5 minutes old
**Then** the page renders instantly from cache — no loading skeleton
**And** scroll position is restored to where the user left off
**And** filter and sort state are restored from URL search params

**Given** the user returns to module A with stale data (> 5 minutes)
**When** the page renders
**Then** cached data is shown immediately with a small inline refresh indicator in the page header area (e.g., a spinning icon or "Refreshing..." text using `--color-text-tertiary`) — not a full-page skeleton
**And** data revalidates in the background via TanStack Query
**And** when fresh data arrives, the view updates in-place silently

**Given** a user visits a module for the first time in the session
**When** the module loads
**Then** a content-aware skeleton is displayed for a minimum 300ms to prevent flicker
**And** content replaces skeleton with a single crossfade transition
**And** subsequent polling updates render in-place (no skeleton re-entry)

**Given** the deployed shell version changes
**When** the shell detects a version mismatch (via `<meta>` tag in `index.html`)
**Then** the projection cache is cleared entirely to prevent stale schemas from crashing components

**Given** browser back/forward navigation is used
**When** the user presses the browser back button
**Then** the shell router manages history entries correctly
**And** the previous module's state is restored as described above

*FRs covered: FR26*

### Story 5.5: Build-Time Manifest Validation & Dependency Detection

As a shell team developer,
I want manifests validated at build time and cross-module imports detected,
So that integration errors are caught before deployment — not at runtime.

**Acceptance Criteria:**

**Given** the shell build processes module manifests
**When** a manifest has TypeScript type errors (missing required fields, wrong types)
**Then** the build fails with a clear error identifying the module and the specific field

**Given** the shell build processes module manifests
**When** semantic validation runs
**Then** duplicate routes across modules are detected and the build fails with both module names and the conflicting path
**And** invalid navigation items (missing labels, invalid icons) are detected and reported
**And** duplicate module `name` fields across manifests are detected and rejected

**Given** the CI pipeline includes cross-module dependency detection
**When** module A imports from module B's source code
**Then** the ESLint `no-restricted-imports` rule catches the violation
**And** the build fails with a message: "Cross-module imports are forbidden. Module [A] imports from Module [B]."
**And** zero imports between modules are allowed — all shared code flows through `@hexalith/*` packages

**Given** a module declares an invalid `manifestVersion`
**When** the shell build processes it
**Then** the build fails with guidance on which manifest versions are supported

**Given** all manifests pass validation
**When** the build completes
**Then** a manifest registry summary is logged: module count, route count, any warnings

*FRs covered: FR23, FR24*

### Story 5.6: Runtime Module Validation & Connection Indicators

As an end user,
I want to know when a module fails to load and when projection data freshness is degraded,
So that I understand the system state and can take appropriate action.

**Acceptance Criteria:**

**Given** the shell registers a module at runtime
**When** the `React.lazy()` dynamic import fails (network error, corrupt chunk)
**Then** the `<ModuleErrorBoundary>` catches the loading failure
**And** a contextual fallback UI is displayed: "Unable to load [Module Name]. Check your connection and try again."
**And** a retry button is available that re-attempts the dynamic import

**Given** a module loads successfully
**When** the module's root component renders
**Then** the shell validates that a React element was produced (not `null` or `undefined`)
**And** if the render produces nothing, the error boundary fallback is shown

**Given** projection data freshness degrades (connection state changes to `'disconnected'` due to polling failures)
**When** the status bar connection health segment updates
**Then** the end user sees the amber/red indicator from Story 1.6
**And** a module-level indicator can be shown via `useConnectionState()` from `@hexalith/cqrs-client`
**And** the indicator is visible to the end user (not hidden in a developer console)

**Given** backend connectivity recovers
**When** the status transitions back to `'connected'`
**Then** the indicator returns to the green/connected state
**And** stale projections are automatically revalidated
**And** the recovery is smooth — no page reload or layout shift

**Given** a module's backend service returns 5xx errors consistently
**When** multiple projection queries fail for the same module
**Then** the module displays its error boundary with a service-specific message
**And** other modules with different backends continue functioning normally

*FRs covered: FR27, FR28*

---

**Epic 5 Summary:** 6 stories covering 11 FRs (FR18-FR19, FR21-FR29). Stories 5.1-5.2 establish module discovery and navigation, 5.3 delivers error isolation and recovery, 5.4 provides state preservation and caching, 5.5 adds build-time safety nets, 5.6 handles runtime validation and connection indicators. After this epic, Elena experiences a seamless multi-module application.

---

## Epic 6: Build Pipeline, Quality Gates & Reference Module

Module developers publish via git integration with full CI enforcement. The Tenants reference module validates the complete platform stack end-to-end. Elena can manage tenants through the shell.

### Story 6.1: Full CI Pipeline & Quality Gates

As a shell team developer,
I want a comprehensive CI pipeline that enforces all quality gates on every PR,
So that broken manifests, token violations, accessibility regressions, and insufficient test coverage are caught before merging.

**Acceptance Criteria:**

**Given** the GitHub Actions PR pipeline is expanded from Story 1.8
**When** a PR is opened or updated
**Then** the pipeline executes the full gate sequence:
  1. Checkout (with `submodules: recursive`)
  2. Install (`pnpm install --frozen-lockfile`)
  3. Build (`turbo build` — cached, parallel)
  4. Lint (`turbo lint` — ESLint + Stylelint + token compliance)
  5. Test (`turbo test` — Vitest + Playwright CT with `@axe-core/playwright`)
  6. Coverage gate (≥ 80% modules, ≥ 95% foundation packages)
  7. Scaffold smoke test (scaffold temp module → compile → run scaffolded test → green)
  8. Manifest validation (TypeScript compile — invalid manifests fail)
  9. Design System Health gate (token parity, contrast matrix, a11y, prop budget, import boundaries, inline style ban)

**Given** a module has test coverage below 80%
**When** the coverage gate runs
**Then** the pipeline fails with a message identifying the module and its current coverage percentage
**And** foundation packages below 95% coverage also fail

**Given** the scaffold smoke test runs
**When** `create-hexalith-module` generates a temporary module
**Then** the generated module compiles without errors
**And** the generated tests pass
**And** template drift (scaffold produces broken output) is caught immediately

**Given** the Design System Health gate runs
**When** any violation is detected (non-token values, parity mismatch, a11y failure, prop budget exceeded)
**Then** a single Design System Health score is displayed in the PR
**And** 100% = pass, any violation = fail with specific remediation guidance

**Given** a module has `migrationStatus: "coexisting"` in its manifest
**When** the Design System Health gate runs for that module
**Then** the gate runs in warning mode — violations reported but do not block merge
**And** the compliance score is still displayed to track migration progress

**Given** the main branch pipeline runs on push
**When** all checks pass
**Then** the shell production build is generated (Vite production build)
**And** a Docker image is produced (shell app served by nginx)
**And** Turborepo remote caching is used for cross-run efficiency

*FRs covered: FR48*

### Story 6.2: Module Publishing via Git Integration

As a module developer,
I want to publish my module to the shell by adding my git repository,
So that my module integrates into the shell without manual build configuration or code changes.

**Acceptance Criteria:**

**Given** a module is developed as an independent git repository
**When** the shell team adds it as a git submodule in `modules/`
**Then** `git submodule add <repo-url> modules/<module-name>` adds the reference
**And** `.gitmodules` is updated with the submodule entry
**And** the submodule commit is pinned — CI always builds against the pinned version, not HEAD

**Given** the module is added to the workspace
**When** `pnpm-workspace.yaml` includes `modules/*`
**Then** pnpm resolves the module's `@hexalith/*` peer dependencies to the local workspace packages during development
**And** the module builds alongside the shell in the Turborepo task graph

**Given** foundation packages need to be available to external teams developing modules outside the shell workspace
**When** the shell team publishes `@hexalith/shell-api`, `@hexalith/cqrs-client`, and `@hexalith/ui` to GitHub Packages
**Then** external module developers can install versioned packages from the registry
**And** packages follow strict semver — breaking changes require major version bump

**Given** a module developer updates their module
**When** the shell team updates the submodule reference (`git submodule update --remote modules/<name>`)
**Then** the new module version is tested by the full CI pipeline before merging
**And** the submodule pin advances only when CI passes

**Given** a module's peer dependency version doesn't match the workspace packages
**When** `pnpm install` runs
**Then** a clear warning is displayed identifying the version mismatch
**And** the module developer is guided to update their peer dependency version

*FRs covered: FR47*

### Story 6.3: Tenants Reference Module — CQRS Integration

As a shell team developer,
I want a complete Tenants module that validates the CQRS integration end-to-end,
So that we prove `useCommand` and `useProjection` work with real domain types against the actual backend API patterns.

**Acceptance Criteria:**

**Given** the Tenants module exists as an independent git repository (already in `modules/tenants/` as submodule)
**When** a developer inspects the module's domain types
**Then** Zod schemas define `TenantViewSchema` and `TenantDetailSchema` with realistic fields (id, name, code, status, createdAt)
**And** types are inferred from schemas via `z.infer<>` — no manual type duplication
**And** command types define `CreateTenantCommand`, `UpdateTenantCommand`, `DisableTenantCommand`

**Given** the Tenants module uses `useProjection`
**When** `TenantListPage` renders
**Then** `useProjection(TenantListSchema, { domain: 'Tenants', queryType: 'GetTenantList' })` fetches data
**And** the projection is tenant-scoped via cache key `['projection', tenantId, 'Tenants', ...]`
**And** loading, error, and empty states are all handled correctly

**Given** the Tenants module uses `useCommand`
**When** a user creates a new tenant via the form
**Then** `useCommand().send(createTenantCommand)` submits to the backend
**And** the three-phase feedback pattern is visible: optimistic → confirming → confirmed
**And** on success, the tenant list projection is invalidated and refreshes
**And** on rejection, a `CommandRejectedError` is displayed inline

**Given** the Tenants module runs in the dev host
**When** using mock implementations
**Then** `MockCommandBus` and `MockQueryBus` provide realistic tenant data and command responses
**And** the mock behavior matches the contract tests from Epic 2

### Story 6.4: Tenants Reference Module — UI & Shell Integration

As an end user (Elena),
I want to manage tenants through the shell — list, view details, create, and update,
So that the complete platform stack is validated end-to-end with a real module.

**Acceptance Criteria:**

**Given** the Tenants module is integrated into the shell as a git submodule
**When** the shell builds
**Then** the Tenants manifest is discovered and validated at build time
**And** Tenants routes (`/tenants`, `/tenants/detail/:id`) are registered
**And** Tenants appears in the sidebar under the correct category group

**Given** Elena navigates to the Tenants module
**When** the tenant list page loads
**Then** a `<Table>` displays tenants with sorting, filtering, and pagination
**And** the table uses Linear-inspired compact density
**And** row click navigates to the tenant detail view
**And** empty state shows: "No tenants yet. Create your first tenant."

**Given** Elena views a tenant detail page
**When** the detail page renders
**Then** `<DetailView>` shows tenant information in sections with key-value pairs
**And** action buttons (Edit, Disable) are available
**And** the URL is deep-linkable: `/tenants/detail/{id}`

**Given** Elena creates a new tenant
**When** the creation form is submitted
**Then** `<Form>` validates input via Zod schema inline (field-level errors)
**And** on submit, `useCommand` sends the create command
**And** feedback toast confirms success or shows rejection error

**Given** the Tenants module exercises all @hexalith/ui components
**When** reviewing the module
**Then** it uses: `<Table>`, `<Form>`, `<DetailView>`, `<PageLayout>`, `<Stack>`, `<Button>`, `<Input>`, `<Select>`, `<Skeleton>`, `<EmptyState>`, `<ErrorDisplay>`, `<Toast>`, `<Modal>` (for delete confirmation)
**And** all components render correctly in both light and dark themes

**Given** the Tenants module is the end-to-end validation artifact
**When** all stories in this epic are complete
**Then** the following is proven working: monorepo build, design tokens, shell-api providers, cqrs-client hooks, @hexalith/ui components, CLI scaffold (Tenants matches scaffold patterns), module discovery, unified navigation, error isolation, state preservation, CI quality gates

**Given** E2E tests are created in `apps/shell/e2e/`
**When** Playwright E2E tests (`.spec.ts`) run against the shell with Tenants module
**Then** at least the following user flows are covered:
  - Login → see tenant list → click row → see detail → navigate back
  - Create tenant → form validation → submit → see confirmation toast → tenant appears in list
  - Switch tenant via status bar → table data refreshes for new tenant
  - Module error recovery → trigger error → see error boundary → retry → module recovers
**And** E2E tests include axe-core accessibility checks on key pages
**And** E2E tests run in CI as part of the main pipeline

### Story 6.5: Error Monitoring Integration

As a platform operator (Ravi),
I want the shell to capture module error events and expose them for external monitoring,
So that I can integrate with observability tools (Sentry, OpenTelemetry) when they're configured.

**Acceptance Criteria:**

**Given** a module throws an error caught by the error boundary
**When** the shell captures the event
**Then** a structured error event is created with: `{ timestamp, moduleName, errorCode, errorMessage, stackTrace, userId, tenantId, route, sessionId, buildVersion }`
**And** the event is stored in an in-memory event buffer (last 100 events)

**Given** the shell exposes an error event API
**When** an external monitoring tool is configured
**Then** it can subscribe to error events via a shell-level `onModuleError` callback
**And** the callback receives the structured error event object
**And** the integration point is documented with example Sentry and console-logger configurations

**Given** no monitoring integration is configured
**When** module errors occur
**Then** errors are logged to the browser console with structured formatting
**And** the in-memory buffer still captures events for diagnostic purposes

**Given** the error event API is part of the shell's public surface
**When** inspecting the configuration
**Then** the `onModuleError` callback is configured in the shell's initialization (not in module code)
**And** module developers never interact with the monitoring integration — it's shell-level infrastructure

**Given** rate limiting is applied to error events
**When** a module enters a crash loop producing many errors
**Then** duplicate error events (same module, same error code) are deduplicated within a 5-second window
**And** the buffer does not grow unbounded

*FRs covered: FR51*

### Story 6.6: Testing Strategy & Quality Gates (CI Formalization)

As a shell team developer,
I want CI-enforced testing workflows with traceability and quality gate decisions,
So that the ATDD practice established in Epic 1 is formally enforced by CI, and every release is backed by risk-calibrated test coverage, not subjective readiness assessments.

**Acceptance Criteria:**

**Given** the ATDD practice has been followed since Epic 1 (manually, by team discipline)
**When** the CI enforcement is added in this story
**Then** CI rejects implementation PRs that lack corresponding acceptance tests for their story
**And** the ATDD workflow automates failing acceptance test generation from story acceptance criteria

**Given** an epic enters test planning
**When** the Test Design workflow analyzes the epic's risk profile
**Then** a risk-calibrated test strategy is produced adjusting test pyramid ratios (unit/integration/E2E) based on risk — API-heavy epics weight integration higher, UI-heavy epics weight E2E higher
**And** each acceptance criterion receives a priority classification (P0-P3)

**Given** a release gate is approaching
**When** the Traceability workflow runs
**Then** a bidirectional requirements-to-tests matrix is generated mapping every acceptance criterion to at least one test
**And** unmapped criteria are flagged with gap identification
**And** a quality gate recommendation is produced: PASS, CONCERNS, or FAIL

**Given** the Test Review workflow validates test quality
**When** tests are submitted for review
**Then** tests are validated against defined standards: deterministic (no hard waits), isolated (self-cleaning, parallel-safe), explicit (assertions in test body), focused (< 300 lines per file), and fast (< 1.5 minutes per test)
**And** tests violating standards are flagged with specific remediation guidance

**Given** consumer contract tests are defined for the CQRS boundary
**When** the frontend's expected CommandApi and projection API interactions are tested
**Then** contract tests verify that the frontend's expectations match the backend's actual behavior independently
**And** the `can-i-deploy` check confirms frontend-backend compatibility

**Given** contract verification fails
**When** the CI pipeline evaluates the deployment gate
**Then** production deployment is blocked until contract compatibility is restored
**And** the failure identifies the specific contract violation and affected endpoints

*FRs covered: FR52, FR53, FR54, FR55, FR56, FR57*

---

**Epic 6 Summary:** 6 stories covering 9 FRs (FR47-FR48, FR51-FR57) plus end-to-end validation of all previous epics via the Tenants reference module. Stories 6.1-6.2 establish the full CI pipeline and publishing workflow, 6.3-6.4 build and integrate the Tenants module as proof of the complete stack, 6.5 adds monitoring integration, 6.6 enforces testing strategy and quality gates. After this epic, the platform is production-validated.

---

## Epic 7: AI Module Generation

AI agents can generate complete modules from domain descriptions that pass all quality gates without manual correction. Knowledge bundles and prompt templates enable reliable AI generation. Last MVP epic — can slip to early Phase 2 if timeline pressure.

### Story 7.1: Machine-Readable Knowledge Bundle

As an AI agent (or a developer writing AI prompts),
I want a structured, machine-readable knowledge bundle describing the platform's contracts,
So that AI-generated modules conform to the manifest schema, hook API, and component catalog without guessing.

**Acceptance Criteria:**

**Given** a knowledge bundle is created in the repository
**When** an AI agent or prompt author accesses it
**Then** the bundle includes a structured description of the `ModuleManifest` schema with all required and optional fields, types, and constraints
**And** the bundle includes the `useCommand` hook API: parameters, return shape, status transitions, error types
**And** the bundle includes the `useProjection` hook API: parameters, Zod schema integration, return shape, caching behavior
**And** the bundle includes the `@hexalith/ui` component catalog: each component's name, props (with types and defaults), usage example, and density options

**Given** the knowledge bundle covers naming conventions
**When** an AI agent reads it
**Then** file naming conventions (PascalCase components, camelCase hooks, etc.) are documented
**And** code naming conventions (I-prefix interfaces, union types over enums, etc.) are documented
**And** file organization patterns (co-located tests, no __tests__ dirs, barrel exports at root only) are documented

**Given** the knowledge bundle covers the scaffold structure
**When** an AI agent generates a module
**Then** the bundle describes the expected directory structure with purpose of each directory
**And** import ordering rules are documented (React → external → @hexalith → relative → CSS)
**And** the pattern for loading/error/empty state handling is documented

**Given** the knowledge bundle is versioned
**When** the platform API changes
**Then** the knowledge bundle is updated alongside the API change (stale bundles are a P1 bug)
**And** the bundle version matches the `@hexalith/*` package versions

*FRs covered: FR42*

### Story 7.2: AI Prompt Templates

As a developer using AI tools for module generation,
I want prompt templates optimized for generating correct FrontShell modules,
So that I can generate modules by providing a domain description without crafting prompts from scratch.

**Acceptance Criteria:**

**Given** prompt templates are created in the repository
**When** a developer uses the "new module" template
**Then** the template accepts: module name, domain description, entity list, command list, and projection list
**And** the template references the knowledge bundle for schema and API details
**And** the template includes instructions for: manifest creation, Zod schema definition, page generation, hook integration, and test generation

**Given** prompt templates exist for common generation scenarios
**When** reviewing the template collection
**Then** templates include:
  - **New module from domain description** — generates complete module with pages, schemas, hooks, tests
  - **Add command to existing module** — generates command type, form page, useCommand integration
  - **Add projection page** — generates Zod schema, list page with Table, detail page with DetailView
**And** each template produces output that follows all naming and structure conventions

**Given** the templates include quality guidance
**When** an AI agent follows the template
**Then** the generated code includes: loading states (`<Skeleton>`), error states (`<ErrorDisplay>`), empty states (`<EmptyState>`)
**And** all forms use Zod schemas as the single source of validation truth
**And** no inline styles, no direct Radix imports, no TypeScript enums are generated

**Given** the templates are maintained
**When** the platform API or conventions change
**Then** templates are updated and tested — stale templates that produce non-compiling output are a P1 bug

*FRs covered: FR45*

### Story 7.3: AI Generation Pipeline & Quality Gate Pass-Through

As a module developer,
I want AI-generated modules to pass all quality gates without manual correction,
So that AI generation is a reliable, production-ready workflow — not a starting point that needs extensive fixing.

**Acceptance Criteria:**

**Given** an AI agent generates a module using the knowledge bundle and prompt templates
**When** the generated module is placed in the `modules/` directory
**Then** `pnpm install` resolves all dependencies without errors
**And** `pnpm build` compiles the module without TypeScript errors
**And** `pnpm lint` passes all ESLint and Stylelint rules (import boundaries, naming, token compliance)
**And** `pnpm test` passes all generated Vitest tests

**Given** the generated module is integrated into the shell
**When** the full CI pipeline runs
**Then** the module passes all quality gates: coverage ≥ 80%, token compliance 100%, axe-core 0 violations, manifest validation passes
**And** the scaffold smoke test (if applicable) passes

**Given** an AI generates a module from a domain description like "Order management with order list, order detail, and create order form"
**When** the generation completes
**Then** the module includes: `OrderListPage` with `<Table>`, `OrderDetailPage` with `<DetailView>`, `CreateOrderPage` with `<Form>`
**And** Zod schemas define `OrderViewSchema`, `OrderDetailSchema`, `CreateOrderSchema`
**And** `useProjection` and `useCommand` are correctly integrated
**And** realistic domain data is used in tests and Storybook stories (not placeholder text)

**Given** AI-generated and human-authored modules exist in the same shell
**When** both are built and tested
**Then** the same quality gates apply to both — no special exceptions for AI-generated modules
**And** the visual output of AI-generated modules is indistinguishable from human-authored ones (both use `@hexalith/ui` exclusively)

*FRs covered: FR43, FR44*

### Story 7.4: Generation Validation Feedback

As a module developer,
I want clear, actionable validation results when an AI-generated module fails quality gates,
So that I can fix specific issues rather than debugging blind.

**Acceptance Criteria:**

**Given** an AI-generated module fails one or more quality gates
**When** the developer runs the validation
**Then** each failure is reported with:
  - The specific gate that failed (e.g., "Token Compliance", "TypeScript Build", "Coverage")
  - The exact file and line number of the violation
  - The expected value or pattern
  - A remediation suggestion (e.g., "Replace `#f5f5f5` with `var(--color-surface-secondary)`")

**Given** the manifest validation fails
**When** viewing the results
**Then** the error identifies the missing or incorrectly typed field
**And** the expected type and an example value are shown

**Given** the token compliance scan fails
**When** viewing the results
**Then** each non-token value is identified with its file location
**And** the correct token name is suggested as replacement

**Given** the ESLint import boundary check fails
**When** viewing the results
**Then** the forbidden import is identified (e.g., "Direct import of `@radix-ui/react-dialog` in module code")
**And** the correct `@hexalith/ui` component alternative is suggested (e.g., "Use `<Modal>` from `@hexalith/ui` instead")

**Given** test coverage is below the threshold
**When** viewing the results
**Then** uncovered files and functions are listed
**And** the current coverage percentage and required threshold are shown

**Given** validation results are available
**When** the developer reviews them
**Then** results can be output as structured JSON (for programmatic consumption by AI tools) or human-readable text
**And** the AI agent can use the structured feedback to self-correct and regenerate

*FRs covered: FR46*

---

**Epic 7 Summary:** 4 stories covering 5 FRs (FR42-FR46). Story 7.1 provides the knowledge foundation, 7.2 delivers prompt templates, 7.3 validates end-to-end generation quality, 7.4 enables iterative improvement through actionable feedback. After this epic, AI agents can reliably generate production-ready modules — the "I can't tell which one the AI built" moment.

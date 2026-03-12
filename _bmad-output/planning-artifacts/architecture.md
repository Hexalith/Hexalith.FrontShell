---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - product-brief-Hexalith.FrontShell-2026-03-10.md
  - prd.md
  - prd-validation-report.md
  - ux-design-specification.md
  - research/technical-dapr-cqrs-typescript-frontend-research-2026-03-10.md
workflowType: 'architecture'
project_name: 'Hexalith.FrontShell'
user_name: 'Jerome'
date: '2026-03-12'
lastStep: 8
status: 'complete'
completedAt: '2026-03-12'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

73 FRs spanning six architectural domains:

| Domain | Scope | Architectural Impact |
|--------|-------|---------------------|
| **CQRS Integration** | useCommand, useProjection hooks, ICommandBus/IQueryBus interfaces, DaprCommandBus/DaprQueryBus implementations, MockCommandBus/MockQueryBus | Core abstraction layer — ports-and-adapters pattern. Frontend calls REST CommandApi (POST /api/v1/commands) and per-microservice projection query APIs. SignalR for real-time projection freshness. Transport-agnostic by design. |
| **Shell Infrastructure** | Auth provider, tenant context, layout, router, error boundaries, status bar | Shell-as-platform — manages all cross-cutting infrastructure. Modules receive context via React providers. Shell owns the entire chrome (sidebar, top bar, status bar). |
| **Module System** | Typed manifest, build-time registration, route declaration, navigation contribution | Contract-bounded composition. Manifest is the center of gravity. Build-time validation catches integration errors before deployment. |
| **Component Library** | @hexalith/ui — ~15 MVP components wrapping Radix primitives with design tokens | Enforcement architecture — CSS @layer cascade, token compliance scanner, import boundary ESLint rules. Components are the coherence guarantee. |
| **Developer Tooling** | create-hexalith-module CLI, shell dev host, base test fixtures | Scaffold-first DX. CLI generates working module with CQRS hooks, Playwright test, and manifest. Dev host provides mock auth for isolated development. |
| **Build-Time Validation** | Manifest type checking, test coverage gates, token compliance | CI pipeline enforces quality gates. Invalid manifests fail the build. Modules require ≥ 80% coverage. |

**Non-Functional Requirements:**

48 NFRs driving architectural decisions:

| Category | Key Requirements | Architecture Driver |
|----------|-----------------|-------------------|
| **Performance** | Build time ≤ 60s with 20 modules; sub-second HMR; skeleton-to-content CLS budget: 0 | Build-time composition requires incremental build strategy and code splitting to meet the 60s ceiling at scale. Vite dev server for HMR. Content-aware skeletons matching content dimensions exactly. |
| **Security** | Shell-managed authentication; tenant isolation; module sandboxing | Centralized auth provider; tenant context broadcasting; per-module error boundaries; ESLint import restrictions enforced at dev-time AND CI (not CI-only). |
| **Accessibility** | WCAG AA compliance; visible focus always; screen reader support | Radix primitives for behavior; semantic HTML; contrast matrix validation in CI. |
| **Maintainability** | Semantic versioning; deprecation policy; API stability | Three foundation packages with clear API contracts; structural/content component distinction; prop budgets. Manifest schema versioning via discriminated union with `manifestVersion` field. |
| **Reliability** | Partial failure tolerance; SignalR reconnection; graceful degradation | Per-module error boundaries; SignalR reconnection with jittered exponential backoff to prevent thundering herd; cached projection data. |
| **DX** | ≤ 30 min onboarding; 0 lines infrastructure code; scaffolded tests pass | CLI scaffold with working example; shell-managed infrastructure; pre-built test fixtures with realistic async behavior matching real implementations. |

**Scale & Complexity:**

- Primary domain: Frontend Platform Engineering
- Complexity level: High
- Estimated architectural components: ~12 (3 foundation packages + shell app + CLI + dev host + CI tooling + 5 infrastructure services)

### Technical Constraints & Dependencies

| Constraint | Source | Impact |
|-----------|--------|--------|
| **DAPR JS SDK is Node.js-only** | Technical research | Frontend cannot invoke DAPR directly. Must use Hexalith.EventStore's REST CommandApi and per-microservice projection query APIs. SignalR for real-time updates. |
| **.NET backend is immovable** | Brownfield ecosystem | Hexalith.EventStore, DAPR, .NET Aspire are existing infrastructure. Frontend architecture must integrate with these, not replace them. |
| **Type-safe contract enforcement at module boundaries** | PRD architectural decision | The real constraint is typed contract enforcement, not build-time per se. Build-time TypeScript compilation is the current enforcement mechanism. No runtime Module Federation. Modules are NPM packages imported at build time. Shell compiles all modules into a single application. |
| **React + TypeScript** | PRD technology choice | Frontend stack is React + Vite + react-router-dom + TypeScript. All foundation packages target this stack. |
| **Three-package coupling surface** | PRD contract boundary + UX spec | Modules depend on @hexalith/shell-api, @hexalith/cqrs-client, and @hexalith/ui (peer dependency on shell-api for locale). Implicit dependency on React context provider shapes. No other shell dependencies permitted. |
| **Radix Primitives selected** | UX specification | Accessibility behavior layer. Encapsulated inside @hexalith/ui — module developers never import Radix directly. Fallback path to React Aria architecturally designed. Storybook requires mock ShellProvider for isolated @hexalith/ui development. |
| **TanStack Table + React Hook Form** | UX specification | Data table management and form state management. Integrated within @hexalith/ui components, not exposed to module developers. |
| **CSS @layer enforcement** | UX specification | Six-layer cascade order (reset, tokens, primitives, components, density, module). Module styles cannot override component styles. Structural enforcement. |
| **Adoption sequence constraint** | Architectural analysis | Architecture must support three adoption phases: (1) shell-team-as-module-developer, (2) supported external team, (3) self-service external team. Each phase has different requirements for error messages, documentation, and failure recovery. |
| **Foundation package freeze deadline** | DX-UX temporal gap | @hexalith/ui and foundation packages must be stable before external module developer onboarding begins. Broken components during onboarding destroys trust irreversibly. |
| **Manifest schema versioning** | Manifest evolution risk | Manifest type must support versioned evolution via discriminated union (`manifestVersion` field). Phase 2 features (slots, lifecycle hooks, capability declarations) are additive variants, not breaking changes. |

### Architectural Distinctions

| Concept | Meaning | Not to Be Confused With |
|---------|---------|------------------------|
| **Module-as-concept** | An independently-developed, contract-bounded UI contribution to the shell | Module-as-artifact (NPM package). The contribution is the architectural unit; NPM is the distribution mechanism. |
| **Build-time composition** | TypeScript compile-time type checking as contract enforcement | A technical necessity. The real requirement is type-safe contract enforcement — build-time is the current means, not the end. |
| **SignalR connection** | Shell-level single multiplexed connection for all projection subscriptions | Per-module connections. One connection, multiplexed across all active projections. Shell owns the connection lifecycle. |

### Cross-Cutting Concerns Identified

| Concern | Spans | Architecture Implication |
|---------|-------|------------------------|
| **Multi-tenancy** | Auth, data, UI, status bar, caching | Tenant context as shell-level React context. Tenant switching clears projection caches. Projection cache keys must be tenant-scoped (`{tenantId}:{entityType}:{entityId}`) — shell-enforced, not module-developer's responsibility. Command payloads automatically scoped to active tenant by shell infrastructure. |
| **Authentication & authorization** | Shell, all modules | Shell-managed auth provider. SSO with silent token refresh. Modules receive auth context — never handle tokens directly. Module-level authorization is domain-specific. |
| **CQRS transport abstraction** | cqrs-client, shell, modules | Ports-and-adapters pattern. ICommandBus/IQueryBus interfaces with swappable implementations. Mock implementations must simulate async behavior with configurable delay and support three-phase command lifecycle to prevent mock/real divergence. Contract testing between mock and real implementations required. |
| **Design system enforcement** | All UI code | Token compliance scanner + CSS layers + ESLint import boundaries + inline style ban. Enforcement at dev-time (scaffold .eslintrc) AND CI (pipeline gate). Single Design System Health gate. Token governance is organizational, not just technical — budget enforcement requires clear escalation path. |
| **Error isolation** | Shell, all modules | Per-module React error boundaries. Module failure shows contextual error; rest of application remains functional. ErrorBoundary component in @hexalith/ui. |
| **Real-time data** | cqrs-client, shell, modules | Single multiplexed SignalR connection managed by shell. Three-phase feedback (optimistic → confirming → confirmed). Connection health in status bar. Jittered exponential backoff on reconnection to prevent thundering herd after backend deploys. |
| **Internationalization** | All UI components | Logical CSS properties (margin-inline-start, not margin-left). Intl.* formatting via shell locale provider. RTL layout designed-for but Phase 2. |
| **Module lifecycle** | Shell, router, modules | React.lazy() for MVP. Stale-while-revalidate navigation cache. Scroll position and filter state preserved on return visits. |
| **Build-time quality gates** | CI, all packages | Manifest validation, test coverage (≥ 80% modules, ≥ 95% foundation), token compliance, accessibility audit. Single pipeline enforces all gates. |
| **Build scalability** | Shell build pipeline | Build time ≤ 60s with 20 modules requires explicit incremental build strategy, code splitting, and tree-shaking decisions. Monorepo-vs-coordination forcing function: either monorepo (simpler builds, coupled releases) or release pipeline composing independently-versioned NPM packages. |
| **Mock fidelity** | Test fixtures, all modules | Mock implementations (MockCommandBus, MockQueryBus) must faithfully reproduce async timing, error modes, and lifecycle events of real implementations. Contract tests validate mock/real parity. Without this, test suites create false confidence. |

## Starter Template Evaluation

### Primary Technology Domain

Monorepo platform — multiple publishable NPM packages + shell application + tooling, based on React + TypeScript + Vite.

### Starter Options Considered

| Option | Strengths | Weaknesses | Fit |
|--------|-----------|------------|-----|
| **Turborepo + pnpm workspaces** | Official design-system example; fast remote caching; simple `turbo.json` config; pnpm symlinks = fastest installs; Vercel-maintained | Less powerful code generators than Nx; no built-in affected-files detection | Best fit |
| **Nx** | Powerful generators; affected detection; rich plugin ecosystem; project graph visualization | Heavier config; steeper learning curve; more opinionated about project structure; overkill for this package count | Over-engineered |
| **pnpm workspaces alone** | Zero additional tooling; simplest mental model | No task caching — 60-second build NFR at 20 modules is at risk without cached builds; no parallel task orchestration | Too lean |
| **Vite `create vite@latest` (single app)** | Simplest possible start | Not a monorepo — can't manage multiple publishable packages; would need to restructure later | Wrong scope |

### Selected Starter: Turborepo + pnpm workspaces (design-system example)

**Rationale:**

1. **Build NFR alignment.** Turborepo's content-hash caching means unchanged packages rebuild in ~0.2s instead of 30s. This is how you stay under 60s with 20 modules.
2. **Official design-system example** maps directly to FrontShell's structure — shared UI package + consuming apps + Storybook.
3. **pnpm** is the most efficient package manager for monorepos (symlink-based, strict dependency resolution, native workspace protocol).
4. **Simple config.** `turbo.json` defines the task dependency graph in one file. No learning curve compared to Nx's `project.json` + `workspace.json` + plugins.
5. **tsup for library packages.** esbuild-powered bundler used in the Turborepo design-system example. Produces ESM + CJS + type declarations. Sub-second builds for pure library packages. Vite library mode is an alternative but tsup is purpose-built for this.

**Initialization Command:**

```bash
pnpm dlx create-turbo@latest hexalith-frontshell --example design-system --package-manager pnpm
```

Then restructure from the design-system example to match the FrontShell package topology.

### Architectural Decisions Provided by Starter

**Language & Runtime:**
- TypeScript (strict) across all packages
- Shared `tsconfig.json` base with per-package extensions
- Node.js 22.x (LTS) for tooling; browser target for packages

**Styling Solution:**
- Not provided by starter — add CSS Modules + CSS `@layer` + design token custom properties
- PostCSS + Stylelint configured as workspace-level tooling

**Build Tooling:**
- tsup for foundation packages (@hexalith/shell-api, @hexalith/cqrs-client, @hexalith/ui) — ESM output, .d.ts generation
- Vite for shell application — SPA build with react-router v7
- Turborepo orchestrates build order based on package dependency graph
- Turborepo remote caching for CI pipeline

**Testing Framework:**
- Vitest as workspace-level test runner (shared config at root)
- Playwright for component testing (@hexalith/ui) and E2E (shell app)
- Storybook 10 with @storybook/react-vite for isolated component development

**Code Organization:**

```
hexalith-frontshell/
├── apps/
│   └── shell/                    # Shell application (Vite + React)
├── packages/
│   ├── shell-api/                # @hexalith/shell-api
│   ├── cqrs-client/              # @hexalith/cqrs-client
│   ├── ui/                       # @hexalith/ui (wraps Radix + tokens + Storybook)
│   ├── tsconfig/                 # Shared TypeScript configurations
│   └── eslint-config/            # Shared ESLint configurations
├── modules/                      # Git submodules — each is an independent module repo
│   └── tenants/                  # Git submodule: Hexalith.Tenants
├── tools/
│   └── create-hexalith-module/   # CLI scaffold tool
├── turbo.json                    # Turborepo task dependency graph
├── .gitmodules                   # Git submodule references
├── pnpm-workspace.yaml           # packages/*, apps/*, modules/*, tools/*
├── package.json                  # Root scripts and devDependencies
└── .github/
    └── workflows/                # CI pipeline with Turborepo caching
```

**Development Experience:**
- `pnpm dev` — starts shell app + Storybook in parallel (Turborepo orchestrated)
- `pnpm build` — builds all packages in dependency order with caching
- `pnpm test` — runs Vitest across all packages
- `pnpm lint` — ESLint + Stylelint + token compliance across all packages
- HMR via Vite dev server (< 1 second reload)
- Turborepo watch mode for rebuilding library packages on change during development

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Client-side state management | React Context (shell) + TanStack Query (projections) | Context matches PRD's provider model; TanStack Query provides battle-tested caching/invalidation for the CQRS query layer |
| 2 | Authentication library | oidc-client-ts + react-oidc-context | Provider-agnostic OIDC — same build deploys against Keycloak or Entra ID |
| 3 | REST client | ky (~3KB) | Thin fetch wrapper with hooks for auth token injection, retry, and JSON shortcuts |
| 4 | Runtime type validation | Zod (~13KB) | Projection data crosses a trust boundary (external API). Zod validates responses at runtime and infers TypeScript types from schemas |
| 5 | Command lifecycle (three-phase feedback) | Status polling (GET /api/v1/commands/status/{correlationId}) | Backend has no SignalR. Status endpoint returns `Retry-After: 1`. Polling maps to the UX three-phase pattern. |
| 6 | Projection freshness | TanStack Query refetch-on-command-complete + configurable background refetchInterval | No push mechanism in backend. Command completion triggers targeted projection refetch. Background polling optional per use case. |

**Important Decisions (Shape Architecture):**

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 7 | CI/CD pipeline | GitHub Actions + Turborepo Remote Cache | Consistent with existing GitHub ecosystem. Turborepo cache makes CI fast. Single pipeline: build → lint → token compliance → test → coverage gate → manifest validation |
| 8 | Module distribution | Git submodules in pnpm workspace | Each module is an independent git repo consumed as a submodule in `modules/`. pnpm workspace resolves versioned peerDependencies to local packages during development. Foundation packages published to GitHub Packages when external teams develop modules outside the shell workspace |
| 9 | Environment configuration | Vite `.env` (build-time) + runtime `/config.json` (deployment-time) | Same Docker image deploys against Keycloak or Entra ID without rebuild. OIDC provider URL, CommandApi base URL, tenant claim name are runtime config |
| 10 | Error handling | Typed error hierarchy + per-module error boundaries | Structured error types for API errors, validation errors, auth errors, network errors. Shell catches unhandled errors at module boundary |

**Deferred Decisions (Post-MVP):**

| Decision | Rationale for Deferral | Target Phase |
|----------|----------------------|--------------|
| SignalR real-time push | Backend doesn't implement it yet. MVP uses polling (Decision #5: command status polling, Decision #6: TanStack Query refetch). FR11 (real-time updates) addressed via polling; FR12 (connection state) and FR27 (real-time indicator) deferred until SignalR exists. Architecture supports adding SignalR via TanStack Query cache invalidation when backend adds SignalR hub — no module code changes required. | Phase 2 |
| Remote logging/monitoring | Focus on core platform first. Add structured logging (e.g., Sentry, OpenTelemetry) when production traffic exists | Phase 2 |
| Module-to-module communication | PRD explicitly defers. No validated use case yet | Phase 3+ |
| OpenAPI codegen pipeline | Types manually maintained for 1-2 modules. Automated generation at scale | Phase 2 |

### Data Architecture

**No Traditional Database.** FrontShell is a frontend platform — all persistent data lives in the backend (Hexalith.EventStore). The frontend manages only transient client-side state.

**Client-Side Data Flow:**

```
Backend APIs                    @hexalith/cqrs-client              Module UI
─────────────                   ─────────────────────              ─────────
POST /api/v1/commands    ←──    ICommandBus.send(cmd)       ←──    useCommand()
GET  /status/{id}        ←──    (internal polling)                 (status via hook)
POST /api/v1/queries     ←──    IQueryBus.query(q)          ←──    useProjection<T>()
                         ──→    TanStack Query cache        ──→    typed data + loading/error
```

**Projection Caching Strategy (TanStack Query):**

| Behavior | Configuration | Rationale |
|----------|--------------|-----------|
| Cache key | `['projection', tenantId, domain, queryType, aggregateId, params]` | Tenant-scoped — tenant switch invalidates all cached projections |
| Stale time | 30 seconds (default, configurable per projection) | Balance between freshness and API load |
| Cache time | 5 minutes | Keep data for return-visit instant render |
| Refetch on command complete | `useCommand` calls `queryClient.invalidateQueries` for affected projection keys | Targeted freshness after writes |
| Background refetch | Optional `refetchInterval` per `useProjection` call | For dashboards or tables needing near-real-time |
| Refetch on window focus | Enabled | Catch up after tab switching |

**Runtime Validation (Zod):**

Module developers define Zod schemas for their projection types. The `useProjection<T>()` hook validates the query response payload against the schema at runtime:

```typescript
// Module developer writes:
const OrderViewSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  status: z.enum(['draft', 'placed', 'shipped', 'delivered']),
  total: z.number(),
  createdAt: z.string().datetime(),
});
type OrderView = z.infer<typeof OrderViewSchema>;

// Usage — validated at runtime, typed at compile time:
const { data, isLoading, error } = useProjection(OrderViewSchema, {
  domain: 'Orders',
  queryType: 'GetOrderList',
});
```

If the backend returns a shape that doesn't match the schema, `useProjection` surfaces a clear validation error instead of a runtime crash in a component.

### Authentication & Security

**OIDC Authentication Flow:**

```
Browser                    Shell (oidc-client-ts)           OIDC Provider
───────                    ─────────────────────            ──────────────
App loads           →      Check session storage
                           Token valid?
                    ←      Yes: render app
                    ←      No: redirect to OIDC provider   →   Login page
User logs in                                               ←   Auth code
                    ←      Exchange code for tokens         →   Token endpoint
                           Store tokens
                           Render app
Silent refresh      →      iframe silent renew              →   /authorize (prompt=none)
                    ←      New tokens                       ←   New auth code
```

**Auth Architecture Decisions:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| OIDC library | oidc-client-ts + react-oidc-context | Provider-agnostic (replaces PRD's keycloak-js choice). Works with Keycloak and Entra ID identically without code changes — same build deploys against either provider via runtime `/config.json`. Eliminates provider-specific coupling that keycloak-js would introduce. |
| Token storage | Session storage (oidc-client-ts default) | Survives page refresh, cleared on tab close. More secure than localStorage for tokens. |
| Token injection | ky `beforeRequest` hook adds `Authorization: Bearer {token}` | Centralized in shell — modules never see tokens |
| Tenant injection | ky `beforeRequest` hook adds `tenant` field from active tenant context | Shell-enforced — modules never provide tenant |
| User ID source | JWT `sub` claim (matches backend's hardcoded extraction) | Backend rejects tokens without `sub` claim |
| Tenant claims | JWT `eventstore:tenant` claim (multi-value) | Backend uses this for tenant authorization. Shell reads it to populate tenant switcher list. |
| Silent refresh | oidc-client-ts automatic silent renew (iframe-based) | Transparent to modules. Auth context updates via React context. |
| OIDC provider URL | Runtime `/config.json` — not build-time | Same build deploys against Keycloak (dev/staging) or Entra ID (production) |

**Security Hardening:**

| Measure | Implementation |
|---------|---------------|
| CSP headers | Strict Content-Security-Policy configured at hosting layer. `script-src 'self'`. No inline scripts. |
| Import boundary enforcement | ESLint `no-restricted-imports` blocks direct `@radix-ui/*`, CSS-in-JS, and `oidc-client-ts` imports in module code |
| Inline style ban | ESLint rule blocks `style={{}}` in module JSX |
| Rate limiting | Backend enforces per-tenant sliding window. Frontend surfaces 429 as user-facing "too many requests" message |

### API & Communication Patterns

**Backend API Surface (from Hexalith.EventStore):**

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/v1/commands` | POST | Submit command | 202 + `{ correlationId }` + Location header |
| `/api/v1/commands/status/{id}` | GET | Poll command status | 200 + `{ status, statusCode, timestamp, ... }` |
| `/api/v1/commands/replay/{id}` | POST | Replay failed command | 202 + `{ correlationId, isReplay, previousStatus }` |
| `/api/v1/queries` | POST | Query projection data | 200 + `{ correlationId, payload }` |

**Actual Backend Payload Types:**

```typescript
// Command submission
interface SubmitCommandRequest {
  tenant: string;
  domain: string;
  aggregateId: string;
  commandType: string;       // Fully qualified .NET type name
  payload: unknown;          // Domain-specific command data
  extensions?: Record<string, string>;
}

// Command response
interface SubmitCommandResponse {
  correlationId: string;     // GUID
}

// Command status
interface CommandStatusResponse {
  correlationId: string;
  status: 'Received' | 'Processing' | 'EventsStored'
        | 'EventsPublished' | 'Completed' | 'Rejected'
        | 'PublishFailed' | 'TimedOut';
  statusCode: number;
  timestamp: string;         // ISO 8601
  aggregateId?: string;
  eventCount?: number;       // Only on Completed
  rejectionEventType?: string;  // Only on Rejected
  failureReason?: string;    // Only on PublishFailed
  timeoutDuration?: string;  // Only on TimedOut, ISO 8601 duration
}

// Query submission
interface SubmitQueryRequest {
  tenant: string;
  domain: string;
  aggregateId: string;
  queryType: string;
  payload?: unknown;
}

// Query response
interface SubmitQueryResponse {
  correlationId: string;
  payload: unknown;          // Projection data
}
```

**Command Lifecycle in `useCommand` Hook:**

```
Module calls useCommand().send(cmd)
  │
  ├─ 1. Optimistic UI update (client-predictable fields)
  ├─ 2. POST /api/v1/commands → 202 { correlationId }
  ├─ 3. Start polling GET /status/{correlationId} every 1s
  │     ├─ Received → Processing → EventsStored → EventsPublished
  │     │   (UX: "confirming" micro-indicator)
  │     ├─ Completed → stop polling, invalidate projection query, success toast
  │     ├─ Rejected → stop polling, show rejection error
  │     ├─ PublishFailed → stop polling, show failure + offer replay
  │     └─ TimedOut → stop polling, show timeout + offer replay
  └─ 4. On Completed: queryClient.invalidateQueries(['projection', tenantId, domain, ...])
```

**Error Handling Standards:**

```typescript
// Typed error hierarchy in @hexalith/cqrs-client
abstract class HexalithError extends Error {
  abstract readonly code: string;
}

class ApiError extends HexalithError {
  code = 'API_ERROR';
  constructor(public statusCode: number, public body?: unknown) { ... }
}

class ValidationError extends HexalithError {
  code = 'VALIDATION_ERROR';
  constructor(public issues: ZodIssue[]) { ... }
}

class CommandRejectedError extends HexalithError {
  code = 'COMMAND_REJECTED';
  constructor(public rejectionEventType: string, public correlationId: string) { ... }
}

class CommandTimeoutError extends HexalithError {
  code = 'COMMAND_TIMEOUT';
  constructor(public duration: string, public correlationId: string) { ... }
}

class AuthError extends HexalithError {
  code = 'AUTH_ERROR'; // 401 — triggers silent refresh or redirect
}

class ForbiddenError extends HexalithError {
  code = 'FORBIDDEN'; // 403 — tenant not authorized
}

class RateLimitError extends HexalithError {
  code = 'RATE_LIMIT'; // 429 — show user-facing message
}
```

**Error Boundary Hierarchy:**

```
Shell ErrorBoundary (catches catastrophic shell failures)
  └─ Module ErrorBoundary (per module, catches module failures)
       └─ Component renders normally
            └─ useCommand/useProjection surface errors via hook return value
                 └─ Module handles expected errors inline (rejected commands, empty results)
```

Unexpected errors bubble to module error boundary → fallback UI with retry button. Shell continues running. Other modules unaffected.

### Frontend Architecture

**State Management Summary:**

| State Type | Solution | Scope |
|-----------|---------|-------|
| Shell infrastructure (auth, tenant, theme, locale) | React Context via `@hexalith/shell-api` providers | Global, shell-owned |
| Server/projection data | TanStack Query via `useProjection` in `@hexalith/cqrs-client` | Per-query, cached |
| Command lifecycle | `useCommand` hook state (pending, polling, completed, failed) | Per-command invocation |
| Module UI state (forms) | React Hook Form (internal to `@hexalith/ui` `<Form>`) | Per-form instance |
| Module UI state (tables) | TanStack Table state (sort, filter, page) via `@hexalith/ui` `<Table>` | Per-table instance |
| Ephemeral UI (modals, dropdowns) | Component-local `useState` | Per-component |

**Module Loading:**

```typescript
// Shell registers modules from manifests at build time
const modules = [
  { manifest: tenantsManifest, component: lazy(() => import('@hexalith/tenants')) },
  { manifest: ordersManifest,  component: lazy(() => import('@hexalith/orders'))  },
];

// react-router v7 routes generated from manifests
const routes = modules.flatMap(m =>
  m.manifest.routes.map(route => ({
    path: route.path,
    element: (
      <ModuleErrorBoundary name={m.manifest.displayName}>
        <Suspense fallback={<ModuleSkeleton />}>
          <m.component />
        </Suspense>
      </ModuleErrorBoundary>
    ),
  }))
);
```

**Bundle Optimization:**

| Strategy | Implementation | Impact |
|----------|---------------|--------|
| Per-module code splitting | `React.lazy()` + dynamic import per module | Only active module's code loaded |
| Foundation package tree-shaking | tsup produces ESM with preserved modules. Vite tree-shakes unused exports. | Modules pay only for hooks/components they use |
| Vendor chunk splitting | Vite `manualChunks` — React, react-router, TanStack Query, Radix primitives as separate cached chunks | Vendor code cached across deploys |
| Asset hashing | Vite content-hash filenames | Long-term browser caching with cache-busting on change |

### Infrastructure & Deployment

**CI/CD Pipeline (GitHub Actions):**

```
PR Pipeline (on pull_request):
  ├─ Checkout (with submodules: recursive)
  ├─ Install (pnpm install --frozen-lockfile)
  ├─ Build (turbo build — cached, parallel)
  ├─ Lint (turbo lint — ESLint + Stylelint + token compliance)
  ├─ Test (turbo test — Vitest + Playwright CT with @axe-core/playwright)
  ├─ Coverage gate (≥ 80% modules, ≥ 95% foundation)
  ├─ Scaffold smoke test (scaffold temp module → compile → run scaffolded test → green)
  ├─ Manifest validation (TypeScript compile — invalid manifests fail)
  └─ Design System Health gate (token parity, contrast matrix, a11y)

Main Pipeline (on push to main):
  ├─ All PR checks
  ├─ Build shell application (Vite production build)
  ├─ Docker image (shell app served by nginx/caddy)
  └─ Deploy to staging (Kubernetes)
```

**Git Submodule Handling in CI:** The checkout step uses `actions/checkout` with `submodules: recursive` to fetch all module submodules. Submodule commits are pinned in the shell repo — CI always builds against the pinned version, not the module repo's HEAD.

**Turborepo Remote Cache:** GitHub Actions cache or Vercel Remote Cache for cross-CI-run caching. Unchanged packages skip build entirely.

**Environment Configuration:**

| Config Type | Mechanism | Examples |
|------------|-----------|---------|
| Build-time constants | Vite `.env` files (`VITE_` prefix) | `VITE_API_VERSION=v1`, `VITE_APP_VERSION=1.0.0` |
| Deployment-time config | Runtime `/config.json` served alongside SPA | `{ "oidcAuthority": "https://keycloak.example.com/realms/hexalith", "commandApiBaseUrl": "https://api.example.com", "tenantClaimName": "eventstore:tenant" }` |

**Deployment Topology:**

```
                          ┌─────────────────────────┐
                          │   Kubernetes Cluster     │
                          │                          │
  Browser ──── HTTPS ────→│  nginx/caddy (static)    │──── Shell SPA (index.html + JS/CSS)
                          │       ↓ /config.json     │──── Runtime config (ConfigMap)
                          │                          │
                          │  Hexalith.EventStore     │──── /api/v1/commands
                          │  (.NET, DAPR)            │──── /api/v1/queries
                          │                          │
                          │  Keycloak / Entra ID     │──── OIDC provider
                          └─────────────────────────┘
```

The shell SPA is a static build served by a lightweight HTTP server. Runtime config injected via Kubernetes ConfigMap mounted as `/config.json`. Same container image deployed to dev (Keycloak), staging (Keycloak), production (Entra ID) — only the ConfigMap changes.

### Decision Impact Analysis

**Implementation Sequence:**

1. **Platform monorepo scaffold** (Turborepo + pnpm) → establishes project structure for packages/, apps/, tools/
2. **Design tokens + token compliance scanner** → foundation for all UI work
3. **@hexalith/shell-api** (AuthProvider, TenantProvider, ThemeProvider, LocaleProvider, manifest types) → shell contract
4. **@hexalith/cqrs-client** (ICommandBus, IQueryBus, useCommand, useProjection, ky instance, Zod validation, error types) → backend integration
5. **@hexalith/ui** (layout primitives → content components → feedback → overlay) → component library
6. **Shell application** (Vite + react-router v7 + OIDC + module registry + error boundaries + status bar) → running shell
7. **create-hexalith-module CLI** → developer tooling (scaffolds standalone module repos)
8. **Reference module (Tenants)** → standalone git repo, added as submodule in modules/ — validates complete stack including submodule workflow
9. **CI pipeline** (GitHub Actions + Turborepo cache + submodule checkout + quality gates) → enforcement

**Cross-Component Dependencies:**

```
@hexalith/shell-api ←─── @hexalith/ui (peer dep for useLocale)
                    ←─── @hexalith/cqrs-client (reads auth/tenant context for ky hooks)
                    ←─── Shell app (provides all context providers)
                    ←─── All modules (consume context via hooks)

@hexalith/cqrs-client ←── Shell app (configures ky instance with auth hooks)
                       ←── All modules (useCommand, useProjection)

@hexalith/ui ←──────────── Shell app (layout, sidebar, status bar)
             ←──────────── All modules (Table, Form, DetailView, etc.)

TanStack Query ←────────── @hexalith/cqrs-client (QueryClientProvider in shell)
oidc-client-ts ←────────── @hexalith/shell-api (AuthProvider wraps react-oidc-context)
ky ←────────────────────── @hexalith/cqrs-client (HTTP client, configured by shell)
Zod ←───────────────────── @hexalith/cqrs-client (projection validation)
                       ←── Module code (schema definitions)
```

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

27 areas where AI agents could make divergent choices, grouped into 5 categories. Every rule below includes a concrete example so agents have zero ambiguity.

### Naming Patterns

**File Naming:**

| File Type | Convention | Example |
|-----------|-----------|---------|
| React components | PascalCase.tsx | `OrderCard.tsx`, `ModuleErrorBoundary.tsx` |
| Hooks | camelCase.ts | `useCommand.ts`, `useProjection.ts` |
| Utilities / helpers | camelCase.ts | `createKyInstance.ts`, `formatCurrency.ts` |
| Types-only files | camelCase.ts | `types.ts`, `manifest.ts` |
| Zod schemas | camelCase.ts | `schemas.ts`, `orderSchemas.ts` |
| CSS Modules | PascalCase.module.css (matching component) | `OrderCard.module.css` |
| Vitest tests | Co-located, `.test.ts(x)` suffix | `useCommand.test.ts`, `OrderCard.test.tsx` |
| Playwright tests (CT + E2E) | `.spec.ts(x)` suffix | `OrderCard.spec.tsx`, `tenantFlow.spec.ts` |
| Contract tests | `__contracts__/` folder, `.contract.test.ts` | `commandBus.contract.test.ts` |
| Constants | camelCase.ts | `defaults.ts`, `errorCodes.ts` |
| Barrel exports | `index.ts` | Only at package root `src/index.ts` |
| Storybook stories | Co-located, `.stories.tsx` suffix | `OrderCard.stories.tsx` |

**Test Runner File Ownership:**

| Runner | Pattern | Scope |
|--------|---------|-------|
| Vitest | `**/*.test.ts(x)` | Unit and integration tests across all packages |
| Playwright | `**/*.spec.ts(x)` | Component tests (@hexalith/ui) and E2E (apps/shell/e2e/) |

Each runner's config (`vitest.config.ts`, `playwright.config.ts`) must include/exclude the opposite pattern explicitly. This prevents runner collision.

**Code Naming:**

| Element | Convention | Example | Anti-Pattern |
|---------|-----------|---------|-------------|
| React components | PascalCase | `OrderCard`, `TenantSwitcher` | `orderCard`, `order_card` |
| Hooks | camelCase with `use` prefix | `useCommand`, `useProjection` | `UseCommand`, `use_command` |
| Interfaces (contracts) | `I` prefix + PascalCase | `ICommandBus`, `IQueryBus` | `CommandBusInterface`, `CommandBus` (for interfaces) |
| Implementations | Descriptive prefix + PascalCase | `DaprCommandBus`, `MockCommandBus` | `CommandBusImpl`, `CommandBusDefault` |
| Types (data shapes) | PascalCase, no prefix | `OrderView`, `TenantInfo`, `ModuleManifest` | `IOrderView`, `TOrderView` |
| Zod schemas | PascalCase + `Schema` suffix | `OrderViewSchema` | `orderViewSchema`, `OrderViewZod` |
| Inferred types from Zod | `z.infer<typeof XSchema>` aliased to matching name | `type OrderView = z.infer<typeof OrderViewSchema>` | Manually duplicating the type |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_STALE_TIME`, `MAX_POLL_ATTEMPTS` | `defaultStaleTime` (for true constants) |
| Enum-like unions | PascalCase type, literal values as-is | `type CommandStatus = 'Received' \| 'Processing' \| ...` | TypeScript `enum` (use union types) |
| Event handler props | `on` + PascalCase verb | `onSubmit`, `onTenantChange` | `handleSubmit` as prop name |
| Internal handlers | `handle` + PascalCase verb | `handleSubmit`, `handleTenantChange` | `onSubmitHandler` |
| Boolean props/vars | `is`/`has`/`should` prefix | `isLoading`, `hasError`, `shouldRefetch` | `loading`, `error` (ambiguous) |
| CSS custom properties | `--hx-{category}-{name}` | `--hx-color-primary`, `--hx-space-md` | `--primary` (no namespace) |
| CSS class names (modules) | camelCase | `.orderCard`, `.statusBadge` | `.order-card`, `.OrderCard` |
| Storybook title | `@hexalith/{package}/{Category}/{ComponentName}` | `title: '@hexalith/ui/Data Display/Table'` | `Components/Table`, `UI/Table` |

**Storybook Sidebar Convention:**

Storybook titles follow: `@hexalith/{package}/{Category}/{ComponentName}`. Categories for @hexalith/ui:
- `Layout` — Shell, Sidebar, PageHeader, Stack, Grid
- `Data Display` — Table, DetailView, Badge, StatusIndicator
- `Forms` — Form, TextField, Select, Checkbox
- `Feedback` — Toast, Alert, Skeleton, ErrorDisplay
- `Overlay` — Dialog, Drawer, Popover, Tooltip
- `Navigation` — Breadcrumb, Tabs, Pagination

**Rationale:** I-prefix for interfaces aligns with the .NET backend conventions. Types (data shapes) get no prefix because they represent data, not contracts. `enum` is avoided in favor of union types — they're more TypeScript-idiomatic, tree-shake better, and match the string literal status values from the backend.

### Structure Patterns

**Component File Organization:**

Simple component (single concern):
```
OrderCard.tsx
OrderCard.module.css
OrderCard.test.tsx
```

Complex component (multiple sub-components or significant logic):
```
OrderCard/
├── index.ts              # Re-export: export { OrderCard } from './OrderCard'
├── OrderCard.tsx
├── OrderCard.module.css
├── OrderCard.test.tsx
├── OrderCard.spec.tsx     # Playwright component test (if applicable)
├── OrderCard.stories.tsx
├── OrderCardHeader.tsx    # Sub-component (not exported from package)
└── useOrderCardState.ts   # Local hook (not exported from package)
```

**Rule:** Use folder structure when a component has 3+ files. Never nest component folders more than one level.

**Barrel Export Clarification:**

The root `src/index.ts` is the ONLY barrel file. Sub-folders never get `index.ts` (exception: complex component folders for re-export only). The root barrel CAN be organized with category comments for readability:

```typescript
// src/index.ts — @hexalith/ui public API

// Layout
export { Shell } from './components/Shell/Shell';
export { Sidebar } from './components/Sidebar/Sidebar';
export { PageHeader } from './components/PageHeader';

// Data Display
export { Table } from './components/Table/Table';
export { DetailView } from './components/DetailView';

// Forms
export { Form } from './components/Form/Form';
export { TextField } from './components/TextField';

// ... etc
```

This is a structured flat list — NOT nested barrels. Each export points directly to the source file.

**Package Internal Organization:**

```
packages/cqrs-client/
├── src/
│   ├── index.ts           # Public API barrel — ONLY public exports
│   ├── types.ts           # Shared types for this package
│   ├── errors.ts          # Error class hierarchy
│   ├── hooks/
│   │   ├── useCommand.ts
│   │   ├── useCommand.test.ts
│   │   ├── useProjection.ts
│   │   └── useProjection.test.ts
│   ├── bus/
│   │   ├── ICommandBus.ts
│   │   ├── IQueryBus.ts
│   │   ├── DaprCommandBus.ts
│   │   ├── DaprQueryBus.ts
│   │   ├── MockCommandBus.ts
│   │   ├── MockQueryBus.ts
│   │   └── __contracts__/
│   │       ├── commandBus.contract.test.ts
│   │       └── queryBus.contract.test.ts
│   └── internal/          # Internal utilities, NOT exported
│       ├── createKyInstance.ts
│       └── pollCommandStatus.ts
├── tsconfig.json
├── tsup.config.ts
└── package.json
```

**Module Internal Organization (standalone git repo):**

```
hexalith-tenants/              # Independent git repository
├── src/
│   ├── index.ts           # Module entry point (default export: root component)
│   ├── manifest.ts        # ModuleManifest definition
│   ├── routes.tsx         # Module route definitions
│   ├── schemas/           # Zod schemas for projections
│   │   └── tenantSchemas.ts
│   ├── pages/             # Route-level components
│   │   ├── TenantListPage.tsx
│   │   └── TenantDetailPage.tsx
│   ├── components/        # Module-specific components
│   │   ├── TenantCard.tsx
│   │   └── TenantForm.tsx
│   └── hooks/             # Module-specific hooks (if any beyond useCommand/useProjection)
│       └── useTenantActions.ts
├── dev-host/              # Standalone dev server (MockShellProvider + mock auth/tenant)
│   ├── index.html
│   ├── main.tsx
│   └── vite.config.ts
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── package.json           # Versioned @hexalith/* peerDependencies
```

**`internal/` Membership Rule:**

A utility belongs in `internal/` when it is:
- Imported by 2+ files within the same package, AND
- Not part of the public API

If a utility is used by only one file, co-locate it in that file or next to it. `internal/` is for shared implementation details, not a dumping ground.

**Test Location:**
- Vitest tests (`.test.ts(x)`) are always co-located next to the source file they test
- Playwright component tests (`.spec.tsx`) co-locate with the component in @hexalith/ui
- Playwright E2E tests (`.spec.ts`) live in `apps/shell/e2e/`
- Storybook stories co-locate with components: `OrderCard.stories.tsx`
- Contract tests live in `__contracts__/` folders within the implementation directory
- No `__tests__/` directories

**Package Dependency Rules:**

| Package | May Import From | MUST NOT Import From |
|---------|----------------|---------------------|
| @hexalith/shell-api | React, oidc-client-ts, react-oidc-context | @hexalith/cqrs-client, @hexalith/ui |
| @hexalith/cqrs-client | React, @hexalith/shell-api (auth/tenant context), ky, zod, @tanstack/react-query | @hexalith/ui |
| @hexalith/ui | React, @hexalith/shell-api (peer dep: useLocale), @radix-ui/*, @tanstack/react-table, react-hook-form | @hexalith/cqrs-client |
| Module packages | @hexalith/shell-api, @hexalith/cqrs-client, @hexalith/ui, zod | @radix-ui/*, oidc-client-ts, ky, @tanstack/react-query directly |

**@hexalith/ui MUST NOT depend on @hexalith/cqrs-client.** If a UI component needs server data, the module provides it as props. UI components are data-agnostic.

**Third-Party Type Re-Export Policy:**

Foundation packages define their own return types. They do NOT re-export third-party types.

```typescript
// ✅ Correct — own return type
interface UseProjectionResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: HexalithError | null;
  refetch: () => void;
}

// ❌ Wrong — leaking TanStack Query types
import { UseQueryResult } from '@tanstack/react-query';
export function useProjection<T>(...): UseQueryResult<T, HexalithError> { ... }
```

**Rationale:** If TanStack Query is ever replaced, module code doesn't break. Foundation packages own their API surface.

**Contract Test Pattern:**

Contract tests validate that mock and real implementations of an interface behave identically. They are parameterized test suites:

```typescript
// bus/__contracts__/commandBus.contract.test.ts
import { describe, it, expect } from 'vitest';
import type { ICommandBus } from '../ICommandBus';

export function commandBusContractTests(
  name: string,
  createBus: () => ICommandBus,
) {
  describe(`ICommandBus contract: ${name}`, () => {
    it('returns correlationId on successful send', async () => {
      const bus = createBus();
      const result = await bus.send({ /* valid command */ });
      expect(result.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('simulates async delay (not instant)', async () => {
      const bus = createBus();
      const start = performance.now();
      await bus.send({ /* valid command */ });
      expect(performance.now() - start).toBeGreaterThan(0);
    });

    it('surfaces rejection as CommandRejectedError', async () => {
      const bus = createBus();
      await expect(bus.send({ /* invalid command */ }))
        .rejects.toBeInstanceOf(CommandRejectedError);
    });

    // ... lifecycle, timeout, error parity tests
  });
}

// In MockCommandBus.test.ts:
commandBusContractTests('MockCommandBus', () => new MockCommandBus());

// In DaprCommandBus.test.ts (integration test):
commandBusContractTests('DaprCommandBus', () => new DaprCommandBus(testConfig));
```

The same test suite runs against both implementations. If a mock passes but the real implementation fails (or vice versa), the divergence is caught immediately.

### Format Patterns

**API Data — JSON Field Naming:**

The backend (Hexalith.EventStore) uses camelCase in JSON responses. Frontend types match backend exactly. No transformation layer.

```typescript
// ✅ Correct — matches backend JSON
interface CommandStatusResponse {
  correlationId: string;
  statusCode: number;
  rejectionEventType?: string;
}

// ❌ Wrong — don't convert to different convention
interface CommandStatusResponse {
  correlation_id: string;
  status_code: number;
}
```

**Date/Time Handling:**

| Context | Format | Example |
|---------|--------|---------|
| API payloads | ISO 8601 string | `"2026-03-12T14:30:00Z"` |
| TypeScript types | `string` (not `Date`) for API data | `createdAt: string` |
| Display formatting | `Intl.DateTimeFormat` via shell locale | `useLocale()` → format function |
| Zod validation | `z.string().datetime()` | Validates ISO 8601 at runtime |

**Rule:** Never construct `Date` objects from API strings in component render paths. Use `Intl.DateTimeFormat` with the string directly via the shell's locale-aware formatter.

**Import Ordering (with type-only imports):**

```typescript
// 1. React
import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';

// 2. External libraries (alphabetical)
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { UseQueryOptions } from '@tanstack/react-query';

// 3. @hexalith packages (alphabetical)
import { useAuth, useTenant } from '@hexalith/shell-api';
import { useProjection } from '@hexalith/cqrs-client';
import { Table, Button } from '@hexalith/ui';
import type { TableColumn } from '@hexalith/ui';

// 4. Relative imports (parent first, then siblings, then children)
import { TenantCard } from '../components/TenantCard';
import { tenantSchemas } from './schemas/tenantSchemas';
import type { TenantView } from '../schemas/tenantSchemas';

// 5. CSS Modules (always last)
import styles from './TenantListPage.module.css';
```

**Rule:** Within each group, value imports come first, then `import type` statements. Enforced via `eslint-plugin-import` with `type` group configuration. No blank lines within groups, one blank line between groups.

### Communication Patterns

**Hook Return Value Shape:**

All custom hooks returning async data follow the TanStack Query convention:

```typescript
// ✅ Consistent hook return shape
const { data, isLoading, error } = useProjection(TenantSchema, { ... });
const { send, status, error } = useCommand();

// ❌ Don't invent alternative shapes
const [data, loading, error] = useProjection(...);  // No tuples
const result = useProjection(...);                    // No opaque objects
```

**React Context Provider Pattern:**

Every shell context follows one pattern:

```typescript
// 1. Context + Provider in same file
// 2. Named export for Provider
// 3. Named export for hook
// 4. Hook throws if used outside Provider

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // ... implementation
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

**Rule:** Context value type is always a named interface. The `null` check + throw pattern is mandatory for all shell contexts — it provides a clear error when a module is rendered outside the shell.

**No Direct Cross-Module Communication:**

Modules never import from or communicate with other modules. All shared state flows through shell contexts or CQRS projections. If module A's command affects module B's projection, TanStack Query's cache invalidation handles it automatically.

### Process Patterns

**Loading State Pattern:**

```typescript
function TenantListPage() {
  const { data, isLoading, error, refetch } = useProjection(TenantListSchema, { ... });

  if (isLoading) return <Skeleton variant="table" rows={5} />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
  return <Table data={data} ... />;
}
```

**Rules:**
- Always handle all three states (loading, error, data) — never assume data exists
- Use `<Skeleton>` components from `@hexalith/ui`, never spinners (CLS budget is 0)
- Skeleton variant must match the content shape it replaces

**Error Recovery Pattern:**

```typescript
const { send, status, error } = useCommand();

if (error instanceof CommandRejectedError) {
  // Expected business error — show inline message
  return <Alert variant="warning">{error.message}</Alert>;
}

// Unexpected errors bubble to ModuleErrorBoundary automatically
```

**Rule:** Modules handle business errors (rejected commands, validation) inline. Infrastructure errors (network, auth, 500s) bubble to error boundaries. Never `try/catch` around `useCommand`/`useProjection` — they surface errors via the return value.

**Form Validation Pattern:**

```typescript
// Zod schema is the single source of truth for validation
const CreateTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required').max(100),
  code: z.string().regex(/^[a-z0-9-]+$/, 'Only lowercase alphanumeric and hyphens'),
});

// React Hook Form with Zod resolver (inside @hexalith/ui <Form>)
// Module developer provides the schema; <Form> handles the wiring
```

**Rule:** Validation logic lives in Zod schemas only. Never duplicate validation in component code. The `<Form>` component from `@hexalith/ui` integrates React Hook Form + Zod resolver internally.

### Enforcement Guidelines

**All AI Agents MUST:**

1. Run `pnpm lint` before considering any code change complete — ESLint enforces import boundaries, import order, inline style ban, and naming conventions
2. Co-locate tests — every new `.ts(x)` file that contains logic gets a `.test.ts(x)` sibling
3. Use the typed error hierarchy — never throw raw `Error`, always use the appropriate `HexalithError` subclass
4. Export only through package `src/index.ts` — internal utilities go in `internal/` and are never exported
5. Match the hook return shape conventions — object destructuring, never tuples or opaque wrappers
6. Use `Skeleton` for loading states — never spinners, never blank screens, never conditional `null` returns for loading
7. Validate all API response data with Zod schemas — never trust `unknown` payloads without runtime validation
8. Use `.test.ts(x)` for Vitest, `.spec.ts(x)` for Playwright — never mix runners
9. Respect package dependency rules — @hexalith/ui must not import @hexalith/cqrs-client
10. Define own return types in foundation packages — never re-export third-party types

**Pattern Enforcement:**

| Mechanism | Catches | When |
|-----------|---------|------|
| ESLint `no-restricted-imports` | Direct Radix, oidc-client-ts, CSS-in-JS, cross-package violations | Dev-time + CI |
| ESLint `import/order` | Import ordering violations (including type-only separation) | Dev-time + CI |
| TypeScript strict mode | Type errors, missing null checks | Dev-time + CI |
| Token compliance scanner | Raw color/spacing values instead of tokens | CI |
| Stylelint | CSS convention violations | Dev-time + CI |
| Vitest coverage gate | Missing tests (< 80% modules, < 95% foundation) | CI |
| `@axe-core/playwright` in `.spec.tsx` | WCAG AA violations per component — each Playwright CT test includes `expect(await new AxeBuilder({ page }).analyze()).toHaveNoViolations()` | CI (Playwright CT + E2E) |
| Scaffold smoke test | Template drift — scaffolded module fails to compile or test | CI |
| `turbo build` | Invalid manifests, type errors across packages | CI |
| CSS Module type generation | `typescript-plugin-css-modules` in tsconfig | Dev-time |
| Contract test suites | Mock/real implementation divergence | CI |

### Pattern Examples

**Good Example — Complete Module Page:**

```typescript
import { useCallback } from 'react';

import { useProjection } from '@hexalith/cqrs-client';
import { useTenant } from '@hexalith/shell-api';
import { Table, Skeleton, ErrorDisplay, PageHeader } from '@hexalith/ui';
import type { TableColumn } from '@hexalith/ui';

import { TenantListSchema } from '../schemas/tenantSchemas';
import type { TenantView } from '../schemas/tenantSchemas';

import styles from './TenantListPage.module.css';

export function TenantListPage() {
  const { activeTenant } = useTenant();
  const { data, isLoading, error, refetch } = useProjection(TenantListSchema, {
    domain: 'Tenants',
    queryType: 'GetTenantList',
  });

  const handleRowClick = useCallback((tenant: TenantView) => {
    // navigate to detail
  }, []);

  if (isLoading) return <Skeleton variant="table" rows={8} />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  return (
    <div className={styles.page}>
      <PageHeader title="Tenants" />
      <Table data={data} onRowClick={handleRowClick} />
    </div>
  );
}
```

**Anti-Patterns:**

```typescript
// ❌ Spinner instead of skeleton
if (isLoading) return <div>Loading...</div>;

// ❌ Importing Radix directly in module code
import * as Dialog from '@radix-ui/react-dialog';

// ❌ Inline styles
<div style={{ padding: '16px' }}>

// ❌ Raw color value instead of token
.card { background: #f5f5f5; }

// ❌ Barrel exports in sub-folders
// components/index.ts — DON'T

// ❌ Tuple return from hook
const [data, loading] = useProjection(...);

// ❌ Throwing raw errors
throw new Error('Command failed');
// ✅ Instead:
throw new CommandRejectedError(rejectionType, correlationId);

// ❌ TypeScript enum
enum Status { Active, Inactive }
// ✅ Instead:
type Status = 'Active' | 'Inactive';

// ❌ Re-exporting third-party types from foundation package
export type { UseQueryResult } from '@tanstack/react-query';

// ❌ @hexalith/ui importing from @hexalith/cqrs-client
import { useProjection } from '@hexalith/cqrs-client'; // in a UI component

// ❌ Using .test.tsx for Playwright component test
// OrderCard.test.tsx with Playwright — runner collision!

// ❌ Untyped CSS modules (styles.foo is `any`)
// Missing typescript-plugin-css-modules configuration

// ❌ Duplicating validation outside Zod
if (!name || name.length > 100) { ... }
// ✅ Instead: let the Zod schema + <Form> handle it

// ❌ try/catch around hooks
try { const { data } = useProjection(...); } catch { ... }
// ✅ Instead: use the error return value
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
hexalith-frontshell/
│
├── .github/
│   └── workflows/
│       ├── ci-pr.yml                    # PR pipeline: build → lint → test → coverage → manifest validation
│       └── ci-main.yml                  # Main pipeline: all PR checks + Docker image + deploy staging
│
├── .vscode/
│   ├── settings.json                    # Workspace settings (ESLint, Stylelint, CSS Modules plugin)
│   └── extensions.json                  # Recommended extensions
│
├── apps/
│   └── shell/                           # Shell application (Vite + React + react-router v7)
│       ├── src/
│       │   ├── index.tsx                # App entry point (ReactDOM.createRoot)
│       │   ├── App.tsx                  # Root component: providers → router → layout
│       │   ├── App.test.tsx
│       │   ├── config/
│       │   │   ├── loadRuntimeConfig.ts # Fetches /config.json at startup (with diagnostic fallback page)
│       │   │   ├── loadRuntimeConfig.test.ts
│       │   │   └── types.ts            # RuntimeConfig type
│       │   ├── modules/
│       │   │   ├── registry.ts          # Module registry: manifest → lazy component mapping
│       │   │   ├── registry.test.ts
│       │   │   ├── routeBuilder.ts      # Generates react-router routes from manifests
│       │   │   └── routeBuilder.test.ts
│       │   ├── layout/
│       │   │   ├── ShellLayout.tsx       # Top bar + sidebar + main content area + status bar
│       │   │   ├── ShellLayout.module.css
│       │   │   ├── ShellLayout.test.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Sidebar.module.css
│       │   │   ├── Sidebar.test.tsx
│       │   │   ├── TopBar.tsx
│       │   │   ├── TopBar.module.css
│       │   │   ├── TopBar.test.tsx
│       │   │   ├── StatusBar.tsx
│       │   │   ├── StatusBar.module.css
│       │   │   └── StatusBar.test.tsx
│       │   ├── providers/
│       │   │   ├── ShellProviders.tsx    # Composes all providers — nesting order is critical:
│       │   │   │                         #   1. QueryClientProvider (outermost: hooks inside may query)
│       │   │   │                         #   2. AuthProvider (provides JWT for TenantProvider)
│       │   │   │                         #   3. TenantProvider (reads tenant claims from JWT)
│       │   │   │                         #   4. ThemeProvider (inside auth for user preferences)
│       │   │   │                         #   5. LocaleProvider (innermost: reads user locale from auth)
│       │   │   └── ShellProviders.test.tsx
│       │   ├── errors/
│       │   │   ├── ShellErrorBoundary.tsx
│       │   │   ├── ModuleErrorBoundary.tsx
│       │   │   ├── ModuleErrorBoundary.test.tsx
│       │   │   └── ModuleSkeleton.tsx
│       │   └── styles/
│       │       └── global.css           # CSS @layer order declaration + reset
│       ├── public/
│       │   └── config.json              # Runtime config (dev defaults; production: Kubernetes ConfigMap)
│       ├── e2e/
│       │   ├── playwright.config.ts
│       │   ├── auth.setup.spec.ts       # OIDC login for E2E (stored auth state)
│       │   ├── navigation.spec.ts       # Cross-module navigation E2E
│       │   ├── tenantSwitching.spec.ts
│       │   └── errorResilience.spec.ts
│       ├── index.html
│       ├── .env.example                 # VITE_APP_VERSION, VITE_API_VERSION (build-time only)
│       ├── vite.config.ts
│       ├── vitest.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── shell-api/                       # @hexalith/shell-api
│   │   ├── src/
│   │   │   ├── index.ts                 # Public API barrel
│   │   │   ├── types.ts                 # ModuleManifest, NavigationItem, ShellContextValue
│   │   │   ├── auth/
│   │   │   │   ├── AuthProvider.tsx      # Wraps react-oidc-context
│   │   │   │   ├── AuthProvider.test.tsx
│   │   │   │   └── useAuth.ts
│   │   │   ├── tenant/
│   │   │   │   ├── TenantProvider.tsx
│   │   │   │   ├── TenantProvider.test.tsx
│   │   │   │   └── useTenant.ts
│   │   │   ├── theme/
│   │   │   │   ├── ThemeProvider.tsx
│   │   │   │   ├── ThemeProvider.test.tsx
│   │   │   │   └── useTheme.ts
│   │   │   ├── locale/
│   │   │   │   ├── LocaleProvider.tsx
│   │   │   │   ├── LocaleProvider.test.tsx
│   │   │   │   └── useLocale.ts
│   │   │   ├── manifest/
│   │   │   │   ├── manifestTypes.ts     # ModuleManifest discriminated union (manifestVersion field)
│   │   │   │   └── validateManifest.ts
│   │   │   └── testing/                 # Test utilities — exported from public API
│   │   │       ├── MockShellProvider.tsx # Wraps all mock contexts (one import for tests + Storybook)
│   │   │       ├── MockShellProvider.test.tsx
│   │   │       ├── createMockAuthContext.ts   # Configurable: authenticated/unauthenticated/expired
│   │   │       └── createMockTenantContext.ts # Configurable: single/multi-tenant, active tenant
│   │   ├── tsup.config.ts              # entry: ['src/index.ts'] — no internal/ exposure
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── package.json                # react, react-dom as peerDependencies
│   │
│   ├── cqrs-client/                     # @hexalith/cqrs-client
│   │   ├── src/
│   │   │   ├── index.ts                 # Public API barrel (includes MockCommandBus, MockQueryBus)
│   │   │   ├── types.ts                 # Command/query request/response types
│   │   │   ├── errors.ts               # HexalithError hierarchy
│   │   │   ├── hooks/
│   │   │   │   ├── useCommand.ts
│   │   │   │   ├── useCommand.test.ts
│   │   │   │   ├── useProjection.ts
│   │   │   │   └── useProjection.test.ts
│   │   │   ├── bus/
│   │   │   │   ├── ICommandBus.ts
│   │   │   │   ├── IQueryBus.ts
│   │   │   │   ├── DaprCommandBus.ts
│   │   │   │   ├── DaprCommandBus.test.ts
│   │   │   │   ├── DaprQueryBus.ts
│   │   │   │   ├── DaprQueryBus.test.ts
│   │   │   │   ├── MockCommandBus.ts    # Public API (FR14) — exported from index.ts
│   │   │   │   ├── MockCommandBus.test.ts
│   │   │   │   ├── MockQueryBus.ts      # Public API (FR15) — exported from index.ts
│   │   │   │   ├── MockQueryBus.test.ts
│   │   │   │   └── __contracts__/
│   │   │   │       ├── commandBus.contract.test.ts
│   │   │   │       └── queryBus.contract.test.ts
│   │   │   └── internal/               # NOT exported via tsup entry
│   │   │       ├── createKyInstance.ts
│   │   │       ├── createKyInstance.test.ts
│   │   │       ├── pollCommandStatus.ts
│   │   │       └── pollCommandStatus.test.ts
│   │   ├── tsup.config.ts              # entry: ['src/index.ts'] — internal/ excluded
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── package.json                # react, react-dom as peerDependencies
│   │
│   ├── ui/                              # @hexalith/ui
│   │   ├── .storybook/                  # Storybook config (co-located with components)
│   │   │   ├── main.ts
│   │   │   ├── preview.tsx              # Imports MockShellProvider from @hexalith/shell-api
│   │   │   └── manager.ts
│   │   ├── src/
│   │   │   ├── index.ts                 # Public API barrel (organized by category)
│   │   │   ├── tokens/
│   │   │   │   ├── tokens.css           # Design token custom properties (--hx-*)
│   │   │   │   ├── layers.css           # @layer reset, tokens, primitives, components, density, module
│   │   │   │   └── breakpoints.ts       # Breakpoint constants for JS usage
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Stack.tsx
│   │   │   │   │   ├── Stack.module.css
│   │   │   │   │   ├── Stack.test.tsx
│   │   │   │   │   ├── Stack.stories.tsx
│   │   │   │   │   ├── Grid.tsx
│   │   │   │   │   ├── PageHeader.tsx
│   │   │   │   │   ├── PageHeader.module.css
│   │   │   │   │   ├── PageHeader.test.tsx
│   │   │   │   │   └── PageHeader.stories.tsx
│   │   │   │   ├── data-display/
│   │   │   │   │   ├── Table/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── Table.tsx
│   │   │   │   │   │   ├── Table.module.css
│   │   │   │   │   │   ├── Table.test.tsx
│   │   │   │   │   │   ├── Table.spec.tsx    # Playwright CT
│   │   │   │   │   │   ├── Table.stories.tsx
│   │   │   │   │   │   ├── TableHeader.tsx
│   │   │   │   │   │   ├── TableRow.tsx
│   │   │   │   │   │   └── useTableState.ts
│   │   │   │   │   ├── DetailView.tsx
│   │   │   │   │   ├── DetailView.module.css
│   │   │   │   │   ├── DetailView.stories.tsx
│   │   │   │   │   ├── Badge.tsx
│   │   │   │   │   └── StatusIndicator.tsx
│   │   │   │   ├── forms/
│   │   │   │   │   ├── Form/
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── Form.tsx         # Wraps React Hook Form + Zod resolver
│   │   │   │   │   │   ├── Form.module.css
│   │   │   │   │   │   ├── Form.test.tsx
│   │   │   │   │   │   ├── Form.spec.tsx     # Playwright CT
│   │   │   │   │   │   ├── Form.stories.tsx
│   │   │   │   │   │   └── useFormContext.ts
│   │   │   │   │   ├── TextField.tsx
│   │   │   │   │   ├── TextField.stories.tsx
│   │   │   │   │   ├── Select.tsx
│   │   │   │   │   ├── Select.stories.tsx
│   │   │   │   │   ├── Checkbox.tsx
│   │   │   │   │   └── Checkbox.stories.tsx
│   │   │   │   ├── feedback/
│   │   │   │   │   ├── Toast.tsx
│   │   │   │   │   ├── Alert.tsx
│   │   │   │   │   ├── Alert.stories.tsx
│   │   │   │   │   ├── Skeleton.tsx
│   │   │   │   │   ├── Skeleton.module.css
│   │   │   │   │   ├── Skeleton.stories.tsx
│   │   │   │   │   ├── ErrorDisplay.tsx
│   │   │   │   │   └── ErrorDisplay.stories.tsx
│   │   │   │   ├── overlay/
│   │   │   │   │   ├── Dialog.tsx
│   │   │   │   │   ├── Dialog.stories.tsx
│   │   │   │   │   ├── Drawer.tsx
│   │   │   │   │   ├── Popover.tsx
│   │   │   │   │   └── Tooltip.tsx
│   │   │   │   └── navigation/
│   │   │   │       ├── Breadcrumb.tsx
│   │   │   │       ├── Tabs.tsx
│   │   │   │       └── Pagination.tsx
│   │   │   └── utils/
│   │   │       ├── tokenCompliance.ts   # Token compliance scanner (CI tool)
│   │   │       └── contrastMatrix.ts    # Contrast ratio validation
│   │   ├── playwright.config.ts         # Playwright CT config for @hexalith/ui
│   │   ├── tsup.config.ts              # entry: ['src/index.ts'] — utils/ not in entry
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── package.json                # react, react-dom as peerDependencies
│   │
│   ├── tsconfig/                        # Shared TypeScript configurations
│   │   ├── base.json                    # Strict mode, common compiler options
│   │   ├── react-library.json           # For foundation packages (extends base)
│   │   ├── react-app.json              # For shell app (extends base)
│   │   └── package.json
│   │
│   └── eslint-config/                   # Shared ESLint configurations
│       ├── base.js                      # Common rules (import order, type-only imports)
│       ├── react.js                     # React-specific rules (hooks, JSX)
│       ├── module-boundaries.js         # Blocks @hexalith/*/src/**, cross-module imports (all files incl. tests)
│       └── package.json
│
├── tools/
│   └── create-hexalith-module/          # CLI scaffold tool
│       ├── src/
│       │   ├── index.ts                 # CLI entry point (prompts for module name/domain)
│       │   ├── scaffold.ts              # File generation: copies + transforms template files
│       │   ├── scaffold.test.ts
│       │   ├── versionCheck.ts          # Validates @hexalith/* version compatibility at scaffold time
│       │   └── versionCheck.test.ts
│       ├── templates/
│       │   └── module/                 # Standalone module template (all modules are independent repos)
│       │       ├── src/
│       │       │   ├── index.ts
│       │       │   ├── manifest.ts
│       │       │   ├── routes.tsx
│       │       │   ├── schemas/
│       │       │   │   └── exampleSchemas.ts
│       │       │   ├── pages/
│       │       │   │   ├── ExampleListPage.tsx
│       │       │   │   └── ExampleListPage.test.tsx
│       │       │   └── components/
│       │       │       └── ExampleCard.tsx
│       │       ├── dev-host/           # Standalone dev server with MockShellProvider
│       │       │   ├── index.html
│       │       │   ├── main.tsx
│       │       │   └── vite.config.ts
│       │       ├── tsconfig.json
│       │       ├── vitest.config.ts
│       │       └── package.json        # Versioned @hexalith/* peerDependencies
│       ├── tsconfig.json
│       └── package.json
│
├── modules/                             # Git submodules — each module is its own repo
│   └── tenants/                         # Git submodule: github.com/Hexalith/Hexalith.Tenants
│       ├── src/
│       │   ├── index.ts                 # Module entry point (default export: root component)
│       │   ├── manifest.ts
│       │   ├── routes.tsx
│       │   ├── schemas/
│       │   │   └── tenantSchemas.ts
│       │   ├── pages/
│       │   │   ├── TenantListPage.tsx
│       │   │   ├── TenantListPage.module.css
│       │   │   ├── TenantListPage.test.tsx
│       │   │   ├── TenantDetailPage.tsx
│       │   │   ├── TenantDetailPage.module.css
│       │   │   └── TenantDetailPage.test.tsx
│       │   └── components/
│       │       ├── TenantCard.tsx
│       │       ├── TenantCard.test.tsx
│       │       ├── TenantForm.tsx
│       │       └── TenantForm.test.tsx
│       ├── dev-host/                    # Standalone dev server with MockShellProvider
│       │   ├── index.html
│       │   ├── main.tsx
│       │   └── vite.config.ts
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── package.json                # Versioned @hexalith/* peerDependencies
│
├── vitest.workspace.ts                  # Points to all package vitest configs; coverage aggregation
├── turbo.json                           # Pipeline groups: packages/*, modules/*, tools/*, apps/*
├── .gitmodules                          # Git submodule references for modules/*
├── pnpm-workspace.yaml                  # packages/*, apps/*, modules/*, tools/*
├── package.json                         # Root scripts and devDependencies
├── .npmrc                               # strict-peer-dependencies=true, ignore-scripts=true
├── .env.example                         # Build-time environment variable template
├── .gitignore
├── .stylelintrc.json                    # Workspace-level Stylelint config
└── Dockerfile                           # Production build: nginx serving shell SPA
```

### Key Structural Decisions

**Storybook co-located with @hexalith/ui:**

Storybook config (`.storybook/`) lives inside `packages/ui/` because stories are co-located with components. Provider compatibility is enforced by the same package's build. `preview.tsx` imports `MockShellProvider` from `@hexalith/shell-api` — not hand-rolled mocks.

**Scaffold templates are real TypeScript files, not EJS:**

Template files in `tools/create-hexalith-module/templates/module/` are actual `.ts`/`.tsx` files compiled by the monorepo's TypeScript. The scaffold tool copies them into a new standalone git repo and does string replacement (module name, domain name). Template code is type-checked against current `@hexalith/*` types — if shell-api changes a type, the template build fails in CI.

**All modules are standalone git repositories:**

Every module is scaffolded as an independent git repo with versioned `@hexalith/*` peerDependencies and a bundled `dev-host/` for standalone development. When consumed by the shell, the module repo is added as a git submodule in the `modules/` directory. pnpm workspaces resolve peerDependencies to the local workspace version automatically — one `package.json` works in both contexts.

This aligns with the PRD's explicit distribution model decision: each module team owns their repo, the shell team owns composition. The git submodule boundary provides structural isolation that reinforces the ESLint/tsup enforcement layer.

The `dev-host/` is a minimal Vite app with `MockShellProvider` so module developers can run their module without cloning the shell repo (FR6).

**Submodule operational realities:**

- **MockShellProvider breaking changes cascade independently.** When shell-api publishes a breaking change to `MockShellProvider`, every module's `dev-host/` breaks independently (each has its own `@hexalith/shell-api` peerDependency version). Shell team must communicate breaking changes clearly. Modules upgrade `@hexalith/shell-api` version deliberately.
- **dev-host standalone path is a Phase 1.5 validation gate.** During MVP, Jerome works inside the workspace — pnpm resolves peerDependencies locally. The standalone `dev-host/` (cloning module repo alone, installing published `@hexalith/*` from registry) is untested until an external team onboards. Do not block MVP on standalone dev-host validation.
- **Module `vitest.config.ts` must resolve `@hexalith/*` imports.** Inside the workspace: pnpm symlinks handle this automatically. Outside (standalone): `@hexalith/*` packages must be installed from the registry. The scaffold template's `vitest.config.ts` must work in both contexts without modification — peerDependency resolution handles this natively.

**`modules/` directory contains git submodules exclusively:**

Each entry in `modules/` is a git submodule pointing to an independent module repo. No shared utilities, no helper packages, no cross-module dependencies. Shared code goes in `packages/` and requires shell team review. CI enforces: no `modules/*/package.json` may list another `modules/*` package as a dependency. The `.gitmodules` file at the repo root tracks all module submodule references.

**Test fixtures are public API:**

`MockCommandBus` and `MockQueryBus` are exported from `@hexalith/cqrs-client` — they are platform capabilities (FR14, FR15), not test internals. `MockShellProvider` and mock context factories are exported from `@hexalith/shell-api` — used by all module tests and Storybook stories. One source of truth.

### Architectural Boundaries

**Package API Boundaries:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Module Boundary                               │
│                                                                      │
│  modules/tenants/  ─── imports ──→  @hexalith/shell-api (contexts)  │
│                    ─── imports ──→  @hexalith/cqrs-client (hooks)    │
│                    ─── imports ──→  @hexalith/ui (components)        │
│                    ─── imports ──→  zod (schema definitions)         │
│                                                                      │
│                    ✗ CANNOT import @radix-ui/*                       │
│                    ✗ CANNOT import oidc-client-ts                    │
│                    ✗ CANNOT import ky                                │
│                    ✗ CANNOT import @tanstack/react-query             │
│                    ✗ CANNOT import other modules/*                   │
│                    ✗ CANNOT import @hexalith/*/src/** (deep imports) │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                Foundation Package Boundaries                      │
│                                                                   │
│  @hexalith/shell-api  ─── owns ──→  auth, tenant, theme, locale │
│                        ✗ CANNOT import @hexalith/cqrs-client     │
│                        ✗ CANNOT import @hexalith/ui              │
│                                                                   │
│  @hexalith/cqrs-client ── imports ──→  @hexalith/shell-api      │
│                         ✗ CANNOT import @hexalith/ui             │
│                                                                   │
│  @hexalith/ui ── peer dep ──→  @hexalith/shell-api (useLocale)  │
│                ✗ CANNOT import @hexalith/cqrs-client             │
└──────────────────────────────────────────────────────────────────┘
```

**Deep Import Protection (two-layer enforcement):**

| Layer | Mechanism | What It Blocks |
|-------|-----------|---------------|
| Build-time (tsup) | `entry: ['src/index.ts']` — only public barrel is bundled | `dist/` never contains `internal/` exports |
| Dev-time (ESLint) | `no-restricted-imports: @hexalith/*/src/**` | Workspace symlinks can't bypass barrel |
| Dev-time (ESLint) | Cross-module import block (all files including tests) | No cross-module imports even in devDependencies |

**Dependency Type Rules:**

| Dependency | Must Be | Reason |
|-----------|---------|--------|
| `react`, `react-dom` | `peerDependencies` in ALL packages and modules | Prevents duplicate React instances at runtime |
| `@hexalith/shell-api` | `peerDependencies` in @hexalith/ui; `dependencies` in @hexalith/cqrs-client | UI needs shell locale; cqrs-client needs shell auth/tenant |
| `@hexalith/*` (in modules) | `peerDependencies` (always versioned, e.g., `^0.1.0`) | Modules are always standalone repos. pnpm workspace resolves peerDependencies to local versions automatically when consumed as submodules. Same `package.json` works in both standalone and workspace contexts. |

**Shell Application Boundary:**

The shell app (`apps/shell/`) is the ONLY package that:
- Configures and provides all React context providers (auth, tenant, theme, locale, QueryClient)
- Creates the ky HTTP client instance with auth/tenant interceptors
- Registers modules from manifests and generates routes
- Owns the page chrome (sidebar, top bar, status bar)
- Composes all packages into a single deployable artifact

**Runtime Config Resilience:**

`loadRuntimeConfig.ts` handles missing `/config.json` with a diagnostic fallback page showing expected config location, required fields, and deployment hints. Never a white screen.

### Turborepo Pipeline Groups

```jsonc
// turbo.json — Turborepo v2 uses "tasks" (not "pipeline")
{
  "tasks": {
    // Foundation packages: ≥ 95% coverage, built first
    "packages#build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "packages#test":  { "dependsOn": ["build"] },
    "packages#lint":  { "dependsOn": [] },

    // Modules (git submodules): ≥ 80% coverage, built after packages
    "modules#build":  { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "modules#test":   { "dependsOn": ["build"] },
    "modules#lint":   { "dependsOn": [] },

    // Tools: in CI pipeline, built after packages (uses their types)
    "tools#build":    { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "tools#test":     { "dependsOn": ["build"] },

    // Apps: built last, depends on everything
    "apps#build":     { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "apps#test":      { "dependsOn": ["build"] }
  }
}
```

### Requirements to Structure Mapping

**FR Category → Package/Directory Mapping:**

| FR Category | Primary Package | Key Files |
|------------|----------------|-----------|
| **Module Development** (FR1-FR8) | `tools/create-hexalith-module/` | `scaffold.ts`, `templates/module/` |
| **CQRS Integration** (FR9-FR17) | `packages/cqrs-client/` | `useCommand.ts`, `useProjection.ts`, `ICommandBus.ts`, `IQueryBus.ts`, `MockCommandBus.ts`, `MockQueryBus.ts` |
| **Shell Composition** (FR18-FR29) | `apps/shell/` | `registry.ts`, `routeBuilder.ts`, `ShellLayout.tsx`, `ModuleErrorBoundary.tsx` |
| **Auth & Multi-Tenancy** (FR30-FR38) | `packages/shell-api/` | `AuthProvider.tsx`, `TenantProvider.tsx`, `useAuth.ts`, `useTenant.ts` |
| **Component Library** (FR39-FR41) | `packages/ui/` | `components/**/*.tsx`, `.storybook/` |
| **AI Module Generation** (FR42-FR46) | `tools/create-hexalith-module/` + docs | `templates/`, knowledge bundle |
| **Build & Deployment** (FR47-FR51) | `.github/workflows/`, root config | `ci-pr.yml`, `ci-main.yml`, `turbo.json`, `Dockerfile` |
| **Testing Strategy** (FR52-FR57) | `packages/*/`, `modules/*/`, `.github/workflows/` | Contract tests, test fixtures, CI quality gates |
| **Developer Documentation** (FR58-FR59) | `packages/ui/.storybook/` + docs | Storybook stories, Getting Started guide |
| **Migration** (FR60) | docs, `tools/` | Migration tooling and documentation |
| **Independent Module Dev** (FR6) | `tools/create-hexalith-module/templates/module/` | `dev-host/`, standalone `package.json` with versioned peerDependencies |

**Cross-Cutting Concerns → File Mapping:**

| Concern | Files Involved |
|---------|---------------|
| **Multi-tenancy** | `shell-api/src/tenant/TenantProvider.tsx`, `cqrs-client/src/internal/createKyInstance.ts`, `shell/src/layout/StatusBar.tsx` |
| **Authentication** | `shell-api/src/auth/AuthProvider.tsx`, `cqrs-client/src/internal/createKyInstance.ts`, `shell/src/providers/ShellProviders.tsx` |
| **Error isolation** | `shell/src/errors/ModuleErrorBoundary.tsx`, `cqrs-client/src/errors.ts`, `ui/src/components/feedback/ErrorDisplay.tsx` |
| **Design system enforcement** | `ui/src/tokens/`, `eslint-config/module-boundaries.js`, `ui/src/utils/tokenCompliance.ts`, `.stylelintrc.json` |
| **Deep import protection** | `eslint-config/module-boundaries.js`, all `tsup.config.ts` (entry-point-only exports) |
| **Cross-module isolation** | `eslint-config/module-boundaries.js` (blocks ALL cross-module imports including test files) |
| **Build scalability** | `turbo.json` (pipeline groups + caching), `.github/workflows/ci-pr.yml` |
| **Mock fidelity** | `cqrs-client/src/bus/Mock*.ts`, `cqrs-client/src/bus/__contracts__/*.contract.test.ts` |
| **Test fixture consistency** | `shell-api/src/testing/MockShellProvider.tsx` (single source for Storybook + module tests) |
| **Scaffold validity** | `tools/create-hexalith-module/templates/module/` (real TS files type-checked by monorepo CI) |
| **Submodule management** | `.gitmodules`, `.github/workflows/ci-pr.yml` (checkout with submodules: recursive) |
| **Coverage aggregation** | `vitest.workspace.ts` (root-level config for cross-package coverage reporting) |

### Integration Points

**Internal Communication:**

```
Shell App
  │
  ├── ShellProviders (nesting order: QCP → Auth → Tenant → Theme → Locale)
  │     ├── QueryClientProvider          (@tanstack/react-query)
  │     ├── AuthProvider                 (@hexalith/shell-api)
  │     ├── TenantProvider               (@hexalith/shell-api)
  │     ├── ThemeProvider                (@hexalith/shell-api)
  │     └── LocaleProvider               (@hexalith/shell-api)
  │
  ├── ShellLayout
  │     ├── TopBar ← useAuth(), useTenant()
  │     ├── Sidebar ← module manifests (navigation items)
  │     ├── <Outlet /> ← react-router renders module here
  │     │     └── ModuleErrorBoundary
  │     │           └── Suspense + React.lazy()
  │     │                 └── Module component
  │     │                       ├── useProjection() → TanStack Query → ky → REST API
  │     │                       ├── useCommand() → ky → REST API → poll status
  │     │                       └── @hexalith/ui components
  │     └── StatusBar ← connection health, active tenant
  │
  └── ky instance (created in shell, configured with auth + tenant interceptors)
        └── Shared by DaprCommandBus + DaprQueryBus
```

**External Integrations:**

| External System | Integration Point | Protocol |
|----------------|-------------------|----------|
| Hexalith.EventStore CommandApi | `DaprCommandBus` → `POST /api/v1/commands` | REST (HTTPS) |
| Hexalith.EventStore StatusApi | `pollCommandStatus` → `GET /api/v1/commands/status/{id}` | REST (HTTPS) |
| Hexalith.EventStore QueryApi | `DaprQueryBus` → `POST /api/v1/queries` | REST (HTTPS) |
| OIDC Provider (Keycloak / Entra ID) | `AuthProvider` → oidc-client-ts | OIDC/OAuth2 |
| Runtime Configuration | `loadRuntimeConfig` → `GET /config.json` (with diagnostic fallback) | Static file |

**Data Flow (Command Lifecycle):**

```
Module UI → useCommand().send(cmd)
  → DaprCommandBus.send()
    → ky.post('/api/v1/commands', { json: { tenant, domain, commandType, payload } })
      → 202 { correlationId }
  → pollCommandStatus(correlationId)
    → ky.get(`/api/v1/commands/status/${correlationId}`)
      → { status: 'Completed', ... }
  → queryClient.invalidateQueries(['projection', tenantId, domain, ...])
  → useProjection() automatically refetches affected data
  → UI updates with fresh projection
```

### Development Workflow Integration

**Development Server Structure:**

```bash
pnpm dev
  # Turborepo runs in parallel:
  ├── apps/shell      → Vite dev server (port 5173) with HMR
  ├── packages/ui     → Storybook dev server (port 6006)
  └── packages/*      → tsup --watch (rebuilds on change, Vite picks up via symlinks)
```

**Build Process Structure:**

```bash
pnpm build
  # Turborepo builds in dependency order with caching:
  1. packages/tsconfig      → (no build, just config)
  2. packages/eslint-config → (no build, just config)
  3. packages/shell-api     → tsup → dist/ (ESM + .d.ts)
  4. packages/cqrs-client   → tsup → dist/ (ESM + .d.ts)  [depends on shell-api]
  5. packages/ui            → tsup → dist/ (ESM + .d.ts)  [depends on shell-api]
  6. tools/create-hexalith-module → tsc → dist/            [depends on shell-api types]
  7. modules/tenants        → tsup → dist/ (ESM + .d.ts)  [depends on shell-api, cqrs-client, ui]
  8. apps/shell             → Vite build → dist/ (static HTML/CSS/JS)
```

**Deployment Structure:**

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
# Submodules must be initialized before Docker build (CI checkout handles this)
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm build --filter=shell

FROM nginx:alpine
COPY --from=builder /app/apps/shell/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# /config.json mounted via Kubernetes ConfigMap at runtime
```

**Shell Crash Recovery:**

If a shell-level error occurs (outside module error boundaries), the shell error boundary renders a diagnostic page with a reload button. Auth tokens in session storage survive the reload — the user is re-authenticated silently via oidc-client-ts without re-entering credentials. Navigation state is lost on crash recovery (acceptable for MVP; Phase 2 can persist last-route in sessionStorage).

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

All technology choices work together without conflicts. Turborepo v2 + pnpm workspaces + Vite + tsup + React 19 + TypeScript strict is a well-tested, compatible stack. TanStack Query + Zod + ky + oidc-client-ts are lightweight, composable libraries with no version conflicts. Radix primitives are properly encapsulated inside @hexalith/ui — no leakage to module code. The hybrid distribution model (platform monorepo + module submodules) leverages pnpm's native peerDependency resolution across workspace boundaries.

**Pattern Consistency:**

27 conflict points are documented with concrete examples and anti-patterns. Naming conventions are internally consistent across all categories (file naming, code naming, CSS naming, Storybook titles). The I-prefix for interfaces aligns with the .NET backend conventions. Import ordering, test runner separation (`.test.` for Vitest, `.spec.` for Playwright), and barrel export rules are clear and machine-enforceable.

**Structure Alignment:**

The three-layer boundary enforcement (tsup entry points + ESLint import restrictions + CI pipeline gates) supports all architectural decisions. The package dependency DAG is acyclic. The `modules/` directory as git submodules aligns with both the PRD's distribution model and the architecture's monorepo tooling benefits.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage (60 MVP FRs):**

| Category | FRs | Covered | Notes |
|----------|-----|---------|-------|
| Module Development | FR1-FR7 | 7/7 | FR8 correctly deferred to Phase 2 |
| CQRS Integration | FR9-FR17 | 7/9 | FR11 (real-time push) addressed via polling; FR12 (connection state) deferred with SignalR to Phase 2 |
| Shell Composition | FR18-FR29 | 11/12 | FR27 (real-time indicator) deferred with SignalR to Phase 2 |
| Auth & Multi-Tenancy | FR30-FR38 | 9/9 | Improved: provider-agnostic OIDC (oidc-client-ts) replaces Keycloak-specific approach |
| Component Library | FR39-FR41 | 3/3 | Exceeds PRD scope with additional components |
| AI Module Generation | FR42-FR46 | 5/5 | Platform knowledge bundle + same CI quality gates |
| Build & Deployment | FR47-FR51 | 5/5 | FR47 addressed via git submodule integration |
| Testing Strategy | FR52-FR57 | 6/6 | Contract tests, test fixtures, CI quality gates (coverage addressed by existing architecture patterns) |
| Developer Documentation | FR58-FR59 | 2/2 | Getting Started guide + Storybook as living catalog |
| Migration | FR60 | 1/1 | Migration tooling and documentation |
| **Total MVP** | | **56/60** | 3 deferred with SignalR (Phase 2), 1 deferred (FR8, Phase 2) |

**Non-Functional Requirements Coverage:**

| Category | Status | Details |
|----------|--------|---------|
| Performance | ✅ Covered | Build target ≤ 60s/20 modules (stricter than PRD's ≤ 90s/10). Code splitting, Turborepo caching, vendor chunking. |
| Security | ✅ Covered | Provider-agnostic OIDC, shell-managed tokens, tenant isolation, CSP headers, import boundary enforcement. |
| Scalability | ✅ Covered | Architecture targets 20 modules. Turborepo caching + code splitting + tree-shaking. |
| Accessibility | ✅ Covered | Radix primitives for WCAG AA, `@axe-core/playwright` in component tests, CI enforcement. |
| Reliability | ✅ Covered | Per-module error boundaries, shell crash recovery with silent re-auth, typed error hierarchy. |
| DX | ✅ Covered | ≤ 15 exports per package target, descriptive error messages, strict semver, scaffold smoke test. |

### Implementation Readiness Validation ✅

**Decision Completeness:**

All 10 critical + important decisions are documented with specific library choices and rationale. 4 decisions are explicitly deferred with target phases. Every decision includes code examples showing correct and incorrect usage.

**Structure Completeness:**

Complete directory structure with every file listed and annotated. Package boundaries drawn with ASCII diagrams. Dependency DAG fully specified with "MAY import" and "MUST NOT import" tables.

**Pattern Completeness:**

27 conflict points addressed across 5 categories (naming, structure, format, communication, process). Each pattern includes: convention table, code examples, anti-pattern examples, and enforcement mechanism. Contract test pattern for mock/real parity is specified with runnable code.

### Gap Analysis Results

**No Critical Gaps.** All blocking issues were resolved during the Advanced Elicitation (module distribution model) and Party Mode (testing strategy, CI pipeline) sessions.

**Resolved During Validation:**

| Gap | Resolution | Session |
|-----|-----------|---------|
| Module distribution model diverged from PRD | Hybrid: platform monorepo + module git submodules | Advanced Elicitation |
| OIDC library diverged from PRD (keycloak-js) | Documented as intentional improvement (provider-agnostic) | Advanced Elicitation |
| SignalR deferral impact on FR11/FR12/FR27 | Documented: polling covers FR11; FR12/FR27 deferred to Phase 2 | Advanced Elicitation |
| axe-core integration approach unspecified | `@axe-core/playwright` inside `.spec.tsx` component tests | Party Mode |
| Scaffold smoke test missing from CI | Added as CI pipeline step | Party Mode |
| Turborepo v2 syntax (tasks vs pipeline) | Updated turbo.json example | Party Mode |
| MockShellProvider cascade on breaking changes | Documented as operational reality with mitigation | Party Mode |
| dev-host standalone path untested in MVP | Flagged as Phase 1.5 validation gate | Party Mode |
| Shell crash recovery unspecified | Added: diagnostic page + silent re-auth via session storage | Advanced Elicitation |

**Remaining Phase 1.5 Validation Gates:**

- dev-host standalone path (module repo cloned alone, published `@hexalith/*` from registry)
- `hexalith-shell` CLI commands (`add-module`, `sync`, `dev`) wrapping git submodule operations

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed (73 FRs, 48 NFRs mapped)
- [x] Scale and complexity assessed (~12 architectural components)
- [x] Technical constraints identified (10 constraints with sources and impacts)
- [x] Cross-cutting concerns mapped (12 concerns with file-level mapping)

**✅ Architectural Decisions**

- [x] Critical decisions documented with specific library versions
- [x] Technology stack fully specified (React + Vite + Turborepo + pnpm + tsup + ky + Zod + oidc-client-ts + Radix + TanStack Query)
- [x] Integration patterns defined (CQRS command lifecycle, projection caching, auth flow)
- [x] Performance considerations addressed (code splitting, Turborepo caching, vendor chunks)
- [x] Deferred decisions documented with rationale and target phase

**✅ Implementation Patterns**

- [x] Naming conventions established (files, code, CSS, Storybook titles)
- [x] Structure patterns defined (component organization, package layout, module layout)
- [x] Communication patterns specified (hook return shapes, context provider pattern, error handling)
- [x] Process patterns documented (loading states, error recovery, form validation)
- [x] Enforcement mechanisms specified for every pattern

**✅ Project Structure**

- [x] Complete directory structure defined with annotations
- [x] Component boundaries established (package API boundaries, deep import protection)
- [x] Integration points mapped (internal communication, external integrations, data flow)
- [x] Requirements to structure mapping complete (FR → package/file mapping)
- [x] Module distribution model aligned with PRD (git submodules)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — all critical decisions validated, all PRD divergences resolved, testing strategy complete, enforcement mechanisms specified for every pattern.

**Key Strengths:**

- **Domain-native architecture** — CQRS hooks, typed manifests, and bounded context enforcement are the existential differentiator, and the architecture centers everything around them
- **Three-layer enforcement** — tsup entry points + ESLint import rules + CI pipeline gates make it structurally difficult for AI agents or developers to violate boundaries
- **Hybrid distribution model** — Platform monorepo for shell team efficiency + git submodules for module team autonomy. Best of both worlds, aligned with PRD.
- **Contract testing** — Mock/real parity validated by shared test suites. Prevents the #1 risk: mock tests passing while real implementations fail.
- **Comprehensive anti-pattern documentation** — Every pattern includes concrete "don't do this" examples, reducing ambiguity for AI agents to near zero.

**Areas for Future Enhancement:**

- SignalR real-time push (Phase 2 — when backend implements it)
- `hexalith-shell` CLI commands for git submodule DX (Phase 1.5)
- dev-host standalone validation with published packages (Phase 1.5)
- OpenAPI codegen pipeline for automated types (Phase 2)
- Module-to-module communication patterns (Phase 3+, if validated by use cases)

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components — every pattern has a concrete example and anti-pattern
- Respect project structure and boundaries — the three-layer enforcement will catch violations, but agents should avoid generating code that fails enforcement
- Refer to this document for all architectural questions before making assumptions
- Run `pnpm lint` before considering any code change complete

**First Implementation Priority:**

```bash
pnpm dlx create-turbo@latest hexalith-frontshell --example design-system --package-manager pnpm
```

Then restructure from the design-system example to match the FrontShell package topology defined in the Complete Project Directory Structure section.


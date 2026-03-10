---
stepsCompleted: [1, 2, 3, 4, 5, 6]
workflow_completed: true
inputDocuments:
  - brainstorming-session-2026-03-10-001.md
date: 2026-03-10
author: Jerome
---

# Product Brief: Hexalith.FrontShell

## Executive Summary

Hexalith.FrontShell is a CQRS-native micro-frontend shell that lets domain microservice teams ship UI in minutes, not weeks. By providing built-in command and projection hooks connected to Hexalith.EventStore, shell-managed authentication, and a scaffold CLI with working examples, FrontShell eliminates the infrastructure gap that currently blocks microservice teams from delivering user interfaces.

FrontShell is mandatory shared infrastructure — not optional tooling. It provides the contract-bounded architectural layer that every module needs (CQRS plumbing, security, routing, layout) so that teams focus exclusively on domain UI logic. Modules interact with the shell through a strict typed manifest and exactly two shell packages, preventing the organic coupling that plagues shared library approaches. Built on DAPR for infrastructure abstraction, FrontShell deploys on any Kubernetes cluster or on-premise environment without cloud vendor lock-in.

---

## Core Vision

### Problem Statement

Organizations building domain-driven microservice architectures lack a contract-bounded shared frontend infrastructure layer that understands their backend architecture. Each microservice team must independently build CQRS client plumbing, authentication flows, routing integration, and layout composition — before writing a single line of domain UI. This creation boilerplate is compounded by ongoing boilerplate: every new command, query, and component requires repetitive wiring code. Without strict contract boundaries, shared code grows into tightly coupled monoliths through convenience imports and implicit assumptions. The result: fragmented standalone applications, duplicated infrastructure, and high onboarding costs.

### Problem Impact

- **Time to first domain UI:** Microservice teams spend days to weeks building frontend infrastructure before delivering any domain-specific value
- **Security complexity:** Each team independently implements authentication token management, session handling, and tenant context — duplicating effort and multiplying attack surface
- **Coupling creep:** Without strict contract boundaries, frontend integrations become tightly coupled to backend transports and infrastructure through organic dependency growth
- **Fragmented experience:** End users encounter inconsistent navigation, layout, loading behavior, and error handling across microservice frontends
- **Cloud lock-in risk:** Cloud-specific hosting and service dependencies reduce infrastructure sovereignty and increase GAFA dependency

### Why Existing Solutions Fall Short

Generic micro-frontend frameworks (Module Federation, single-spa, iframe compositions) solve the composition problem but ignore the domain integration problem. None understand CQRS — teams must still build the entire command/query plumbing, type synchronization with .NET backends, and testing infrastructure from scratch. These frameworks optimize for runtime composition mechanics while the real boilerplate lives in the gap between frontend components and event-sourced backends. Internal shared library approaches start well but inevitably grow into coupled monoliths without strict contract enforcement.

### Proposed Solution

Hexalith.FrontShell is a typed, contribution-point-based frontend shell where microservice teams plug in their UI through a declarative manifest. The shell provides:

- **CQRS abstraction (primary value):** `useCommand` and `useProjection` hooks connected to Hexalith.EventStore's processors through a ports-and-adapters interface — microservices never deal with transport, serialization, or connection management. The CQRS layer is transport-agnostic: DAPR today, any protocol tomorrow
- **Shell-managed authentication:** Authentication, session management, and tenant context are shell infrastructure concerns. Modules handle only their own domain authorization
- **Progressive complexity:** Simple modules declare routes and components — a manifest under 10 lines. Advanced modules opt into lifecycle hooks, slot contributions, and capability requirements as needed
- **Scaffold with working examples:** CLI generates new modules with a running example component that uses real hooks, plus ongoing generators for new commands/queries/components within existing modules
- **Local development story:** Module developers run against a lightweight shell dev host with mock auth — no full infrastructure required to see their UI working
- **Consistent end-user experience:** The shell delivers unified navigation, layout, loading states, and error handling to end users across all microservice frontends
- **API-first design:** Shell packages follow semantic versioning with a clear deprecation policy, designed for stability from day one
- **Infrastructure sovereignty:** DAPR abstracts all infrastructure, enabling deployment on any cloud or on-premise Kubernetes without vendor dependency

### Key Differentiators

1. **CQRS-native frontend:** The only micro-frontend shell with built-in understanding of commands, projections, and event-sourced backends — eliminating the largest source of boilerplate for domain teams
2. **Contract-bounded coupling:** Each module depends on exactly two shell packages (`@hexalith/shell-api`, `@hexalith/cqrs-client`) with a typed manifest contract — coupling is explicit, finite, and resistant to organic growth
3. **Minutes to first domain UI:** A microservice developer runs one CLI command, modifies the example component with their domain types, and sees projection data in the browser — under 30 minutes, zero infrastructure knowledge required
4. **Full freedom within boundaries:** The manifest constrains the shell interface, not module internals. Teams use the full React ecosystem within their module boundary for complex UIs
5. **Infrastructure sovereign:** Runs on any Kubernetes cluster or .NET Aspire dev environment with no cloud vendor lock-in. The ports-and-adapters CQRS layer survives infrastructure changes
6. **LLM-native development:** DAPR + CQRS/DDD + typed manifests create a pattern set that LLMs can reliably generate — enabling AI-assisted creation of complete modules from domain descriptions

---

## Target Users

### Primary Users

#### Module Developer — "Lucas"

**Profile:** Senior frontend developer (React/TypeScript), 3-5 years experience, embedded in a domain microservice team. Comfortable with modern frontend tooling, has opinions about code quality and testing.

**Context:** Lucas's team owns the Orders microservice. The backend team has built command and projection actors on Hexalith.EventStore. Lucas is responsible for exposing the UI — order lists, order details, place-order forms — through FrontShell.

**Current Pain:**
- Spends 2-3 days setting up CQRS client plumbing, auth token integration, routing wiring, and layout scaffolding before writing a single domain component
- Must understand DAPR transport details, EventStore's API surface, and shell security flows — none of which are his expertise
- Every new command or query requires repetitive wiring code

**What Success Looks Like:**
- Runs `npx create-hexalith-module orders`, modifies the example component with `useProjection<OrderView>()`, and sees real data in the browser in under 30 minutes
- Writes domain UI using the opinionated `@hexalith/ui` component library — forms, tables, detail views are pre-built and consistent
- Never touches auth, transport, or infrastructure code. CQRS hooks "just work"
- Has full creative freedom for complex UI within the module boundary using standard React patterns
- Scaffold includes a passing Playwright test that teaches the fixture pattern by example

**Emotional Arc:** Anxiety ("another framework to learn") → Relief ("one command and it works") → Confidence ("I can ship features fast") → Advocacy ("every team should use this")

#### Shell Team Developer — "Jerome's Team"

**Profile:** Full-stack developers and architects who build and maintain FrontShell itself — the shell application, the component library (`@hexalith/ui`), the CQRS client, the scaffold CLI, and the platform documentation.

**Context:** The shell team owns the three foundation packages (`@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui`), the shell application, and the developer experience. They serve every microservice team in the organization.

**Current Pain:**
- Without FrontShell, each microservice team reinvents infrastructure, creating inconsistent implementations and duplicated security vulnerabilities
- No unified way to compose UIs from multiple microservices into a coherent application
- Platform evolution is risky — changes could break multiple downstream modules

**What Success Looks Like:**
- Module teams adopt FrontShell without resistance because the DX is genuinely better than going alone
- Build-time manifest validation catches integration errors before deployment
- Semantic versioning with clear deprecation policy lets the platform evolve without breaking modules
- Comprehensive test suite (visual regression, a11y, integration) provides confidence in platform changes
- Component library covers 90%+ of common UI patterns so module teams rarely need custom components

**Key Metric:** Number of modules onboarded without shell team intervention

### Secondary Users

#### End User — "Elena"

**Profile:** Operations manager, business analyst, or domain professional who uses the composed Hexalith application daily. Not technical. Doesn't know microservices or modules exist.

**Context:** Elena manages tenants, reviews orders, configures workflows, monitors dashboards. She navigates between different business domains throughout her workday — all within what she perceives as ONE application.

**Needs:**
- Consistent navigation, layout, and interaction patterns across all business domains
- Fast page loads and responsive interactions — no visible "module switching" friction
- Graceful error handling — if one domain's backend is down, the rest of the app still works
- Coherent visual design — buttons, tables, forms, notifications look and behave identically everywhere

**What Success Looks Like:**
- Elena never notices the underlying architecture. The application feels like a single, well-designed product
- Switching from tenant management to order management is seamless — same sidebar structure, same table behaviors, same form patterns
- When something fails, she sees a helpful error message in context, not a blank screen

**Why This Matters:** Elena's experience is the ultimate validation of FrontShell's architecture. If modules feel disjointed, the opinionated component library and shell infrastructure have failed their purpose.

### User Journey

#### Module Developer Journey (Lucas)

| Phase | Experience | FrontShell Enabler |
|-------|-----------|-------------------|
| **Discovery** | Team lead says "we need UI for our microservice, use FrontShell" | Mandate + reputation from other teams' success |
| **Onboarding** | Reads one-page Getting Started guide, runs scaffold CLI | `create-hexalith-module` with working example |
| **First Feature** | Modifies example component with domain types, sees projection data | `useProjection` hook + `@hexalith/ui` components |
| **Aha! Moment** | Realizes he didn't write a single line of auth, routing, or CQRS plumbing code | Shell-managed infrastructure |
| **Testing** | Runs the scaffolded Playwright test, modifies it for his domain, it passes | Pre-built CQRS + shell fixtures |
| **Shipping** | Publishes NPM package, submits one-line PR to shell repo | Build-time manifest validation |
| **Ongoing** | Uses CLI generators for new commands/queries/components | Ongoing scaffold generation |
| **Mastery** | Uses advanced manifest features — slots, lifecycle hooks, capability declarations | Progressive complexity |

#### End User Journey (Elena)

| Phase | Experience | FrontShell Enabler |
|-------|-----------|-------------------|
| **First Use** | Logs in, sees unified dashboard with navigation sidebar | Shell layout + auth signals |
| **Daily Work** | Navigates between business domains seamlessly | Shell router + consistent `@hexalith/ui` |
| **Data Interaction** | Views tables, submits forms, sees real-time updates | CQRS projections + opinionated components |
| **Error Handling** | Backend issue in one module shows contextual error, rest of app works | Module error boundaries + health states |
| **Trust** | Relies on the application as her primary work tool | Consistent, reliable, performant experience |

---

## Success Metrics

### User Success Metrics

#### Module Developer (Lucas)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Time to first working page** | ≤ 30 minutes | Time from `create-hexalith-module` to projection data rendered in browser |
| **Infrastructure code written** | 0 lines | Module developer writes zero auth, routing, transport, or CQRS plumbing code — only domain logic and UI |
| **Ongoing boilerplate per feature** | ≤ 5 minutes | Time to add a new command/query/component using CLI generators |
| **Testing onboarding** | First test passes on scaffold | Scaffolded Playwright test runs green without modification |
| **Developer satisfaction** | ≥ 7/10 | Quarterly DX survey — leading indicator for adoption health |

#### Shell Team (Jerome's Team)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Self-service onboarding rate** | 80% (3mo) → 95% (6mo) → 99% (12mo) | Percentage of modules onboarded without shell team support tickets |
| **Build-time error detection** | 100% | Manifest validation catches all integration errors before deployment |
| **Breaking change protocol adherence** | 100% | Every shell-api/cqrs-client/ui change follows the deprecation policy — measurable from day one |
| **Component library coverage** | 90%+ | Percentage of common UI patterns (forms, tables, detail views, dashboards) covered by `@hexalith/ui` |
| **Shell build time ceiling** | ≤ 60 seconds with 20 modules | Build-time composition must stay performant at scale |

#### End User (Elena)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Visual consistency score** | 100% | All modules use `@hexalith/ui` components — no custom design system deviations |
| **Cross-module navigation friction** | 0 perceived transitions | User testing confirms domain switching feels seamless |
| **Error resilience** | Partial failure tolerance | Module failure shows contextual error; rest of application remains functional |
| **Task completion time** | Baseline established at 3 months | Time for Elena to complete key workflows measured and tracked for improvement |

### Quality Gates (BMAD TEA — Hard Requirements)

| Gate | Requirement | Enforcement |
|------|------------|-------------|
| **Module acceptance** | ≥ 80% component test coverage, all tests green, Playwright CT required | CI pipeline rejects module PR if gate fails |
| **Shell platform** | ≥ 95% coverage on foundation packages, visual regression suite, a11y audit | CI pipeline on shell-api, cqrs-client, ui repos |
| **Build-time validation** | Manifest validation + test coverage check | Runs on every module PR to shell |
| **Visual regression** | Zero regressions across modules after shell package upgrades | Automated visual diff in CI |

### Business Objectives

| Objective | Target | Timeframe |
|-----------|--------|-----------|
| **First module in production** | 1 domain microservice UI live through FrontShell | 3 months |
| **Baseline measurement** | Document actual time spent by one team building frontend infrastructure without FrontShell — establishes cost savings baseline | Before launch |
| **Total engineering cost savings** | Measurable reduction in total engineering hours spent on frontend infrastructure across all teams | Tracked quarterly from month 3 |
| **Boilerplate elimination** | From 2-3 days of infrastructure setup per module to 30 minutes | 3 months |
| **Platform adoption** | All new microservice UIs built through FrontShell (mandatory) | 3 months |

### Key Performance Indicators

| KPI | Formula | Leading/Lagging |
|-----|---------|-----------------|
| **Developer hours saved per module** | (Baseline infrastructure setup time) − (FrontShell setup time) | Lagging |
| **Total quarterly hours saved** | Developer hours saved per module × modules onboarded in quarter | Lagging |
| **Self-service rate** | (Modules onboarded without support) ÷ (total modules onboarded) × 100 | Leading |
| **Time to first render** | Minutes from scaffold to projection data on screen | Leading |
| **Module infrastructure code ratio** | (Infrastructure lines) ÷ (total lines) per module — target: 0% | Leading |
| **End-user consistency score** | Automated visual regression test pass rate across modules | Leading |
| **Developer satisfaction (DX score)** | Quarterly survey score ≥ 7/10 | Leading |
| **Test coverage compliance** | Percentage of modules meeting ≥ 80% coverage gate | Leading |

---

## MVP Scope

### Core Features

**MVP delivers the minimum platform that lets Lucas scaffold a module, write domain UI with CQRS hooks and opinionated components, and ship it through the shell — in 3 months.**

#### Foundation Packages

| Package | MVP Scope | What Ships |
|---------|-----------|------------|
| **`@hexalith/cqrs-client`** | useCommand, useProjection hooks, ICommandBus/IQueryBus interfaces, DaprCommandBus/DaprQueryBus implementations, MockCommandBus/MockQueryBus for testing | Commands and queries as pure data objects, ports-and-adapters pattern |
| **`@hexalith/shell-api`** | ModuleManifest type (routes + navigation only), basic ShellProvider (auth context, tenant context) | Minimal manifest — routes and navigation items. No slots, no lifecycle hooks, no capability declarations |
| **`@hexalith/ui`** | Core component library — Table, Form, DetailView, Button, Input, Select, Modal, Notification, Sidebar, Toolbar, PageLayout, LoadingState, ErrorBoundary | Opinionated, consistent, covers 90% of common domain UI patterns |

#### Shell Application

| Feature | MVP Scope |
|---------|-----------|
| **Shell scaffold** | React + Vite + react-router-dom |
| **Module registry** | Imports module manifests, registers routes, builds navigation |
| **Auth provider** | Shell-managed authentication, token management, tenant context — broadcast to modules via React context |
| **Layout** | Fixed layout with sidebar navigation, main content area, top bar. No dynamic slot reconciliation |
| **Error boundaries** | Per-module error boundary with fallback UI and retry |
| **Build-time validation** | Manifest type checking at compile time — invalid manifests fail the build |

#### Developer Tooling

| Tool | MVP Scope |
|------|-----------|
| **`create-hexalith-module` CLI** | Scaffolds a new module with working example component, CQRS hooks, Playwright test, and manifest |
| **Shell dev host** | Lightweight local shell with mock auth for module development without full infrastructure |
| **Base test fixtures** | `@hexalith/cqrs-client/fixtures` (MockCommandBus, MockQueryBus) + `@hexalith/shell-api/fixtures` (mockAuth) |

#### Validation

| Deliverable | MVP Scope |
|-------------|-----------|
| **Reference module** | Hexalith.Tenants UI — full working module demonstrating the complete pattern (list, detail, create form) |
| **Getting Started guide** | One-page guide: scaffold → modify → test → ship |
| **BMAD TEA test suite** | Unit tests on pure functions, Playwright CT on components, build-time validation on manifests |

### Out of Scope for MVP

| Feature | Rationale | Target Phase |
|---------|-----------|--------------|
| **Contribution points / named slots** (sidebar, toolbar, statusbar) | Fixed layout is sufficient for v1. Slot reconciliation adds complexity without immediate value | Phase 2 |
| **Module lifecycle hooks** (activate, deactivate, health/readiness) | React.lazy() is sufficient for MVP. Full lifecycle state machine is premature | Phase 2 |
| **One-way shell signaling system** | React context providers handle auth/theme/tenant for MVP. Typed signal system is an optimization | Phase 2 |
| **Layout reconciliation engine** | Fixed layout works for early modules. Dynamic reconciliation needed at 10+ modules | Phase 2 |
| **Capability declarations & validation** | `requires: ['auth', 'notifications']` — useful at scale, unnecessary with < 5 modules | Phase 2 |
| **Ongoing CLI generators** (add command/query/component to existing module) | Manual creation is acceptable for MVP. Generators reduce ongoing boilerplate in Phase 2 | Phase 2 |
| **OpenAPI codegen pipeline** | Types can be manually maintained for 1-2 modules. Automated pipeline needed at scale | Phase 2 |
| **ESLint dependency surface enforcement** | Code review catches violations for MVP. Lint rule needed when module count grows | Phase 2 |
| **Multiple component library support** | Opinionated `@hexalith/ui` only. Third-party library support is a future consideration | Phase 3+ |
| **Visual regression testing suite** | Component library tested with Playwright CT for MVP. Automated visual diff added in Phase 2 | Phase 2 |

### MVP Success Criteria

| Criterion | Validation Method | Go/No-Go |
|-----------|-------------------|----------|
| **30-minute onboarding** | A developer unfamiliar with FrontShell scaffolds a module and sees projection data in ≤ 30 minutes | Must pass |
| **Zero infrastructure code** | The reference module (Tenants) contains zero lines of auth, routing, or CQRS transport code | Must pass |
| **Self-service onboarding** | At least one team outside the shell team successfully onboards a module without support tickets | Must pass |
| **End-user consistency** | The Tenants module is visually indistinguishable from shell-native UI — same components, same patterns | Must pass |
| **BMAD TEA gates** | Reference module meets ≥ 80% test coverage, all tests green, Playwright CT suite passes | Must pass |
| **Build-time validation** | Invalid manifest intentionally introduced is caught at compile time | Must pass |
| **Baseline measured** | Pre-FrontShell infrastructure setup time documented for cost savings calculation | Must pass |

### Future Vision

**Phase 2 (Months 4-6): Platform Maturity**
- Contribution points and named slots — modules contribute to sidebar, toolbar, statusbar
- Module lifecycle state machine — activate, deactivate, health/readiness
- One-way shell signaling — typed infrastructure broadcasts (auth:changed, theme:changed, tenant:switched)
- Layout reconciliation engine — computed layout from module declarations + shell config overrides
- Ongoing CLI generators — add command/query/component within existing modules
- OpenAPI codegen pipeline — automated type generation from .NET microservice contracts
- Visual regression testing suite — automated visual diff across modules

**Phase 3 (Months 7-9): Scale & Ecosystem**
- ESLint dependency surface enforcement — automated coupling boundary validation
- Advanced manifest features — capability declarations, activation events
- Module health monitoring — shell-level observability of module status
- Performance optimization — tree-shaking, lazy manifest loading for 20+ modules
- Developer satisfaction survey program — quarterly DX tracking

**Phase 4 (Months 10-12): Innovation**
- LLM module generation — AI-assisted creation of complete modules from domain descriptions
- Multi-component-library support — allow approved alternatives to `@hexalith/ui`
- Cross-module communication patterns — if validated by real use cases
- Plugin marketplace — community-contributed shell extensions

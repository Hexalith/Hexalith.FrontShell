---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
  - step-e-01-discovery
  - step-e-02-review
  - step-e-03-edit
inputDocuments:
  - product-brief-Hexalith.FrontShell-2026-03-10.md
  - research/technical-dapr-cqrs-typescript-frontend-research-2026-03-10.md
  - research/technical-bmad-tea-testing-strategy-architecture-research-2026-03-12.md
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 2
  brainstorming: 0
  projectDocs: 0
classification:
  summary: "A domain-native frontend developer platform where microservice teams plug domain UI into a contract-bounded shell that enforces consistency for end users."
  type: "Frontend Developer Platform (FDP)"
  architecture: "Host-plugin, contract-bounded (structural manifest + visual component library); build-time composition; manifest is center of gravity"
  audience: "Dual-track (developers + end users); DX-first with cascading UX impact; UX wins conflicts"
  domain: "Platform Engineering"
  differentiator: "Domain-native / CQRS-native (existential)"
  complexity: "High (architectural: contract surface, CQRS integration, multi-module composition)"
  context: "Greenfield frontend in brownfield ecosystem (EventStore CommandApi, DAPR, .NET Aspire); backend contracts are immovable inputs"
  qualityAttributes: "DX ergonomics first-class; shell enforces (not just enables) consistency"
date: '2026-03-10'
author: Jerome
lastEdited: '2026-03-12'
editHistory:
  - date: '2026-03-10'
    changes: 'Validation-driven fixes: FR13/FR26/FR40 format compliance, FR44 measurability, build time NFR target'
  - date: '2026-03-10'
    changes: 'Added Migration Path subsection to Developer Platform Specific Requirements for project-type compliance'
  - date: '2026-03-12'
    changes: 'TEA compliance: Added Testing & Quality Gates NFR subsection (10 requirements), Testing Strategy FRs (FR52-FR57 including ATDD, contract testing, traceability), TEA workflow integration in build sequence, contract testing in Integration NFR, TEA-aligned success metrics (flakiness, MTTD, release confidence, criteria coverage).'
  - date: '2026-03-12'
    changes: 'Validation fixes: Added Journey 8 (Testing/QA workflow) tracing FR52-FR57. Merged FR39/FR40 (component library). Added Migration FR (FR60). Fixed Journey 2 SignalR scope to MVP. Replaced subjective metrics with measurable thresholds (MTTD < 30min, error resilience test, navigation 0 reloads). Harmonized build time targets (90s/10mod MVP, 60s/20mod Phase 2). Clarified FR52-FR55 enforcement mechanisms (CI, workflows). FR renumbered FR42-FR73.'
  - date: '2026-03-12'
    changes: 'Architecture alignment: Clarified FR11 MVP scope as polling-based freshness (SignalR push deferred to Phase 2). Updated FR13, FR15, FR17, FR27 for polling-first language. Moved FR60 (Migration) into Phase 2 Capabilities section. Updated build sequence (removed Weeks 10-11 SignalR block, replaced with polling hardening). Updated Risk #1 table, Risk #2 SignalR+Keycloak row, Integration NFR, and Security NFR to reflect Phase 2 SignalR scope. Updated Journey 2 (Lucas) narrative.'
---

# Product Requirements Document - Hexalith.FrontShell

**Author:** Jerome
**Date:** 2026-03-10

## Executive Summary

Hexalith.FrontShell is a domain-native frontend developer platform that extends DDD bounded contexts to the UI layer. Microservice teams plug domain-specific screens into a contract-bounded shell through a typed module manifest — the shell handles authentication, routing, CQRS plumbing, and visual consistency. The result: developers write zero infrastructure code and ship their first domain UI in under 30 minutes; end users experience a seamless, unified application across all business domains without knowing multiple teams built it.

FrontShell operates within a brownfield ecosystem. The backend — Hexalith.EventStore for CQRS/ES, DAPR for infrastructure abstraction, .NET microservices for domain logic — already exists. FrontShell is the missing frontend layer: a greenfield React/TypeScript shell that consumes EventStore's REST CommandApi (`POST /api/v1/commands`) and per-microservice projection query APIs as immovable inputs.

The platform serves two audiences through a cascading quality model. Module developers (primary) interact with the platform directly through a scaffold CLI, CQRS hooks (`useCommand`, `useProjection`), and an opinionated component library (`@hexalith/ui`). End users (secondary) interact with the composed output — their experience is a direct function of the DX quality the platform enforces. When developer convenience and end-user consistency conflict, UX wins.

The timing is strategic: CQRS and DDD architectures are powerful but historically expensive due to verbosity — commands, events, projections, aggregates each requiring dedicated types and wiring. AI-assisted development has matured to the point where these structured, typed patterns are exactly what LLMs generate reliably. FrontShell turns DDD's ceremony tax into an AI-readiness investment: the more structured the contracts, the better AI performs, making architectural discipline a productivity multiplier rather than a cost center.

### What Makes This Special

FrontShell is domain-native, not infrastructure-native. Where Module Federation and single-spa solve UI composition mechanics, FrontShell solves domain integration — the gap between frontend components and event-sourced backends that consumes the majority of development time. The shell implements literal DDD patterns at the frontend layer:

- **Module = Bounded Context's UI face** — each module owns one domain's screens, isolated by design
- **Manifest = Published Language** — the typed contract between module and shell, validated at build time
- **Shell = Context Map** — the integration layer that composes bounded contexts into a coherent application
- **Two-package limit = Anti-Corruption Layer** — modules depend on exactly `@hexalith/shell-api` and `@hexalith/cqrs-client`, preventing organic coupling through convenience imports

This delivers value at every organizational layer: architects get enforceable bounded contexts; developers get zero-infrastructure onboarding with AI-generatable patterns; testers get independently testable modules where integration testing reduces to type checking; end users get invisible architecture — consistent experience across domain boundaries; and the organization gets an AI-readiness investment that compounds as more modules join the platform.

The existential differentiator is domain-nativeness. Remove the CQRS hooks and DDD contract enforcement, and FrontShell becomes commodity micro-frontend infrastructure with no reason to exist.

## Project Classification

| Attribute | Value |
|-----------|-------|
| **Summary** | A domain-native frontend developer platform where microservice teams plug domain UI into a contract-bounded shell that enforces consistency for end users |
| **Type** | Frontend Developer Platform (FDP) |
| **Architecture** | Host-plugin, contract-bounded (structural manifest + visual component library); build-time composition; manifest is center of gravity |
| **Audience** | Dual-track (developers + end users); DX-first with cascading UX impact; UX wins conflicts |
| **Domain** | Platform Engineering |
| **Differentiator** | Domain-native / CQRS-native (existential) |
| **Complexity** | High (architectural: contract surface, CQRS integration, multi-module composition) |
| **Context** | Greenfield frontend in brownfield ecosystem (EventStore CommandApi, DAPR, .NET Aspire); backend contracts are immovable inputs |
| **Quality Attributes** | DX ergonomics first-class; shell enforces (not just enables) consistency |

## Success Criteria

### User Success

**Module Developer (Lucas)**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first working page (manual) | ≤ 30 minutes | Time from `create-hexalith-module` to projection data rendered in browser |
| Time to first working page (AI) | ≤ 5 minutes | Time from domain description to working module with projection data |
| Infrastructure code written | 0 lines | Module developer writes zero auth, routing, transport, or CQRS plumbing code |
| Ongoing boilerplate per feature | ≤ 5 minutes | Time to add a new command/query/component using CLI generators |
| Testing onboarding | First test passes on scaffold | Scaffolded Playwright test runs green without modification |
| Developer satisfaction | ≥ 7/10 | Quarterly DX survey |
| Bounded context isolation | Zero cross-module dependencies | No module imports from any other module — manifest and two shell packages only |
| AI-generability | Working module from domain description | LLM generates a complete, functional module scaffold from a domain description with zero manual corrections |
| AI reproducibility | 8/10 success rate | 8 out of 10 generation attempts produce a module passing all quality gates |
| AI test generation | ≥ 80% coverage | AI-generated tests achieve ≥ 80% coverage of the AI-generated module code |

**Shell Team (Jerome's Team)**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Self-service onboarding rate | 80% (3mo) → 95% (6mo) → 99% (12mo) | Modules onboarded without shell team support tickets |
| Build-time error detection | All manifest-detectable errors caught before deployment | TypeScript type validation + semantic validation (duplicate routes, invalid navigation) catches all errors expressible through the manifest type system |
| Breaking change protocol | 100% adherence | Every shell-api/cqrs-client/ui change follows deprecation policy |
| Component library coverage | 90%+ | Common UI patterns (forms, tables, detail views, dashboards) covered by `@hexalith/ui` |
| Shell build time ceiling | ≤ 60 seconds with 20 modules | Build-time composition stays performant at scale |

**End User (Elena)**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Visual consistency | 100% | All modules use `@hexalith/ui` components — zero custom design deviations |
| Cross-module navigation friction | 0 full-page reloads on module switch | Module-to-module navigation uses client-side routing only. No layout shift, no flash of loading state > 200ms. Validated by Playwright test measuring route transition time |
| Error resilience | ≥ 1 module can fail without affecting other modules or shell navigation | Module failure shows contextual error with retry option; remaining modules and shell navigation remain fully functional. Validated by Playwright test: force one module's backend offline, verify other modules operate normally |
| Task completion time | Baseline at 3 months | Key workflow times measured and tracked |

### Business Success

| Objective | Target | Timeframe |
|-----------|--------|-----------|
| First module in production | 1 domain microservice UI live through FrontShell | 3 months |
| Baseline measurement | Document actual infrastructure setup time without FrontShell | Before launch |
| Boilerplate elimination (three-tier) | Without FrontShell: 2-3 days → Manual: ≤ 30 min → AI: ≤ 5 min | 3 months |
| Platform adoption | All new microservice UIs built through FrontShell (mandatory) | 3 months |
| AI module generation | LLM generates deployable module from domain description | MVP (3 months) |
| Total engineering savings | Measurable reduction in frontend infrastructure hours | Tracked quarterly from month 3 |

### Technical Success

| Gate | Requirement | Enforcement |
|------|------------|-------------|
| Module acceptance | ≥ 80% component test coverage, all tests green, Playwright CT required | CI pipeline rejects module PR if gate fails |
| Shell platform | ≥ 95% coverage on foundation packages, visual regression suite, a11y audit | CI pipeline on shell-api, cqrs-client, ui repos |
| Build-time validation | Manifest type checking + test coverage check | Runs on every module PR |
| Bounded context enforcement | Zero cross-module imports detected | CI lint rule — build fails on violation |
| AI-generability validation | Generated module passes all quality gates without manual edits | Automated test: domain description → generated module → CI pipeline → green |
| Same gates, different authors | AI modules pass identical quality gates as human modules | No separate AI-specific standards — same CI pipeline |
| Test flakiness rate | < 2% of test runs flagged as flaky per week | CI tracks flaky occurrences; tests exceeding threshold quarantined and fixed within sprint |
| Mean time to detect defect | < 30 minutes from commit to CI failure notification | CI pipeline completes smoke stage within 5 minutes of commit; full regression within 30 minutes on PR |
| Release confidence | Objective quality gate decision (PASS/CONCERNS/FAIL) per release | Traceability matrix + NFR assessment produce data-driven gate recommendation — no subjective "feels ready" |
| Acceptance criteria coverage | 100% of acceptance criteria mapped to ≥ 1 test | Traceability matrix generated before release gate; unmapped criteria block deployment |

### Measurable Outcomes

**Cascading Quality Validation (DX → UX correlation):**

| DX Indicator | Expected UX Outcome | Measurement |
|-------------|---------------------|-------------|
| Module uses 100% `@hexalith/ui` components | Elena sees visually consistent UI | Visual regression score per module |
| Module passes manifest validation | Navigation and routing work without errors | Zero runtime routing errors from that module |
| Module uses `useProjection` hooks correctly | Data loads consistently with loading states | End-user perceived latency ≤ 200ms for projection renders |
| Module has ≥ 80% test coverage | Fewer runtime errors in production | Error rate per module correlates inversely with coverage |
| AI-generated module uses `@hexalith/ui` | AI module visually indistinguishable from human-authored | Visual regression comparison passes |

**Domain-Nativeness Validation:**

| Criterion | Validation | Go/No-Go |
|-----------|-----------|----------|
| Each module maps to exactly one bounded context | Architecture review confirms 1:1 mapping | Must pass |
| No module-to-module dependencies | CI scan shows zero cross-module imports | Must pass |
| Manifest is sole integration contract | Module works with any shell version that satisfies the manifest type | Must pass |
| CQRS hooks abstract all backend interaction | Module contains zero direct HTTP calls to EventStore or microservices | Must pass |

## Product Scope

### MVP - Minimum Viable Product

**Delivers in 3 months: the minimum platform that lets a module developer scaffold a module — manually or via AI — write domain UI with CQRS hooks and opinionated components, and ship it through the shell.**

Three foundation packages (`@hexalith/cqrs-client`, `@hexalith/shell-api`, `@hexalith/ui`), a scaffold CLI, shell application with Keycloak auth, and dual validation tracks (human-authored Tenants module + AI-generated module). For detailed feature breakdown, build sequence, and risk mitigation, see [Project Scoping & Phased Development](#project-scoping--phased-development).

### Post-MVP Roadmap

For the complete phased roadmap (Phase 1.5 through Phase 4), see [Post-MVP Roadmap](#post-mvp-roadmap) in the Project Scoping section.

## User Journeys

The following journeys trace how each persona interacts with FrontShell across realistic scenarios — revealing platform capabilities through narrative rather than specification. Each journey maps directly to functional requirements in the [Functional Requirements](#functional-requirements) section.

### Journey 1: Lucas Builds His First Module (Module Developer — Happy Path)

**Opening Scene:** Lucas is a senior React developer on the Orders team. His backend colleagues have spent two months building command and projection actors on Hexalith.EventStore. The team lead just said "we need UI for this — use FrontShell." Lucas has never touched FrontShell. He opens the Getting Started guide on a Monday morning, coffee in hand, mild anxiety in chest.

**Rising Action:** He runs `npx create-hexalith-module orders`. A project appears — not an empty skeleton, but a working example with a component that renders projection data, a form that sends commands, and a Playwright test that passes. He opens the example component: `useProjection<ExampleView>()` returns data. He replaces `ExampleView` with `OrderView`, swaps the example fields for `orderId`, `customer`, `total`. He runs the dev host. Real data from his team's projection API appears in the browser. He didn't configure auth. He didn't wire routing. He didn't write a single line of CQRS plumbing.

**Climax:** Lucas modifies the scaffolded Playwright test, replacing example assertions with order-specific ones. It passes. He looks at his module's dependency tree: `@hexalith/shell-api`, `@hexalith/cqrs-client`, and his own domain types. That's it. He realizes he's been working for 25 minutes and has a functional order list page with real data. The anxiety is gone.

**Resolution:** Over the next two weeks, Lucas builds an order detail view, a place-order form, and a status tracking component — all using `@hexalith/ui` components and CQRS hooks. He never opens a DAPR doc. He never debugs an auth token. His PR to the shell repo is one line in the module registry. Build-time validation confirms his manifest is valid. His module ships.

**Emotional Arc:** Anxiety → Surprise ("that was fast") → Confidence → Advocacy ("every team should use this")

**Capabilities Revealed:** Scaffold CLI, CQRS hooks, component library, shell dev host, build-time manifest validation, module registry, test fixtures

---

### Journey 2: Lucas Hits a Wall (Module Developer — Edge Case)

**Opening Scene:** Three weeks after shipping Orders, Lucas needs a custom visualization — a Gantt chart showing order fulfillment stages. `@hexalith/ui` doesn't have a Gantt component. He's also getting stale projection data: after sending a `PlaceOrder` command, the order list doesn't update immediately.

**Rising Action:** For the Gantt chart, Lucas installs a third-party React charting library inside his module boundary. The manifest doesn't care — it only constrains the shell interface, not module internals. He wraps the chart in a `@hexalith/ui` PageLayout to maintain visual consistency. Freedom within boundaries.

For projection freshness, he discovers `useQuery` supports SignalR push notifications out of the box — when any client changes a projection, his view updates automatically via the `ProjectionChanged` signal. He also sets a `refetchInterval` of 2 seconds as a fallback for the order list. For the detail view, he uses on-demand refresh triggered by his command success callback. The hook exposes connection state (`connected`, `reconnecting`, `disconnected`), so he can show a subtle indicator when the SignalR connection drops or polling encounters errors.

**Climax:** Lucas accidentally imports a utility function from the Tenants module — it's convenient, it's right there. The CI pipeline fails: "Cross-module import detected: @hexalith/tenants. Modules must only depend on @hexalith/shell-api and @hexalith/cqrs-client." The bounded context boundary holds. He duplicates the 3-line utility in his own module. It's the right architectural choice, even though it felt wrong for a moment.

**Resolution:** The Gantt chart looks different from standard `@hexalith/ui` components but sits within the consistent page layout. Lucas opens a feature request for a Gantt component in `@hexalith/ui`. The shell team adds it to the Phase 2 backlog. The system worked: custom UI where needed, consistency enforced where it matters, and boundary violations caught automatically.

**Emotional Arc:** Frustration ("missing component") → Relief ("I can use any React library") → Surprise ("CI caught my boundary violation") → Understanding ("the constraints are protecting me")

**Capabilities Revealed:** Module-internal freedom, CI boundary enforcement, projection refresh options, component library extension process, error messaging for violations

---

### Journey 3: Claude Generates a Module (AI — Happy Path)

**Opening Scene:** The Inventory team needs a basic UI — stock levels, warehouse views, reorder forms. Instead of waiting for a developer, the team lead feeds a domain description to Claude: "Generate a FrontShell module for the Inventory bounded context. It should display current stock levels by warehouse, show item details with reorder history, and provide a reorder form that sends a `ReorderStock` command."

**Rising Action:** Claude receives the domain description alongside the platform knowledge bundle: the manifest JSON Schema, the CQRS hook API with examples, the `@hexalith/ui` component catalog with prop tables, and the test fixture documentation. Claude generates:
- A `ModuleManifest` with routes for `/inventory/stock`, `/inventory/items/:id`, and `/inventory/reorder`
- Three page components using `useProjection<StockLevelView>()`, `useProjection<ItemDetailView>()`, and `useCommand<ReorderStock>()`
- All UI built with `@hexalith/ui` Table, DetailView, and Form components
- Playwright component tests using `MockCommandBus` and `MockQueryBus` fixtures
- Domain TypeScript types matching the projection and command shapes

**Climax:** The generated module is submitted to the CI pipeline. Manifest type validation passes. The lint rule confirms zero cross-module imports. Test coverage hits 84%. All Playwright tests pass. The module meets every quality gate that a human-authored module must meet. The team lead reviews the generated code — it looks indistinguishable from Lucas's hand-built Orders module.

**Resolution:** The team lead makes minor domain-specific adjustments (custom reorder threshold logic) and ships the module. Total time from domain description to production: under an hour. The generated code serves as a foundation the team customizes over time — not throwaway scaffolding, but production-quality starting point.

**Emotional Arc (Team Lead):** Skepticism ("AI-generated code?") → Surprise ("it passes all quality gates") → Pragmatism ("let me tweak this one function") → Conviction ("we'll generate every new module this way")

**Capabilities Revealed:** Platform knowledge bundle, AI prompt template, domain description → module pipeline, same quality gates for AI and human, CI validation, manifest JSON Schema

---

### Journey 4: Elena's Tuesday (End User — Daily Work)

**Opening Scene:** Elena is an operations manager. It's Tuesday morning. She logs into the Hexalith application — one URL, one login. A sidebar shows: Tenants, Orders, Inventory, Workflows. She doesn't know these are separate modules built by separate teams. She doesn't know one was hand-built and one was AI-generated. To her, it's one app.

**Rising Action:** Elena starts in Tenants — she needs to verify a new customer's configuration. The table loads instantly, she filters by name, clicks through to the detail view. Same table she sees everywhere. Same filter behavior. Same detail layout. She switches to Orders via the sidebar. No page reload, no flash, no layout shift. The orders table has the same column sort behavior, the same pagination, the same row-click-to-detail pattern. She places a new order using a form that looks and behaves exactly like the tenant creation form she used yesterday — same input validation, same error messages, same submit confirmation.

**Climax:** The Inventory microservice goes down for maintenance. Elena navigates to Inventory from the sidebar. Instead of a blank screen or a cryptic error, she sees a contextual message: "Inventory data is temporarily unavailable. Other sections of the application continue to work normally." She clicks back to Orders — everything still works. She never lost her session, her navigation state, or her trust in the application.

**Resolution:** Elena completes her daily workflow across four business domains. She mentions to a colleague: "The new inventory section is nice — same look as everything else." She has no idea it was generated by AI last week. The architecture is invisible. The experience is seamless.

**Emotional Arc:** Routine confidence → Seamless flow → Graceful degradation → Continued trust

**Capabilities Revealed:** Shell-managed auth, unified navigation, consistent component library, per-module error boundaries, partial failure tolerance, cross-module session persistence

---

### Journey 5: Priya Evaluates FrontShell (Onboarding Evaluator)

**Opening Scene:** Priya leads the Shipping microservice team. Her CTO mandated FrontShell for all new UIs, but Priya is skeptical. Her team has been using a custom React app for 18 months. She opens the Getting Started guide to evaluate whether FrontShell is worth the migration cost.

**Rising Action:** Priya runs `create-hexalith-module shipping` and spends 20 minutes exploring the scaffold. She compares it to her team's existing codebase: their current app has 400 lines of auth token management, 200 lines of API client wiring, 150 lines of routing configuration. The FrontShell module has zero. She opens the CQRS hooks — `useProjection<ShipmentView>()` replaces her team's custom `useShipmentApi()` hook that wraps fetch, handles auth headers, manages loading states, and retries on 401s. All of that is gone.

She then tests AI generation with a description of her team's shipping domain. A working module appears in minutes. It's not perfect — the shipping status workflow needs custom logic — but 80% of the boilerplate is correct.

**Climax:** Priya runs the existing Tenants module's Playwright tests, then runs her scaffolded module's tests. Same fixture pattern, same assertion style, same CI pipeline. She realizes that migrating to FrontShell doesn't mean learning "yet another framework" — it means *deleting* 750 lines of infrastructure code her team maintains and replacing them with nothing.

**Resolution:** Priya presents to her team: "We're moving to FrontShell. Not because the CTO said so, but because maintaining our own auth, routing, and API client is waste. We keep our domain components, wrap them in `@hexalith/ui` layouts, and delete everything else." The team migrates in a week. No shell team support ticket needed.

**Emotional Arc:** Skepticism → Curiosity → Recognition ("we're maintaining waste") → Advocacy

**Capabilities Revealed:** Self-service evaluation, migration path clarity, infrastructure elimination quantification, scaffold as evaluation tool, mandate + evidence alignment

---

### Journey 6: Jerome's Team Evolves the Shell (Shell Team — Platform Maintenance)

**Opening Scene:** Jerome's team needs to add a new capability to `@hexalith/shell-api`: tenant switching. Five modules are now in production. Any breaking change cascades to all of them. The team follows the deprecation protocol.

**Rising Action:** The team adds `onTenantSwitch` to the `ShellProvider` as a new optional field — non-breaking. They update the shell to broadcast tenant context changes. They add the new API to the platform knowledge bundle so future AI-generated modules can use it. They write migration docs: "Existing modules continue to work unchanged. To respond to tenant switches, add `onTenantSwitch` to your manifest."

They run the full CI suite: all five module manifests still validate. Visual regression passes — no UI changes from a shell-side update. Build time with five modules: 23 seconds. Well under the 60-second ceiling.

**Climax:** One module team (Orders) adopts `onTenantSwitch` to filter orders by selected tenant. They update their manifest, add one hook call, and submit a PR. Build-time validation confirms the updated manifest is valid. The shell team didn't need to be involved — the typed contract guided the module team.

**Resolution:** The shell team reviews their quarterly metrics: 5 modules onboarded, 4 self-service (80% target met). Zero breaking changes shipped. Component library covers 92% of common patterns. Developer satisfaction survey: 8.2/10. The platform is working.

**Emotional Arc:** Caution ("don't break downstream") → Confidence ("deprecation protocol works") → Satisfaction ("they adopted without our help")

**Capabilities Revealed:** Non-breaking API evolution, deprecation protocol, platform knowledge bundle updates, manifest backward compatibility, CI regression suite, self-service adoption metrics

---

### Journey 7: Ravi Deploys and Monitors the Shell (Platform Operations)

**Opening Scene:** Ravi is the DevOps engineer responsible for the Hexalith production environment. FrontShell is a new addition to his Kubernetes cluster, sitting alongside the existing .NET microservices, DAPR sidecars, and EventStore. He needs to deploy the shell, configure it for production, and monitor it.

**Rising Action:** The shell is a static React application — build output is a set of JS/CSS/HTML files. Ravi deploys it as a containerized Nginx server behind the existing ingress controller. Auth is handled by the shell's integration with the organization's identity provider — same one the .NET services use. DAPR service invocation routes API calls to the correct microservice pods. Ravi doesn't need to understand CQRS or modules — it's a web app that makes API calls.

He sets up monitoring: container health checks on the Nginx pod, frontend error tracking via the shell's built-in error boundary telemetry, and API latency dashboards on the EventStore CommandApi and projection endpoints.

**Climax:** At 3 AM, the Orders microservice pod crashes and restarts. Ravi's alerts fire for the Orders projection API. He checks the shell — Elena's application shows "Orders data temporarily unavailable" in the Orders section. Tenants, Inventory, Shipping all work normally. The module error boundary contained the blast radius. The Orders pod recovers in 90 seconds. Elena never filed a ticket.

**Resolution:** Ravi adds the shell to his standard deployment pipeline — it's just another container. Module updates come through the shell's build pipeline, not Ravi's infrastructure pipeline. New modules don't require infrastructure changes — they're code additions to the shell build, not new services. Ravi's operational burden didn't increase.

**Emotional Arc:** Wariness ("another thing to deploy") → Relief ("it's just Nginx") → Confidence ("error boundaries work") → Indifference ("it runs itself")

**Capabilities Revealed:** Static deployment model, container-based hosting, identity provider integration, DAPR routing, error boundary telemetry, partial failure isolation, zero-infrastructure-change module additions

---

### Journey 8: Quality Gates Before Release (Testing & QA Workflow)

**Opening Scene:** The MVP milestone is approaching. Jerome has the Tenants module and an AI-generated Inventory module running through the shell. Both pass their Playwright component tests. But passing tests isn't enough — Jerome needs to know whether the platform is *ready to release*. He invokes the quality gate workflow.

**Rising Action:** Jerome starts with the Test Design workflow at epic scope. It analyzes the MVP's risk profile: the CQRS integration layer is API-heavy (more integration tests needed), while the shell composition is UI-heavy (more E2E tests needed). The workflow produces a risk-calibrated test strategy that adjusts the test pyramid — 50% unit / 35% integration / 15% E2E for the CQRS package, 60% unit / 15% integration / 25% E2E for the shell. Each acceptance criterion gets a priority classification (P0-P3).

He then runs the ATDD cycle for a new Tenants story. Before writing any implementation code, the workflow generates failing acceptance tests from the story specification. The tests define the exact expected behavior — no hallucinations, no over-engineering. Jerome implements the feature to make the tests pass. The Test Review workflow validates that the new tests follow quality standards: deterministic (no hard waits), isolated (self-cleaning, parallel-safe), explicit (assertions in test body), focused (< 300 lines), and fast (< 1.5 minutes).

**Climax:** Release gate time. Jerome runs the Traceability workflow — it builds a bidirectional matrix mapping every acceptance criterion to its tests. Two criteria are unmapped: a tenant deletion edge case and a projection refresh race condition. The workflow flags them and recommends CONCERNS status. Jerome writes the missing tests. He re-runs the trace — 100% coverage. The NFR assessment checks security (auth tests pass), performance (projection load < 500ms), and reliability (error boundary tests pass). The gate decision: PASS.

Meanwhile, the consumer contract tests verify that the frontend's expectations of the CommandApi and projection APIs match the backend's actual behavior. The `can-i-deploy` check confirms compatibility. Jerome can deploy with confidence — not a subjective "feels ready" but a data-driven PASS backed by traceability, coverage, and risk scoring.

**Resolution:** The CI pipeline runs three stages automatically: smoke tests on every commit (< 5 minutes), regression tests on every PR (< 30 minutes), and the full release gate before deployment. The flakiness rate is 0.8% — well under the 2% threshold. Every defect is caught in CI within minutes of the commit, not days later in production. The quality operating model is working.

**Emotional Arc:** Uncertainty ("are we ready?") → Discipline ("the workflow found gaps") → Confidence ("data says PASS") → Trust ("this is how we release every time")

**Capabilities Revealed:** Test Design workflow, ATDD cycle, Test Review, traceability matrix, NFR assessment, quality gate decision (PASS/CONCERNS/FAIL), contract testing, CI pipeline stages, risk-calibrated test pyramid, test flakiness tracking

---

### Journey Requirements Summary

| Journey | Persona | Key Capabilities Revealed |
|---------|---------|--------------------------|
| **Lucas Happy Path** | Module Developer | Scaffold CLI, CQRS hooks, component library, dev host, build-time validation, test fixtures |
| **Lucas Edge Case** | Module Developer | Module-internal freedom, CI boundary enforcement, projection refresh, component extension process |
| **Claude Generation** | AI | Platform knowledge bundle, prompt template, AI validation pipeline, same-gates principle |
| **Elena's Tuesday** | End User | Unified auth, consistent navigation, component library, error boundaries, partial failure tolerance |
| **Priya Evaluates** | Team Lead | Self-service evaluation, migration path, infrastructure elimination, scaffold as POC |
| **Jerome's Team** | Shell Team | API evolution protocol, deprecation policy, backward compatibility, self-service metrics |
| **Ravi Deploys** | DevOps | Static deployment, container hosting, error telemetry, zero-infra module additions |
| **Quality Gates** | Shell Team (Jerome) | ATDD cycle, test pyramid, traceability matrix, NFR assessment, quality gate decision, contract testing, CI stages |

**Cross-Journey Capability Map:**

| Capability | Lucas | Claude | Elena | Priya | Jerome | Ravi | QA |
|-----------|:-----:|:------:|:-----:|:-----:|:------:|:----:|:--:|
| Scaffold CLI | x | | | x | | | |
| CQRS hooks | x | x | | | | | |
| Component library | x | x | x | | | | |
| Build-time validation | x | x | | x | x | | |
| CI boundary enforcement | x | x | | | | | |
| Shell dev host | x | | | x | | | |
| Error boundaries | | | x | | | x | |
| Platform knowledge bundle | | x | | | x | | |
| Auth management | | | x | | | x | |
| Deprecation protocol | | | | | x | | |
| Static deployment | | | | | | x | |
| ATDD workflow | | | | | | | x |
| Traceability matrix | | | | | | | x |
| Quality gate decision | | | | | | | x |
| Contract testing | | | | | | | x |
| CI pipeline stages | | | | | | | x |

## Innovation & Novel Patterns

The user journeys above reveal *what* FrontShell enables. This section analyzes *why* those capabilities are novel — what architectural decisions produce them and why competitors cannot easily replicate them.

### The Innovation in One Sentence

FrontShell is the only micro-frontend platform that understands domain architecture — which is why developers ship in minutes, AI generates production modules, and users see one seamless app.

### The Root Innovation: Domain-Native Micro-Frontend Infrastructure

Developers ship their first working page in under 30 minutes with zero infrastructure code. AI generates complete production-quality modules from a domain description. Bounded context isolation is enforced automatically, not by convention. All three outcomes trace to one foundational decision: FrontShell is domain-native.

Existing approaches to frontend architecture apply DDD thinking to *code organization* — folder structure (Feature-Sliced Design), monorepo boundaries (Angular Architects / Nx), or team alignment (AWS micro-frontend guidance). FrontShell applies DDD to *infrastructure*: `useCommand` and `useProjection` hooks connected to an event-sourced backend, a typed manifest contract that maps 1:1 to DDD's Published Language, and build-pipeline enforcement of bounded context isolation. This isn't an incremental improvement to micro-frontends — it's a category redefinition from composition infrastructure to domain integration infrastructure.

### What Domain-Nativeness Produces

Two emergent advantages flow directly from the domain-native foundation:

**AI-Generability as Structural Flywheel.** The typed contracts, CQRS hooks, and two-package boundary that enforce bounded context isolation are the same artifacts LLMs consume to generate complete, production-quality modules. The more disciplined the architecture, the better AI performs — turning DDD's ceremony tax into a compounding productivity multiplier.

The flywheel cycle: scaffold module → define domain types → AI generates components using CQRS hooks and `@hexalith/ui` → module passes all quality gates → pattern library grows → next generation is more accurate → repeat.

Measurable after 3+ generated modules — track generation success rate trend over time to validate compounding. The flywheel is structurally hard to replicate: the manifest contract, hook system, and bounded context enforcement must be designed together from the foundation. The moat is architectural, not feature-based.

**Enforceable Bounded Context Isolation at the Frontend Layer.** Backend DDD enforces aggregate boundaries through domain events and persistence. Frontend DDD had no equivalent — until FrontShell. The two-package limit (`@hexalith/shell-api`, `@hexalith/cqrs-client`), build-time manifest validation, and CI boundary scanning enforce at the frontend what DDD promises at the architectural level. The enforcement mechanism (CI pipelines, type checking) isn't novel; the *domain of enforcement* — frontend bounded context isolation — is. The manifest constrains the *shell interface*, not module internals. Teams retain full React ecosystem freedom within their module boundary. Enforcement shapes the integration surface; creativity lives inside it.

### What Teams Actually Do Today (Competitive Context)

FrontShell's real competitor isn't Module Federation or single-spa — it's the status quo: each microservice team building their own custom React application.

| Current Reality | What's Missing | FrontShell Provides |
|----------------|---------------|-------------------|
| Each team builds custom auth token management | Shared, secure authentication | Shell-managed auth — modules write zero security code |
| Each team wires CQRS transport manually | Domain-aware frontend hooks | `useCommand`, `useProjection` — connected to EventStore |
| Each team builds routing and layout | Consistent navigation and structure | Manifest-driven routes, unified sidebar, per-module error boundaries |
| Each team maintains independent test infrastructure | Shared test patterns and fixtures | `MockCommandBus`, `MockQueryBus`, base Playwright fixtures |
| No cross-team visual consistency | Enforced design system | `@hexalith/ui` — opinionated component library |
| No boundary enforcement | Organic coupling grows over time | CI-enforced two-package limit — build fails on violation |

### Innovation Risks & Validation

| Innovation Claim | Risk | Validation | Metric | Timeline |
|-----------------|------|-----------|--------|----------|
| Domain-native eliminates infrastructure | "Domain-native" alienates generalists | Developer ships page without auth/routing/CQRS plumbing | Zero infrastructure lines; ≤ 30 min to first page — lead messaging with outcomes, not architecture terminology | MVP (3 months) |
| AI-generability flywheel compounds | Flywheel is unfalsifiable | LLM generation success rate improves with each module | 8/10 baseline; trending upward after 3+ modules — kill the claim if it doesn't compound | MVP + ongoing tracking |
| Enforcement holds without rigidity | Enforcement experienced as rigidity | Boundary violation caught; module internals unconstrained | CI rejects cross-module imports; zero complaints about internal restrictions — document escape hatches clearly | MVP (3 months) |
| Beachhead market strategy | Scope perceived as niche | Internal teams adopt without resistance; architecture patterns prove generalizable | Mandatory adoption for all new microservice UIs; evaluate external applicability at 12 months | 3-12 months |
| AI generation remains an advantage | AI commoditizes — all frameworks become equally generatable | Platform runtime value (auth, routing, consistency, enforcement) remains regardless of generation method | Generation becomes one path among many; platform value measured independently | Ongoing |

## Developer Platform Specific Requirements

FrontShell is classified as a developer platform — its primary product is the developer experience. The innovation analysis above establishes *why* the platform is differentiated; this section specifies *how* the platform is structured, distributed, and documented.

### Project-Type Overview

FrontShell is a developer platform where the primary "product" is the developer experience of building and shipping domain UI modules. The platform surface area includes three foundation packages (`@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui`), a scaffold CLI, a shell dev host, and comprehensive documentation. All artifacts are TypeScript-first with no JavaScript fallback.

### Language & Runtime Matrix

| Requirement | Specification |
|------------|--------------|
| Module language | TypeScript (mandatory — JavaScript not accepted) |
| Shell language | TypeScript + React |
| Build tooling | Vite |
| UI framework | React (version pinned by shell — modules must match) |
| Type strictness | `strict: true` in all tsconfig — no `any` escape hatches in shell packages |

**Rationale:** TypeScript is mandatory because the entire platform value proposition depends on typed contracts — the manifest, CQRS hooks, and component props. JavaScript modules would undermine build-time validation, AI-generability, and bounded context enforcement. Reliability is non-negotiable.

### Module Distribution Model

Modules are distributed as **git submodules** consumed by the shell repository. This is a build-time composition model:

| Aspect | Model |
|--------|-------|
| Module hosting | Each module lives in its own git repository |
| Shell integration | Shell repo adds modules as git submodules |
| Build composition | Shell build pulls all submodules and compiles everything together |
| Versioning | Module repos use git tags/branches; shell repo pins submodule commits |
| CI trigger | Shell CI runs on submodule updates — validates manifests, runs tests, builds |

**Why git submodules:** Submodules enforce the same isolation the architecture demands. Each module team owns their repo. The shell team owns composition. The model maps directly to bounded contexts — one repo per domain, shell composes at build time. Alternatives considered:

| Distribution Model | Verdict | Trade-off |
|---|---|---|
| **Git submodules** | ✅ Chosen | Sharp git UX (mitigated by CLI wrappers), but maps perfectly to bounded contexts |
| **NPM packages** | Rejected | Adds registry infrastructure and version resolution complexity |
| **Monorepo** | Rejected | Undermines bounded context isolation — all modules in one repo invites cross-module coupling |
| **Git subtrees** | Rejected | Fewer sharp edges but harder to maintain independent module repos |

**Local Development Model:**
The developer works in their module's own git repo. The shell dev host is a minimal version of the real shell — it uses the same module discovery mechanism (reads the module's manifest, registers routes, renders in shell layout) with mock providers for auth and tenant context. This ensures local development behavior matches production behavior.

```
developer workflow:
  1. clone module repo (or scaffold new one)
  2. run shell dev host pointing at local module directory
  3. develop with hot-reload, mock auth, mock CQRS
  4. push to module repo
  5. shell repo updates submodule reference → CI validates → build deploys
```

### Shell CLI Commands (MVP)

Git submodules have known DX pain points (detached HEAD, manual update, clone without init). The shell CLI wraps these operations to maintain the platform's zero-infrastructure-knowledge promise:

| Command | Purpose | What it wraps |
|---------|---------|--------------|
| `hexalith-shell add-module <repo-url>` | Onboarding — adds a module to the shell | `git submodule add` + updates shell config + validates manifest |
| `hexalith-shell sync` | Daily work — updates all modules to pinned commits | `git submodule update --init --recursive` + validation |
| `hexalith-shell dev <module-path>` | Local development — launches dev host with module mounted | Starts minimal shell with mock providers, hot-reload, module discovery |

These three commands cover the full developer journey: onboard a module, stay in sync, develop locally.

### API Surface

The platform exposes three package APIs that form the developer contract:

| Package | API Surface | Stability Contract |
|---------|------------|-----------|
| `@hexalith/shell-api` | `ModuleManifest` type, `ShellProvider` (auth context, tenant context) | Strict semver — type-level contract; breakage caught by compiler |
| `@hexalith/cqrs-client` | `useCommand<T>()`, `useProjection<T>()`, `ICommandBus`, `IQueryBus`, mock implementations | Strict semver — type-level contract; breakage caught by compiler |
| `@hexalith/ui` | Component library (Table, Form, DetailView, Button, Input, Select, Modal, Notification, Sidebar, Toolbar, PageLayout, LoadingState, ErrorBoundary) | Semver with **visual regression testing** — visual breakage is not caught by the compiler; requires automated visual diff |

**Module manifest** is the sole integration contract between a module and the shell. It declares routes, navigation items, and module metadata. The manifest type is validated at build time — invalid manifests fail the shell build.

### Developer Tooling

| Tool | Purpose | MVP Scope |
|------|---------|-----------|
| `create-hexalith-module` CLI | Primary developer entry point — scaffolds new module with working example | Scaffold with CQRS hooks, Playwright test, manifest, dev host config |
| Shell dev host | Local development without full infrastructure | Minimal shell using same module discovery as production, mock auth, hot-reload |
| `hexalith-shell` CLI | Shell-side module management | `add-module`, `sync`, `dev` commands wrapping git submodule operations |
| Base test fixtures | Testing support for CQRS and shell context | `MockCommandBus`, `MockQueryBus`, `mockAuth` — shipped in package `/fixtures` exports |

IDE-specific integration (VS Code extensions, snippets) is a future consideration. The CLI is the primary entry point; TypeScript's built-in IntelliSense provides API discoverability through the typed packages.

### Documentation Strategy

**Primary documentation artifact:** A comprehensive, frontend-focused guide on creating microservice-based applications using Hexalith EventStore and FrontShell. The guide is written from the module developer's perspective — backend architecture (EventStore, DAPR, .NET) is provided as context where needed, not as curriculum.

| Section | Coverage |
|---------|----------|
| Architecture overview | How FrontShell fits into the Hexalith ecosystem — frontend developer's perspective |
| Getting Started | Scaffold → modify → test → ship (one-page quick path) |
| CQRS for frontend developers | What commands are, how to send them; what projections are, how to query them — no EventStore internals |
| Module development | Complete module lifecycle — scaffold, develop, test, publish via git submodule |
| Component library | `@hexalith/ui` component catalog with prop tables and examples |
| Testing guide | Playwright CT patterns, mock fixtures, error handling tests, CI integration |
| Git submodule workflow | FrontShell-specific cheat sheet for submodule operations |
| AI module generation | Platform knowledge bundle usage, prompt templates, validation pipeline |
| Shell team guide | Manifest evolution, deprecation protocol, platform maintenance |

**Secondary documentation:**
- Platform knowledge bundle (JSON Schema, hook API, component catalog) — serves both human reference and AI consumption
- Tenants reference module — living documentation through working code

### Reference Module Strategy

The **Hexalith.Tenants** module serves as the primary reference implementation:

| Role | How Tenants Serves It |
|------|----------------------|
| Onboarding example | Simple domain that demonstrates most platform features without domain complexity |
| Pattern reference | Shows canonical patterns for list views, detail views, create forms, CQRS hooks |
| Test reference — happy path | Playwright CT tests for list → detail → create flow |
| Test reference — error handling | Playwright CT test demonstrating error boundary behavior when projection fails |
| Test reference — mock fixtures | Tests using `MockCommandBus` rejecting a command to demonstrate failure handling |
| AI generation baseline | Human-authored module that AI-generated modules are compared against |
| Living documentation | Code is always up-to-date with current platform APIs |

No separate "hello world" module is needed — Tenants is simple enough to serve as both the minimal example and the comprehensive reference. The reference module *is* the testing curriculum: developers learn testing patterns by reading Tenants tests.

### Migration Path

Teams with existing custom React applications can migrate to FrontShell incrementally — one module at a time, without rewriting domain components.

**Migration Scope:**

| What Gets Deleted | What Gets Kept | What Gets Added |
|---|---|---|
| Auth token management (~400 lines) | Domain React components | `@hexalith/ui` layout wrappers |
| API client wiring (~200 lines) | Domain TypeScript types | CQRS hook calls (`useCommand`, `useProjection`) |
| Routing configuration (~150 lines) | Business logic | Module manifest |
| Custom loading/error handling | Domain-specific tests | Playwright CT fixtures |

**Migration Sequence:**

1. **Scaffold** — Run `create-hexalith-module` for the target domain
2. **Move domain components** — Copy existing React components into the module boundary
3. **Replace infrastructure** — Swap custom API clients with `useCommand`/`useProjection` hooks; wrap layouts in `@hexalith/ui` components
4. **Delete infrastructure code** — Remove auth management, routing config, API client wiring
5. **Validate** — Run module through CI pipeline (manifest validation, test coverage gate, boundary enforcement)
6. **Integrate** — Add module as git submodule to shell repo

**Evaluation criteria for migration candidates:**
- Module has a CQRS backend on Hexalith.EventStore (required)
- Module's domain components are separable from its infrastructure code (strongly preferred)
- Module team has capacity for ~1 week of migration effort per module

**Migration is not required for MVP.** The Tenants reference module is built greenfield. Migration guidance becomes actionable when existing teams adopt FrontShell in months 3-6.

### Implementation Considerations

**Git submodule workflow:**
- Shell repo CI must handle submodule updates gracefully — fetch, validate, build
- The `hexalith-shell` CLI commands abstract submodule complexity for daily operations
- The documentation guide includes a dedicated git submodule workflow section
- New developer onboarding: `git clone --recurse-submodules` documented as the default clone command

**TypeScript strictness:**
- All three foundation packages ship with complete type definitions — no `@types` needed
- Module scaffold includes pre-configured `tsconfig.json` with strict mode
- Build-time manifest validation leverages TypeScript's type system directly — no separate schema validator needed

## Project Scoping & Phased Development

The platform requirements above define *what* to build; this section defines *when* and *in what order* — shaped by a solo-developer resource constraint and risk-first sequencing.

### MVP Strategy & Philosophy

**MVP Approach:** Prove-both platform MVP — the minimum that demonstrates 30-minute developer onboarding *and* a production-deployable module through the full pipeline (scaffold → develop → test → git submodule → CI → deploy). Both the manual developer path and the AI generation path are validated in MVP.

**Resource Reality:** Solo developer (Jerome), partial time. This constraint shapes every scoping decision — the MVP must be ruthlessly lean on polish while uncompromising on the platform's existential claims (domain-native CQRS hooks, typed manifest enforcement, AI-generability).

**Version Strategy:** All shell packages ship as `0.x` during MVP development. Version `1.0` is the stability promise — released only when the MVP is complete and validated. Early adopter teams are design partners, not customers; `0.x` semver signals that breaking changes are expected.

### MVP Feature Set (Phase 1 — 3 Months)

**Core User Journeys Supported:**
- Lucas's happy path (Journey 1) — scaffold to working page in ≤ 30 minutes
- Claude generates a module (Journey 3) — AI-generated module passes all quality gates
- Elena's Tuesday (Journey 4) — seamless cross-module experience (validated through Tenants + one AI-generated module)

**Must-Have Capabilities:**

| Capability | Scope | Risk Level |
|-----------|-------|-----------|
| `@hexalith/cqrs-client` | `useCommand<T>()` — HTTP POST to EventStore REST CommandApi; `useProjection<T>()` — HTTP GET for initial load + configurable polling for data freshness; `ICommandBus`/`IQueryBus` interfaces; DAPR HTTP implementations; mock implementations for testing; hook exposes connection state (`connected`, `reconnecting`, `disconnected`). *(Phase 2: SignalR push upgrade — same hook API, no module code changes)* | **High** — existential differentiator; CQRS abstraction + token lifecycle is the most critical integration |
| `@hexalith/shell-api` | `ModuleManifest` type (routes + navigation); `ShellProvider` (auth context, tenant context) | Medium — typed contract, well-scoped |
| `@hexalith/ui` | Quality over quantity: Table, Form, Button, Input, Select, PageLayout, LoadingState, ErrorBoundary — polished. DetailView added when Tenants needs it. Ship fewer polished components over more rough ones. | Medium — opinionated components, not novel |
| Shell application | React + Vite + react-router-dom; module registry; Keycloak authentication with token management and tenant context; fixed layout with sidebar; per-module error boundaries; auth-level error boundary (Keycloak unreachable → diagnostic message, not spinner); build-time manifest type validation + semantic validation (unique routes, valid navigation) | **High** — Keycloak integration + token injection into HTTP connections |
| `create-hexalith-module` CLI | Scaffolds module with working example, CQRS hooks, Playwright test, manifest | Low — template generation |
| CI scaffold smoke test | CI runs scaffold CLI → compiles output → runs scaffolded test → green. If this test fails, the platform is broken. | Low — but critical canary |
| Keycloak + SignalR integration test *(Phase 2)* | Dedicated test: force token expiry → verify SignalR reconnects with fresh token via `accessTokenFactory` calling `keycloak.updateToken()` | **High** — subtle failure mode where both libraries are fine individually but the interaction breaks. *(Deferred to Phase 2 with SignalR integration)* |
| Tenants reference module | List, detail, create form using CQRS hooks and `@hexalith/ui`; happy-path tests + error-handling tests + mock fixture demonstration | Medium — proves the platform |
| AI module generation | Platform knowledge bundle (manifest JSON Schema, hook API, component catalog); prompt template; validation through existing CI; 8/10 success rate benchmark (fallback: 6/10 if needed) | Medium — start testing in Week 7-8, not at the end |
| AI-generated reference module | Second module generated entirely by LLM, passes all quality gates | Medium — depends on platform knowledge bundle quality |
| Git submodule CI pipeline | Shell CI fetches submodules, validates manifests, runs tests, builds | Low — standard CI |
| Build-time manifest validation | TypeScript type checking + semantic validation (unique routes, valid nav) | Low — TypeScript does the work |
| Getting Started guide | One-page quick path: scaffold → modify → test → ship | Low — documentation |

**Ports-and-Adapters Validation Gate:**
After switching from `MockCommandBus`/`MockQueryBus` to real `DaprCommandBus`/`DaprQueryBus` implementations, all Tenants module tests must pass *without modifying any module code*. If module code changes are required, the abstraction is broken — fix the interfaces, not the modules. This is an explicit go/no-go gate.

**Deferred from MVP (moved to Phase 1.5 or Phase 2):**

| Feature | Rationale | Target |
|---------|-----------|--------|
| `hexalith-shell` CLI commands (`add-module`, `sync`, `dev`) | DX polish — manual git submodule commands documented instead | Phase 1.5 |
| Dedicated shell dev host | Use real shell with Keycloak dev realm + local EventStore during MVP; dedicated mock dev host is polish | Phase 1.5 |
| Full documentation guide | Start with Getting Started; comprehensive guide grows with platform | Phase 2 |
| `@hexalith/ui` additional components (Modal, Notification, Sidebar, Toolbar) | Add as module needs arise; don't build speculatively | Rolling |

### Build Sequence (Risk-First, Mock-First)

The build sequence is designed so Weeks 1-6 require **zero backend infrastructure** — the entire DX story is proven with mocks before integrating real backends. This is the safest path for a solo developer.

**Weeks 1-2: Interfaces First (zero backend dependency)**
- `ICommandBus`/`IQueryBus` interfaces
- `MockCommandBus`/`MockQueryBus` implementations (including simulated push events)
- `ModuleManifest` type definition
- `ShellProvider` type definition (auth context shape, tenant context shape)
- *TEA: Scaffold test framework (TF workflow) — Playwright config, merged-fixtures pattern, data factory conventions*

**Weeks 3-4: Scaffold + Reference Module (still no real backend)**
- `create-hexalith-module` CLI (generates module using mock implementations)
- Tenants module scaffold using mocks
- Playwright CT tests using `MockCommandBus`/`MockQueryBus`
- `@hexalith/ui` — first components (Table, Button, Input, PageLayout)
- CI smoke test: scaffold → compile → test → green
- *TEA: First ATDD cycle (AT workflow) — generate failing acceptance tests for Tenants first story before implementation*

**Weeks 5-6: Shell Application (still mock auth)**
- React + Vite + react-router-dom shell
- Module registry (imports Tenants manifest, registers routes)
- Fixed layout with sidebar
- Simple error boundary per module
- Build-time manifest type validation
- Mock auth provider (hardcoded user, hardcoded tenant)

**Weeks 7-8: Keycloak Integration (Risk #2 — real auth)**
- `keycloak-js` integration in `ShellProvider`
- Token management (login, refresh, expiry, logout)
- Tenant context from token claims
- CORS configuration (budget extra time — Keycloak dev realm setup is historically the biggest unexpected time sink)
- Dev realm with test users
- HTTP token injection for CQRS hooks
- Auth-level error boundary (Keycloak unreachable → diagnostic message)
- *Start AI generation testing* — try generating a module against current scaffold + mocks + UI

**Weeks 9-10: Real CQRS Implementation (Risk #1 — real backend)**
- `DaprCommandBus` — HTTP POST to EventStore CommandApi
- `DaprQueryBus` — HTTP GET to projection APIs
- Token injection from Keycloak into HTTP headers
- `useCommand<T>()` hook wrapping `DaprCommandBus`
- `useProjection<T>()` hook wrapping `DaprQueryBus` (polling initially)
- Tenants module switched from mocks to real implementations
- **Ports-and-adapters validation gate: Tenants tests pass unchanged**
- *TEA: Consumer contract tests for CommandApi and projection API boundaries*

**Weeks 10-11: Polling Hardening + AI Generation + Polish**
- `useProjection<T>()` polling edge cases: error retry, backoff, stale detection
- Connection state indicator in shell UI (polling healthy/degraded)
- AI prompt template
- Generate second reference module via LLM
- Validate against CI pipeline (8/10 benchmark)
- `@hexalith/ui` remaining MVP components (Form, DetailView, Select, LoadingState, ErrorBoundary)
- Tenants error handling tests + mock fixture demonstrations
- Getting Started guide

**Week 12-13: Integration + Hardening**
- Git submodule pipeline (Tenants + AI module in shell)
- Full end-to-end: login → navigate → send command → see projection update via polling
- *TEA: Test Design (TD) at epic scope — risk assessment and coverage strategy for MVP*
- *TEA: Traceability matrix (TR) + NFR assessment (NR) — release gate decision for MVP*
- *TEA: CI pipeline scaffold (CI workflow) — 3-stage execution (smoke/regression/gate)*
- Edge case tests (token expiry during use, polling failure recovery, module error boundary)
- MVP release — packages move from `0.x` toward `1.0` candidacy

### Technical Risk Mitigation

**Risk #1: CQRS Hooks (High)**

| Aspect | Risk | Mitigation |
|--------|------|-----------|
| `useCommand` | HTTP POST to EventStore CommandApi — relatively straightforward | Start here. Prove command flow works before tackling projections. |
| `useProjection` initial load | HTTP GET to microservice projection APIs — straightforward | Implement alongside `useCommand` |
| `useProjection` polling | Configurable refresh interval, error retry, stale detection | Polling is well-understood; main risk is excessive server load with aggressive intervals. Default to conservative interval (5s), allow per-hook override. |
| Token injection | Keycloak access token must be injected into HTTP headers | Shell's `ShellProvider` manages token; hooks read from context. Single source of truth. |
| Testing mocks | `MockCommandBus` and `MockQueryBus` must simulate sync responses and polling cycles | Define mock interface early — this shapes the entire test story |
| SignalR push notifications | SignalR connection lifecycle (connect, reconnect, auth token injection, connection loss) | Use `@microsoft/signalr` — mature library (~30KB gzipped). Single multiplexed connection to `/hubs/projection-changes`. Auto-reconnect with exponential backoff. Dedicated Keycloak + SignalR token integration test required. |

**Risk #2: Keycloak Authentication (High)**

| Aspect | Risk | Mitigation |
|--------|------|-----------|
| Keycloak JS integration | Library maturity is good, but React lifecycle integration requires care | Use `keycloak-js` directly with custom React provider in `ShellProvider` |
| Token refresh | Silent token refresh must work without disrupting user session | `keycloak-js` handles this natively with `onTokenExpired` callback |
| Tenant context | Multi-tenant auth — tenant from token claims | Extract tenant from Keycloak token claims; shell-managed tenant selector as fallback |
| SignalR + Keycloak | SignalR needs access token for hub authentication | Pass token via `accessTokenFactory`; refresh token before reconnect |
| Dev realm setup | CORS, redirect URIs, token claim mapping — historically the biggest unexpected time sink | Budget extra time in Weeks 7-8; document every debugging step (becomes Getting Started content) |
| Keycloak unreachable | Auth failure = total platform failure | Auth-level error boundary: diagnostic message, not infinite spinner |

### Resource Risk & Contingency

**Solo developer, partial time — contingency plan:**

| Scenario | Response |
|----------|----------|
| 3-month timeline slips | Core platform (CQRS hooks + auth + shell + manifest validation) is the non-negotiable minimum. AI generation track can slide to month 4 without killing the platform story. |
| CQRS + SignalR integration harder than expected | Ship with polling-only `useProjection` first. Add SignalR as a fast-follow. Polling is functional; SignalR is UX improvement. |
| Keycloak integration harder than expected | Use a simple JWT validation middleware first. Full Keycloak flow can be hardened iteratively. |
| AI generation doesn't hit 8/10 | Lower benchmark to 6/10 for MVP. Improve with more modules and better knowledge bundle. The manual path is the primary proof. |
| Bus factor: 1 | All configuration in git. CI pipeline is the source of truth for "does this work?" Zero local-only state. Jerome can clone on a new machine and be productive within an hour. |

### Post-MVP Roadmap

**Phase 1.5 (Month 4): DX Polish**
- `hexalith-shell` CLI commands (`add-module`, `sync`, `dev`)
- Dedicated shell dev host with mock providers
- Shell dev host uses same module discovery as production shell

**Phase 2 (Months 4-6): Platform Maturity**
- Contribution points and named slots (sidebar, toolbar, statusbar)
- Module lifecycle state machine (activate, deactivate, health/readiness)
- One-way shell signaling (typed broadcasts: `auth:changed`, `theme:changed`, `tenant:switched`)
- Layout reconciliation engine
- Ongoing CLI generators (add command/query/component within existing modules)
- OpenAPI codegen pipeline (automated types from .NET contracts)
- Visual regression testing suite
- Comprehensive documentation guide

**Phase 3 (Months 7-9): Scale & Ecosystem**
- ESLint dependency surface enforcement
- Advanced manifest features (capability declarations, activation events)
- Module health monitoring (shell-level observability)
- Performance optimization (tree-shaking, lazy manifest loading for 20+ modules)

**Phase 4 (Months 10-12): Innovation**
- Advanced LLM generation (complex multi-component modules)
- Multi-component-library support
- Cross-module communication patterns (if validated by use cases)

## Functional Requirements

Each functional requirement traces to capabilities revealed in the [User Journeys](#user-journeys) and scoped in [Product Scope](#product-scope) and [Project Scoping](#project-scoping--phased-development). Requirements are capabilities, not implementation — they define *what* the system enables, measured by testable criteria.

### Module Development

- **FR1:** Module developer can scaffold a new module with a single CLI command that produces a complete, runnable example
- **FR2:** Module developer can run a scaffolded module with working example code immediately without configuration
- **FR3:** Module developer can run scaffolded tests that pass without modification
- **FR4:** Module developer can define module routes and navigation items through a typed manifest
- **FR5:** Module developer can use any React library or pattern within their module boundary without restriction
- **FR6:** Module developer can develop their module independently without cloning the full shell repository
- **FR7:** Module developer defines their own domain types (command shapes, projection view models) within their module boundary
- **FR8:** Module developer can generate new commands, queries, and components within an existing module using CLI generators *(Phase 2)*

### CQRS Integration

- **FR9:** Module developer can send commands to the backend without writing transport, serialization, or authentication code
- **FR10:** Module developer can query projection data without writing transport code
- **FR11:** Module developer can receive fresh projection data via SignalR push notifications and configurable polling without managing refresh lifecycle — SignalR provides real-time invalidation signals, polling serves as fallback and periodic refresh; same hook API regardless of transport
- **FR12:** Module developer can observe projection data connection state (connected, reconnecting, disconnected)
- **FR13:** Module developer can rely on SignalR push notifications as the primary data freshness mechanism, with automatic polling as fallback — the query hook API is transport-agnostic
- **FR14:** Module developer can test command and projection interactions using provided mock implementations
- **FR15:** Module developer can simulate projection update events in tests using mock implementations
- **FR16:** Module developer can access command execution results (success, validation errors, failures) to provide user feedback
- **FR17:** Module developer can configure projection refresh behavior (interval, on-demand, or event-triggered via SignalR)

### Shell Composition

- **FR18:** Shell discovers and registers modules from their typed manifests at build time
- **FR19:** Shell provides unified navigation across all registered modules
- **FR20:** Shell provides a consistent page layout (sidebar, main content area, top bar) for all modules
- **FR21:** Shell isolates module failures so one module's error does not affect other modules
- **FR22:** Shell displays contextual error messages when a module or backend service is unavailable
- **FR23:** Shell validates manifests at build time — type errors and semantic errors (duplicate routes, invalid navigation) prevent the build
- **FR24:** CI detects and rejects cross-module dependencies — zero imports between modules allowed
- **FR25:** End user can retry a failed module operation without leaving the current page
- **FR26:** End user can switch between modules without losing navigation and filter state
- **FR27:** End user can see an indicator when projection data freshness is degraded (polling failures or elevated latency)
- **FR28:** Shell validates that registered modules render successfully at runtime, with fallback to error boundary if loading fails
- **FR29:** Shell team can add a new module to the shell by adding its repository reference — module routes and navigation are automatically registered from the manifest

### Authentication & Multi-Tenancy

- **FR30:** End user can authenticate through the organization's identity provider
- **FR31:** Shell manages authentication tokens (acquisition, refresh, expiry) without module involvement
- **FR32:** Shell provides tenant context to all modules
- **FR33:** Module developer can access authenticated user information through shell-provided context
- **FR34:** Module developer can access current tenant information through shell-provided context
- **FR35:** System displays a diagnostic message when the authentication service is unreachable
- **FR36:** Authentication tokens are injected into every shell-managed backend request and connection establishment, including on token refresh
- **FR37:** End user can log out and terminate their authenticated session
- **FR38:** End user can switch between tenants they have access to without logging out

### Component Library

- **FR39:** Module developer can build standard UI patterns (tables, forms, detail views, layouts) using provided opinionated components — shell-facing surfaces use the shared component library exclusively; module-internal visualizations may use any React library wrapped in shell layout components
- **FR40:** Module developer can compose page layouts using provided layout components
- **FR41:** Module developer can display standardized UI states (loading, error, empty) using provided components

### AI Module Generation

- **FR42:** Platform provides a machine-readable knowledge bundle describing manifest schema, hook API, and component catalog
- **FR43:** AI agent can generate a module from a domain description that passes all quality gates without manual correction
- **FR44:** AI-generated modules pass the same quality gates as human-authored modules
- **FR45:** Platform provides prompt templates for AI module generation
- **FR46:** Module developer can view validation results when an AI-generated module fails quality gates

### Build & Deployment

- **FR47:** Module developer can publish their module to the shell via git repository integration
- **FR48:** Shell CI pipeline validates module manifests and runs module tests on every build
- **FR49:** Shell build produces a static deployment artifact (HTML/CSS/JS) that can be served by any web server
- **FR50:** Shell can be configured for different environments without code changes (API URLs, auth provider, tenant configuration)
- **FR51:** Shell captures module error events and exposes them for external monitoring integration

### Testing Strategy & Quality Gates

- **FR52:** CI pipeline enforces a test-first workflow: ATDD workflow generates failing acceptance tests from story specifications; CI rejects implementation PRs that lack corresponding acceptance tests
- **FR53:** Test Design workflow produces a risk-calibrated test strategy per epic that adjusts test pyramid ratios (unit/integration/E2E) based on risk profile — API-heavy epics weight integration higher, UI-heavy epics weight E2E higher
- **FR54:** Traceability workflow generates a requirements-to-tests matrix mapping every acceptance criterion to at least one test, with gap identification and quality gate recommendation (PASS/CONCERNS/FAIL)
- **FR55:** Test Review workflow validates test quality against defined standards (deterministic, isolated, explicit assertions, < 300 lines per file, < 1.5 minutes per test)
- **FR56:** Platform supports consumer-driven contract tests at the CQRS boundary (CommandApi and projection API) to verify frontend-backend compatibility independently
- **FR57:** CI pipeline blocks production deployment when contract verification fails

### Developer Documentation

- **FR58:** Module developer can follow a Getting Started guide to scaffold and ship their first module
- **FR59:** Platform provides a frontend-focused guide covering module scaffold, CQRS hooks, component library, testing patterns, git submodule workflow, and AI generation — with backend context where needed

### Phase 2 Capabilities (Growth)

- **FR60:** Module developer can migrate an existing custom React application to FrontShell by replacing infrastructure code (auth, routing, API client) with shell-provided equivalents while keeping domain components unchanged *(Migration — not required for MVP; see Migration Path section)*

- **FR61:** Module developer can contribute UI to named shell slots (sidebar, toolbar, statusbar)
- **FR62:** Shell manages module lifecycle states (activate, deactivate, health/readiness)
- **FR63:** Shell broadcasts typed infrastructure signals to modules (auth changed, theme changed, tenant switched)
- **FR64:** Shell reconciles layout from module declarations and shell configuration
- **FR65:** Platform generates TypeScript types automatically from backend API contracts
- **FR66:** Module developer can verify their module's compatibility with current shell package versions
- **FR67:** Shell team can view platform adoption metrics (modules onboarded, self-service rate, build times)
- **FR68:** End user can search across module boundaries from a unified search interface
- **FR69:** System notifies the end user of command completion or failure even after navigating away from the originating module
- **FR70:** Shell exposes health status for monitoring
- **FR71:** Shell team can remove a module from the shell without affecting other modules
- **FR72:** Module developer can customize component library theming within shell-defined constraints
- **FR73:** Shell team can deprecate shell package APIs with automated warnings to affected modules

## Non-Functional Requirements

### Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| **Module page load** (navigation between modules) | < 1 second | Time from route change to first meaningful paint, measured with Lighthouse CI |
| **`useProjection` initial data** | < 500ms | Time from hook mount to data available in component (excluding network latency to backend) |
| **`useCommand` round-trip** | < 2 seconds | Time from command dispatch to confirmation callback (includes backend processing) |
| **Dev server hot-reload** | < 2 seconds | Time from file save to updated UI in browser during local development |
| **Build time** | ≤ 90 seconds with 10 modules (MVP); ≤ 60 seconds with 20 modules (Phase 2 — via lazy loading and tree-shaking optimization) | CI tracks build duration per commit; alert on > 20% regression or exceeding ceiling |
| **Shell initial load** (cold start) | < 3 seconds | Time from URL entry to interactive shell with navigation rendered (on 4G connection) |

### Security

| Requirement | Target | Enforcement |
|-------------|--------|-------------|
| **Authentication protocol** | OIDC / OAuth2 | Shell manages token lifecycle (acquisition, refresh, revocation). Modules receive auth context via ShellProvider — never handle tokens directly |
| **Module isolation** | Typed manifest boundary (MVP) | Modules interact with shell through `@hexalith/shell-api` only. No direct cross-module imports. Runtime sandboxing deferred to Phase 2 |
| **Tenant isolation** | Shell-enforced tenant context | All CQRS operations scoped to active tenant. Modules cannot override or access other tenants' data. Tenant switch clears all module state |
| **Token propagation** | Automatic, module-transparent | CQRS client injects auth headers automatically. Module code never sees tokens |
| **Data in transit** | TLS 1.2+ required | All API calls (CommandApi, projection queries) over HTTPS. SignalR connections over HTTPS/WSS. |
| **GDPR awareness** | Data minimization in frontend | Shell stores no PII in localStorage/sessionStorage beyond session token. Modules must follow same policy (enforced by code review for MVP, lint rule Phase 2) |

### Scalability (Module Count)

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| **Module count — MVP** | 5 modules without degradation | All performance targets met with 5 registered modules |
| **Module count — Phase 2** | 20 modules without degradation | Build time and runtime performance tracked. Lazy loading and tree-shaking optimized |
| **Manifest registry** | O(n) linear scaling | Adding a module does not degrade other modules' load time beyond linear growth |
| **Bundle size per module** | Tracked, not capped | CI reports per-module bundle size. Alert on > 30% increase per module |

### Accessibility

| Requirement | Target | Enforcement |
|-------------|--------|-------------|
| **WCAG compliance** | Level AA | Progressive — `@hexalith/ui` components must meet AA from v1. Module developers inherit compliance by using the library |
| **Keyboard navigation** | Full support | All interactive elements reachable and operable via keyboard. Shell navigation, module content, and modals included |
| **Screen reader compatibility** | ARIA landmarks and labels | Shell provides semantic structure (navigation, main, aside). `@hexalith/ui` components include proper ARIA attributes |
| **Automated testing** | axe-core in CI | Accessibility audit runs on every PR. Violations block merge |

### Integration

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| **CommandApi compatibility** | Hexalith.EventStore REST API (`POST /api/v1/commands`) | `@hexalith/cqrs-client` DaprCommandBus wraps this endpoint. Contract validated by integration tests |
| **Projection queries** | Per-microservice REST endpoints | Each module's manifest declares its projection API base URL. `useProjection` calls through the configured endpoint |
| **Projection freshness** | SignalR push notifications + ETag-optimized re-query + configurable polling fallback | SignalR hub broadcasts projection change signals; client re-queries with `If-None-Match` ETag for cache-optimized refresh. Polling remains as fallback and for periodic refresh. |
| **Infrastructure abstraction** | DAPR-agnostic at module level | Modules never reference DAPR directly. The ports-and-adapters layer in `@hexalith/cqrs-client` isolates transport |
| **Backend contract types** | Manual TypeScript definitions (MVP) | Modules define their own command/projection types. OpenAPI codegen deferred to Phase 2 |
| **Consumer-driven contract testing** | Frontend-backend API compatibility verified independently | Consumer contract tests define expected CommandApi and projection API interactions. Provider verification runs on backend PR. `can-i-deploy` gate blocks incompatible deployments |

### Reliability

| Requirement | Target | Enforcement |
|-------------|--------|-------------|
| **Availability** | 99.9% (measured at shell level) | Shell infrastructure uptime — modules failing does not count against shell availability |
| **Partial failure tolerance** | Any single module failure contained; shell + remaining modules unaffected | If a module's backend is unavailable, the module shows an error state with retry option. Shell navigation, auth, and all other modules remain fully functional. Validated by Playwright test |
| **Stale data policy** | Error boundary, no stale projections (MVP) | If a projection query fails, show error — don't serve cached stale data. Stale-while-revalidate strategy considered for Phase 2 |
| **Shell crash recovery** | Full page reload fallback | If shell-level error occurs, graceful reload with session preservation (auth token survives) |
| **Ports-and-adapters abstraction** | Zero module code changes on transport switch | Switching CQRS transport implementation requires changes only in `@hexalith/cqrs-client` internals |

### Testing & Quality Gates

| Requirement | Target | Enforcement |
|-------------|--------|-------------|
| **CI pipeline — smoke stage** | < 5 minutes | `@smoke @p0` tagged tests run on every commit. CI alerts on breach |
| **CI pipeline — regression stage** | < 30 minutes | `@regression @p0-p2` tagged tests run on every PR. CI alerts on breach |
| **CI pipeline — release gate stage** | < 60 minutes | Full test suite + traceability matrix + NFR assessment. Runs before production deployment |
| **Test flakiness rate** | < 2% | CI tracks flaky test occurrences per week. Tests exceeding threshold quarantined and fixed |
| **Test quality — determinism** | Zero hard waits, zero conditional flow, zero try-catch for control flow | Code review and test review workflow enforce. No `waitForTimeout()` — use `waitForResponse()` or `waitForSelector()` |
| **Test quality — isolation** | Self-cleaning, parallel-safe, no shared state | Each test creates and cleans its own data via factories. Parallel execution enabled by default |
| **Test quality — focus** | < 300 lines per test file, < 1.5 minutes per test | CI enforces file length lint rule. CI tracks per-test execution time |
| **Quality gate model** | Objective PASS/CONCERNS/FAIL decision | Risk scoring (Probability 1-3 × Impact 1-3). Score ≥ 6 requires documented mitigation. Score = 9 mandates gate failure. Waivers require approver, reason, and expiry date |
| **Acceptance criteria traceability** | 100% of acceptance criteria mapped to ≥ 1 test | Traceability matrix generated per release. Unmapped criteria block release gate |
| **Test pyramid — risk-calibrated** | Ratio adjusted per epic based on risk profile | Default: 70% unit / 20% integration / 10% E2E. Adjusted by Test Design workflow for API-heavy (more integration) or UI-heavy (more E2E) epics |

### Developer Experience (DX)

| Requirement | Target | Enforcement |
|-------------|--------|-------------|
| **API surface minimalism** | ≤ 15 public exports per foundation package | Enforced by API review. Small surface = fewer breaking changes, easier learning curve |
| **Error messages** | Descriptive with context | Build-time errors include the manifest field and expected format. Runtime errors include the module name and hook that failed |
| **Documentation accuracy** | Examples compile and run | All code examples in docs are extracted from tested source. Stale examples are a P1 bug |
| **Semantic versioning** | Strict semver on all `@hexalith/*` packages | Breaking changes require major version bump + deprecation notice in prior minor release |
| **Deprecation policy** | One minor version grace period | Deprecated APIs emit console warnings with migration path. Removed in next major |
| **Scaffold CI smoke test** | CLI produces compilable, testable output | CI validates that `create-hexalith-module` output compiles and passes its scaffolded tests |
| **Dependency isolation** | No module dependency conflicts | Module dependencies must not conflict with shell or other module dependencies. Enforced by build-time validation |

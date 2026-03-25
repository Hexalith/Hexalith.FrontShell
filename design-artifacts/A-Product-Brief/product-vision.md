# Hexalith FrontShell — Product Vision

## Vision Statement

Hexalith FrontShell is a **unified micro-frontend shell** that provides a single, consistent user interface for any number of independently developed application modules. Each module represents a microservice's UI — plugging into the shell with zero coupling to other modules, inheriting authentication, multi-tenancy, design tokens, and real-time capabilities out of the box.

**One shell. Any module. Consistent experience.**

---

## Purpose

Enterprise and SaaS applications are increasingly built as microservices. Each service needs a user interface, but building standalone UIs per service creates fragmentation — inconsistent design, duplicated auth flows, disconnected navigation, and poor user experience.

Hexalith FrontShell solves this by providing:

- A **host shell** that handles cross-cutting concerns (auth, tenants, theming, routing, real-time updates)
- A **plugin architecture** where any microservice can register its UI module via a manifest
- A **shared design system** that enforces visual consistency without restricting module autonomy
- A **CQRS client** that standardizes how modules communicate with backends

---

## Target Audience

| Audience | Need |
|----------|------|
| **Module developers** | Scaffold a new module, plug it into the shell, and focus on domain logic — not infrastructure |
| **Platform engineers** | Maintain the shell, design system, and shared packages as a stable foundation |
| **Application operators** | Deploy a single frontend that unifies all microservice UIs behind one auth flow and navigation |
| **Open-source contributors** | Understand the architecture quickly, contribute modules or platform improvements |

---

## Strategic Priorities

### 1. Developer Experience — Effortless Module Creation

The #1 priority. If it's hard to create and plug in a new module, adoption fails.

**Current state:**
- Module scaffold CLI (`pnpm create-module`) generates a working module in seconds
- AI knowledge bundle provides prompt templates for module, command, and projection generation
- Dev-host lets each module run standalone during development
- Comprehensive developer docs and API reference

**Next steps:**
- Reduce scaffold-to-shipping friction further
- Improve AI-assisted generation quality and coverage
- Add interactive module creation wizard
- Provide more example modules as reference implementations

### 2. Design Consistency — Unified Look Across All Modules

Every module must feel like part of the same application, regardless of who built it.

**Current state:**
- `@hexalith/ui` provides ~20 Radix-based components with design tokens
- Stylelint enforces token usage — no hardcoded colors, spacing, or typography
- ESLint prevents direct Radix imports — modules must use `@hexalith/ui`
- Light/dark theme support via CSS variables

**Next steps:**
- Formalize UX specifications and interaction patterns
- Document component usage guidelines (when to use what)
- Add density modes (comfortable/compact) across all components
- Create visual regression testing baseline
- Expand component catalog based on module needs

### 3. Production Reliability — Auth, Errors, Real-Time

The shell must be rock-solid. Modules depend on it for every request.

**Current state:**
- OIDC authentication with configurable provider
- Multi-tenant context with claim-based tenant switching
- CQRS command pipeline with status polling and SignalR real-time updates
- Typed error hierarchy (ApiError, AuthError, ValidationError, RateLimitError, etc.)
- Exponential backoff with jitter on retries
- Connection health monitoring in status bar
- Error boundaries at shell and module level

**Next steps:**
- Formal accessibility audit (WCAG AA compliance verification)
- Performance budgets and monitoring
- Offline resilience / graceful degradation
- Observability integration (structured logging, error reporting)

---

## Architecture Principles

| Principle | Implementation |
|-----------|---------------|
| **Module isolation** | Modules cannot import from each other; communication only via shell-api contracts |
| **Manifest-driven** | Modules declare routes, navigation, and metadata via typed manifests — validated at build time |
| **Convention over configuration** | Scaffold CLI produces modules that work out of the box; deviate only when needed |
| **Design system enforcement** | Tooling (Stylelint + ESLint) prevents violations — not just conventions, but gates |
| **Type safety end-to-end** | Zod runtime validation ensures frontend matches backend schemas; contract tests prevent divergence |
| **Test as a first-class concern** | ATDD gate in CI; 95% coverage on foundation packages; quality standards enforced by scripts |

---

## Module Ecosystem

### Current Modules

| Module | Domain | Status |
|--------|--------|--------|
| Orders | Order management | Production |
| Tenants | Multi-tenant administration | Production |
| Demo Tasks | Platform demonstration | Development |
| Test Orders | Testing reference | Development |

### Open Plugin Model

Any microservice can provide a UI module. A module needs:

1. A `manifest.ts` declaring routes and navigation
2. Page components using `@hexalith/ui` and `@hexalith/cqrs-client`
3. Zod schemas for data validation
4. Registration in the shell's module registry

The scaffold CLI generates all of this. The barrier to entry is intentionally low.

---

## Roadmap Themes

| Theme | Description | Informed By |
|-------|-------------|-------------|
| **Formalize UX** | Fill empty design artifact folders with interaction specs, user flows, wireframes | Priority #2 |
| **Expand module catalog** | More reference modules to demonstrate the platform's flexibility | Priority #1 |
| **Design system docs** | Component usage guidelines, props documentation, pattern library | Priority #2 |
| **Accessibility audit** | Formal WCAG AA compliance verification and remediation | Priority #3 |
| **Community onboarding** | Contributing guide, module development tutorials, architecture decision records | Priority #1 |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time from scaffold to working module | < 30 minutes |
| CI quality gates passing | 100% on every merge |
| Design token compliance | 100% (enforced by Stylelint) |
| Foundation package test coverage | >= 95% |
| Module test coverage | >= 80% |
| Accessibility compliance | WCAG AA |

---

*This document is the strategic foundation for all WDS Phase 8 improvement cycles. Update it as the product evolves.*

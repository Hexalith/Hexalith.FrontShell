# Sprint Change Proposal — 2026-03-15

**Project:** Hexalith.FrontShell
**Triggered by:** Technical research report (`technical-hexalith-eventstore-interaction-patterns-research-2026-03-15.md`)
**Author:** Jerome (facilitated by John, PM Agent)
**Change scope:** Moderate
**Status:** Approved

---

## Section 1: Issue Summary

### Problem Statement

The planning artifacts (PRD, Architecture, Epics) were authored with incomplete knowledge of the Hexalith.EventStore backend capabilities. A deep technical research of the backend source code (9 key files across EventStore's Contracts, Client, Server, CommandApi, and SignalR projects) revealed that:

1. **SignalR hub is production-ready** — the architecture and PRD explicitly defer SignalR to Phase 2, stating "Backend has no SignalR" and "Backend doesn't implement it yet." This is factually incorrect.
2. **2 additional API endpoints exist** (pre-flight authorization validation) not documented in the architecture.
3. **ETag 2-gate caching** is built into the query pipeline but not captured in any planning artifact.
4. **RFC 9457 ProblemDetails** is the backend error response format, not documented in the architecture.
5. **Technology choices** (ky as REST client, TanStack Query for projection caching) may not be optimal given the actual API surface.

### Discovery Context

- **When discovered:** Pre-implementation — before Epic 2 development started.
- **How discovered:** Systematic codebase-first deep exploration of the EventStore backend, supplemented by web verification of DAPR, MediatR, SignalR, and CQRS patterns.
- **Confidence level:** HIGH across all core findings (verified from source code).

### Evidence

The research document provides:
- Complete endpoint inventory (6 REST endpoints + SignalR hub) with request/response schemas
- SignalR hub contract (`ProjectionChanged`, `JoinGroup`, `LeaveGroup`)
- ETag caching flow (2-gate optimization with `If-None-Match` / `304`)
- RFC 9457 ProblemDetails error format with HTTP status code mapping
- FrontShell gap analysis confirming `@hexalith/cqrs-client` is an empty stub (`export {}`)

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Impact Level | Details |
|------|-------------|---------|
| **Epic 2** | **High** | 6 existing stories updated, 3 new stories added (2.7 SignalR, 2.8 ETag, 2.9 Pre-flight validation). Title changed to "Commands, Projections & Real-Time". Technology choices updated (fetch, ULID, ProblemDetails). |
| Epic 1 | Minor | References to `ky` need updating in "Additional Requirements from Architecture" section |
| Epic 3 | None | UI components are transport-agnostic |
| Epic 4 | Minor | Scaffold template hook names updated (`useCommandPipeline`, `useQuery`), dev host gains MockSignalRHub |
| Epic 5 | Minor | FR27 wording updated to include SignalR as freshness signal source |
| Epic 6 | Minor | Tenants reference module will use updated hooks; contract tests expanded |
| Epic 7 | None | Knowledge bundle will reflect final API surface |

### Story Impact

**Modified stories (Epic 2):**
- **Story 2.1** — Added ProblemDetails type, ValidateCommandRequest, PreflightValidationResult, entityId field, ULID correlationId utility, updated file paths to `src/core/`
- **Story 2.2** — Rewritten: `createKyInstance` → `createFetchClient` using native fetch. Added RFC 9457 parsing, correlation ID propagation, Retry-After handling
- **Story 2.3** — Monolithic `useCommand` split into 3 composable hooks: `useSubmitCommand`, `useCommandStatus`, `useCommandPipeline`. Files moved to `src/commands/`
- **Story 2.4** — `useProjection` (TanStack Query) → `useQuery` (ETag-based caching). Files moved to `src/queries/`
- **Story 2.5** — Connection state now reflects HTTP + SignalR composite. Polling reframed as fallback, not primary
- **Story 2.6** — Mocks updated for ETag behavior, MockSignalRHub added, contract tests expanded for ProblemDetails and ETag parity

**New stories (Epic 2):**
- **Story 2.7** — SignalR Connection & Projection Subscriptions (`useSignalR`, `useProjectionSubscription`, auto-reconnect, group management)
- **Story 2.8** — ETag Query Cache Integration (in-memory cache, `If-None-Match`/`304`, transparent to module developers)
- **Story 2.9** — Pre-flight Authorization Validation (`useCanExecuteCommand`, `useCanExecuteQuery`, fail-closed, cached)

### Artifact Conflicts

**PRD:**
- FR11: "MVP: polling; Phase 2: SignalR" → SignalR is MVP
- FR13: "automatic polling as primary" → SignalR push as primary, polling as fallback
- NFR23: "configurable polling (MVP); SignalR push (Phase 2)" → both MVP
- Additional Requirements from Architecture: ky → fetch, TanStack Query → ETag caching, polling → SignalR + polling

**Architecture Document:**
- Core Decision #3: ky → native fetch
- Core Decision #5: "Backend has no SignalR" → it does
- Core Decision #6: "No push mechanism" → SignalR exists
- Deferred Decisions: SignalR row removed, replaced with Redis backplane deferral
- API endpoint table: 4 → 6 endpoints, ETag headers, entityId field added
- Error handling: RFC 9457 ProblemDetails mapping added
- Projection Caching: TanStack Query strategy → layered ETag + SignalR + polling strategy
- State Management: TanStack Query row updated, SignalR row added
- SubmitQueryRequest type: entityId field added
- New types: ValidateCommandRequest, PreflightValidationResult, ProblemDetails

**UX Design:**
- Status bar connection health: can now reflect SignalR state (minor wording)

### Technical Impact

- **New dependency:** `@microsoft/signalr` (~30KB gzipped) — official Microsoft package, TypeScript-native
- **New dependency:** `ulidx` — ULID correlation ID generation, zero deps, TypeScript-native
- **Removed dependency:** `ky` (~3KB) — replaced by native fetch
- **Removed dependency:** `@tanstack/react-query` — replaced by lightweight ETag cache
- **Net bundle size impact:** ~+25KB gzipped (SignalR +30KB, remove ky -3KB, remove TanStack Query -12KB, add ulidx +1KB, add custom cache code ~+9KB)

---

## Section 3: Recommended Approach

### Selected Path: Direct Adjustment (Option 1)

**Rationale:**
1. No implementation has started — zero code to roll back
2. Research provides a complete, high-confidence implementation blueprint
3. Changes are corrective (fix wrong assumptions) and additive (new capabilities)
4. The incremental 5-phase approach maps cleanly to updated stories
5. Epic structure is preserved — only Epic 2 gains scope

**Effort estimate:** Medium
- Updating planning artifacts: ~2 hours (this document + edits)
- Additional implementation effort for 3 new stories: ~1.5 weeks
- Total Epic 2 estimate increases from ~3 weeks to ~4.5 weeks

**Risk assessment:** Low
- All findings are HIGH confidence (source code verified)
- SignalR is additive — polling remains as fallback
- ETag caching is a server capability, not a new protocol
- Pre-flight validation is optional (can be deferred without blocking)

**Timeline impact:** Epic 2 duration increases by ~1.5 weeks. No impact on Epic 1 (in progress or complete). Downstream epics shift proportionally but the dependency flow is unchanged.

---

## Section 4: Detailed Change Proposals

### 4.1 Architecture Document Changes

| # | Section | Change |
|---|---------|--------|
| 1 | Core Decisions #3, #5, #6 | ky → fetch; remove "no SignalR" statements; add SignalR + ETag projection freshness |
| 2 | Deferred Decisions | Remove SignalR row; add Redis backplane deferral |
| 3 | API endpoint table | 4 → 6 endpoints; add ETag headers, entityId, response header details |
| 4 | Error Handling | Add RFC 9457 ProblemDetails format and HTTP status → error class mapping |
| 5 | Projection Caching | Replace TanStack Query strategy with layered ETag + SignalR + polling |
| 6 | State Management | Update hook names; replace TanStack Query row; add SignalR row |
| 7 | Types | Add entityId to SubmitQueryRequest; add ValidateCommandRequest, PreflightValidationResult, ProblemDetails |

### 4.2 PRD Changes

| # | Section | Change |
|---|---------|--------|
| 8 | FR11 | Remove Phase 2 deferral; SignalR + polling both MVP |
| 9 | FR13 | SignalR push as primary, polling as fallback |
| 10 | NFR23 | SignalR + ETag + polling — all MVP |
| 11 | Additional Requirements | ky → fetch; TanStack Query → ETag caching; polling → SignalR + polling |

### 4.3 Epic 2 Story Changes

| # | Story | Change |
|---|-------|--------|
| 12 | 2.1 | Add ProblemDetails, validation types, entityId, ULID correlationId, updated paths |
| 13 | 2.2 | Rewrite: ky → fetch, add RFC 9457 parsing, correlation ID propagation |
| 14 | 2.3 | Split useCommand → useSubmitCommand + useCommandStatus + useCommandPipeline |
| 15 | 2.4 | useProjection (TanStack Query) → useQuery (ETag-based) |
| 16 | 2.5 | Connection state = HTTP + SignalR composite; polling = fallback |
| 17 | 2.6 | Add MockSignalRHub, ETag mock behavior, ProblemDetails contract tests |
| 18 | 2.7 | **NEW:** SignalR Connection & Projection Subscriptions |
| 19 | 2.8 | **NEW:** ETag Query Cache Integration |
| 20 | 2.9 | **NEW:** Pre-flight Authorization Validation |

### 4.4 Other Epic Changes

| # | Epic | Change |
|---|------|--------|
| 21 | Epic 2 summary | 6 → 9 stories; updated title, deliverables, sequencing note |
| 22 | FR Coverage Map | Updated Epic 2 entry with story-level FR mapping |
| 23 | Epic 4 | Hook names updated; dev host gains MockSignalRHub |
| 24 | Epic 5 | FR27 wording includes SignalR |

---

## Section 5: Implementation Handoff

### Change Scope Classification: Moderate

Backlog reorganization needed — 3 new stories added to Epic 2, 6 existing stories modified, planning artifacts require updates.

### Handoff Plan

| Recipient | Responsibility |
|-----------|---------------|
| **Product Manager (John)** | Update PRD: FR11, FR13, NFR23, Additional Requirements |
| **Solution Architect** | Update Architecture document: 7 sections (Decisions, API, Errors, Caching, State, Types, Deferred) |
| **Scrum Master** | Update sprint-status.yaml: add Stories 2.7, 2.8, 2.9; update Epic 2 story count |
| **Development Team** | Implement updated Stories 2.1-2.6 and new Stories 2.7-2.9 following the 5-phase incremental build |

### Success Criteria

1. All 24 edit proposals applied to planning artifacts (PRD, Architecture, Epics)
2. sprint-status.yaml reflects 9 stories in Epic 2
3. Story specifications are implementation-ready with updated ACs
4. No references to "ky", "TanStack Query", or "Phase 2 SignalR" remain in MVP planning artifacts

### Implementation Sequencing (Epic 2)

```
Phase 1 (Stories 2.1-2.2): Foundation — types, fetch client, ProblemDetails, ULID
Phase 2 (Story 2.3):        Commands — useSubmitCommand, useCommandStatus, useCommandPipeline
Phase 3 (Stories 2.4, 2.8): Queries — useQuery + ETag cache integration
Phase 4 (Story 2.7):        SignalR — useSignalR, useProjectionSubscription
Phase 5 (Stories 2.5, 2.9): Polish — connection state, pre-flight validation
Story 2.6:                   Mocks & contracts — can be built incrementally alongside each phase
```

---

**Sprint Change Proposal complete, Jerome.**

*Generated: 2026-03-15*

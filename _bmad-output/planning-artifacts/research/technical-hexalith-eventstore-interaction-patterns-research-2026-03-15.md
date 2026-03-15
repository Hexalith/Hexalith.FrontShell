---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Hexalith.EventStore interaction patterns — commands, queries, and notifications'
research_goals: 'Document existing internal architecture (contracts, handlers, projections) AND integration surface for FrontShell consumption'
user_name: 'Jerome'
date: '2026-03-15'
web_research_enabled: true
source_verification: true
---

# Research Report: Technical

**Date:** 2026-03-15
**Author:** Jerome
**Research Type:** technical

---

## Research Overview

This technical research documents the complete interaction surface of the Hexalith.EventStore system — a production-grade, DAPR-based CQRS/Event Sourcing infrastructure with first-class multi-tenancy. The research covers the internal architecture (aggregate actors, command pipeline, event persistence, query routing, projection notifications) and the external integration surface that FrontShell consumes via REST API and SignalR.

The key finding is that FrontShell has solid foundational infrastructure (OIDC auth, tenant management, health monitoring, runtime config) but the `@hexalith/cqrs-client` package is an empty stub awaiting implementation. The CommandApi exposes 6 REST endpoints and a SignalR hub — all fully specified with JWT auth, ETag caching, rate limiting, and RFC 9457 error responses. A 5-phase implementation roadmap is provided in the Research Synthesis section below.

**Research Methodology:** Codebase-first deep exploration of 9 key source files across EventStore's Contracts, Client, Server, CommandApi, and SignalR projects, supplemented by web verification of DAPR, MediatR, SignalR, and CQRS patterns against current (2025-2026) sources.

---

## Technical Research Scope Confirmation

**Research Topic:** Hexalith.EventStore interaction patterns — commands, queries, and notifications
**Research Goals:** Document existing internal architecture (contracts, handlers, projections) AND integration surface for FrontShell consumption

**Technical Research Scope:**

- Architecture Analysis - CQRS/ES patterns, aggregate design, event sourcing internals
- Implementation Approaches - command dispatch, query projection, notification handling
- Technology Stack - .NET frameworks, messaging, storage backends
- Integration Patterns - APIs, DI wiring, service contracts for FrontShell consumption
- Performance Considerations - scalability, replay, optimization patterns

**Research Methodology:**

- Codebase-first deep exploration of Hexalith.EventStore source
- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-03-15

## Technology Stack Analysis

### Programming Languages & Runtime

Hexalith.EventStore is built on **.NET 10** (SDK 10.0.103 pinned in `global.json`), using C# with file-scoped namespaces, Allman braces, and `_camelCase` private field conventions. The FrontShell consumer is **TypeScript 5** on **React 19** with **Vite** as the build tool.

_Runtime: .NET 10 (server-side), Node.js 22+ (frontend build)_
_Language Features: Records, static abstract interface members, primary constructors_
_Confidence: HIGH — verified directly from codebase_

### Development Frameworks and Libraries

**Server-Side Core Stack:**

| Framework | Version | Role |
|-----------|---------|------|
| **DAPR** | 1.17.3 | Distributed runtime — actors, state store, pub/sub, service invocation |
| **MediatR** | 14.0.0 | In-process command/query pipeline (IRequest/IRequestHandler) |
| **FluentValidation** | 12.1.1 | Input validation with DI integration |
| **ASP.NET Core** | 10.0.x | Web API framework (controllers, middleware, auth) |
| **SignalR** | 10.0.5 (client) | Real-time projection change notifications |
| **.NET Aspire** | 13.1.x | Local dev orchestration (DAPR topology, Keycloak, Docker) |
| **OpenTelemetry** | 1.15.x | Distributed tracing and telemetry |

**Frontend Stack:**

| Framework | Version | Role |
|-----------|---------|------|
| **React** | 19 | UI framework |
| **oidc-client-ts** | — | OIDC authentication flow |
| **pnpm** | 10.25+ | Package manager |

_Note: MediatR 14 has moved to a commercial license model. The library remains the dominant in-process mediator for .NET CQRS implementations._
_Source: [CQRS with MediatR](https://vabtech.wordpress.com/2025/06/06/cqrs-with-mediatr-command-and-query-separation-in-net/)_

### Database and Storage Technologies

Hexalith.EventStore uses a **DAPR-abstracted storage model** — no direct database driver dependencies exist in the codebase. All persistence flows through DAPR building blocks:

| Concern | DAPR Building Block | Dev Default | Production Options |
|---------|---------------------|-------------|-------------------|
| Event streams | State Store | In-memory | Redis, Cosmos DB, PostgreSQL |
| Aggregate metadata | State Store | In-memory | Same as above |
| Snapshots | State Store | In-memory | Same as above |
| Command archive | State Store | In-memory | Same as above |
| Event distribution | Pub/Sub | In-memory | Redis Streams, Kafka, Azure Service Bus |
| Command status | State Store | In-memory | Same as above |

**Key Storage Schema (colon-separated DAPR state keys):**
- Events: `{tenant}:{domain}:{aggId}:events:{seqNum}`
- Metadata: `{tenant}:{domain}:{aggId}:metadata`
- Snapshots: `{tenant}:{domain}:{aggId}:snapshot`
- Pipeline checkpoints: `{tenant}:{domain}:{aggId}:pipeline:{correlationId}`
- Pub/Sub topic: `{tenant}.{domain}.events` (dot-separated)

_Confidence: HIGH — verified from AggregateIdentity.cs and DAPR component configs_

### Development Tools and Platforms

| Tool | Purpose |
|------|---------|
| **xUnit** 2.9.3 | Unit testing framework |
| **Shouldly** 4.3.0 | Fluent assertion library |
| **NSubstitute** 5.3.0 | Mocking framework |
| **Testcontainers** 4.10.0 | Integration test containers |
| **coverlet** 6.0.4 | Code coverage collection |
| **Directory.Packages.props** | Centralized NuGet version management |
| **Keycloak** | OIDC identity provider (dev topology) |

### Cloud Infrastructure and Deployment

**Aspire Orchestration (Local Dev):**
.NET Aspire orchestrates the full topology in C# — DAPR sidecars, Keycloak, Redis, and the CommandApi — eliminating manual YAML configuration. The `CommunityToolkit.Aspire.Hosting.Dapr` package (replacing the deprecated `Aspire.Hosting.Dapr`) wires DAPR components declaratively.

_Important: As of .NET Aspire 9.0+, AppPort must be explicitly specified for DAPR callbacks (pub/sub, actors, workflows)._
_Source: [DAPR Aspire Integration](https://v1-16.docs.dapr.io/developing-applications/sdks/dotnet/dotnet-integrations/dotnet-development-dapr-aspire/)_

**Production Deployment:**
- Docker containers (multi-stage: Node.js build → Nginx serve for FrontShell)
- Kubernetes with ConfigMap-mounted `config.json`
- Azure Container Apps supported via Aspire publishing
- DAPR sidecars for each service

**FrontShell Deployment:**
- Static SPA served by Nginx
- Runtime config at `/config.json` (not baked into build)
- SPA routing: all paths → `index.html`
- Assets: content-hashed, 1-year cache

### Technology Adoption Trends

| Pattern | Status in Hexalith | Industry Direction |
|---------|--------------------|-------------------|
| DAPR Actors for ES | ✅ Server-side only | Growing — Sekiban framework added DAPR runtime in 2025 |
| MediatR CQRS pipeline | ✅ Server-side core | Dominant but licensing change driving alternatives |
| .NET Aspire orchestration | ✅ Dev topology | Standard for .NET distributed app local dev |
| SignalR notifications | ✅ Projection changes | Active development in ASP.NET Core (legacy ASP.NET in maintenance) |
| DAPR-abstracted storage | ✅ Server-side only | Enables runtime backend swapping without code changes |
| REST + SignalR (FrontShell) | ✅ Client integration | Standard for SPA ↔ backend communication |

_Important: FrontShell (React SPA) does **not** use DAPR to communicate with EventStore. The integration surface is the **CommandApi REST endpoints** (`POST /api/v1/commands`, query endpoints) and **SignalR** for real-time notifications. DAPR is an internal server-side concern only._

_Sources:_
- _[DAPR Event Sourcing Issue](https://github.com/dapr/dapr/issues/915)_
- _[.NET Aspire & DAPR Complementarity](https://www.diagrid.io/blog/net-aspire-dapr-what-are-they-and-how-they-complement-each-other)_
- _[SignalR Real-Time Apps](https://oneuptime.com/blog/post/2026-01-29-realtime-apps-signalr-dotnet/view)_
- _[MediatR Pipeline Behaviors](https://toxigon.com/mediatr-pipeline-behaviors-in-dotnet)_

## Integration Patterns Analysis

### API Design Patterns — CommandApi REST Surface

FrontShell communicates with EventStore exclusively through the **CommandApi REST gateway** — a standard ASP.NET Core Web API with controllers, JWT auth, and MediatR pipeline. All endpoints follow the `202 Accepted` async command pattern recommended for CQRS systems.

**Complete Endpoint Inventory:**

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/v1/commands` | POST | Submit a command | `202 Accepted` + Location header |
| `/api/v1/commands/status/{correlationId}` | GET | Poll command status | `200 OK` with status record |
| `/api/v1/commands/validate` | POST | Pre-flight authorization check | `200 OK` with IsAuthorized |
| `/api/v1/commands/replay/{correlationId}` | POST | Replay a failed command | `202 Accepted` + new correlationId |
| `/api/v1/queries` | POST | Submit a query | `200 OK` with projection data |
| `/api/v1/queries/validate` | POST | Pre-flight query authorization | `200 OK` with IsAuthorized |

#### Command Submission (`POST /api/v1/commands`)

**Request:**
```json
{
  "tenant": "my-tenant",
  "domain": "orders",
  "aggregateId": "order-123",
  "commandType": "place-order",
  "payload": { /* domain-specific JSON */ },
  "extensions": { "key": "value" }  // optional
}
```

**Response (202 Accepted):**
```json
{ "correlationId": "550e8400-e29b-41d4-a716-446655440000" }
```

**Response Headers:**
- `Location: /api/v1/commands/status/{correlationId}`
- `Retry-After: 1`
- `X-Correlation-ID: {correlationId}`

**Size Limit:** 1 MB per request.

#### Command Status Polling (`GET /api/v1/commands/status/{correlationId}`)

**Response (200 OK):**
```json
{
  "correlationId": "550e8400-...",
  "status": "Completed",
  "statusCode": 4,
  "timestamp": "2026-03-15T10:30:00Z",
  "aggregateId": "order-123",
  "eventCount": 2,
  "rejectionEventType": null,
  "failureReason": null,
  "timeoutDuration": null
}
```

**Command Status Lifecycle:**
- `Received` (0) → `Processing` (1) → `EventsStored` (2) → `EventsPublished` (3) → `Completed` (4)
- Terminal failures: `Rejected` (5), `PublishFailed` (6), `TimedOut` (7)

**Security:** Tenant-scoped — searches only across tenants authorized by the caller's JWT claims. Returns `404` if not found (does not reveal which tenants were searched).

#### Query Submission (`POST /api/v1/queries`)

**Request:**
```json
{
  "tenant": "my-tenant",
  "domain": "orders",
  "aggregateId": "order-123",
  "queryType": "get-order-summary",
  "payload": { /* optional filter criteria */ },
  "entityId": "item-456"  // optional
}
```

**ETag Caching (2-Gate Optimization):**
- Client sends `If-None-Match: "{etag}"` header
- **Gate 1 (pre-check):** If ETag matches current projection state → `304 Not Modified` (skips query execution entirely)
- **Gate 2 (post-execution):** Response includes `ETag` header for subsequent cache validation
- Self-routing ETags encode projection type for multi-query optimization

**Response Headers:**
- `ETag: "{projectionETag}"`
- `X-Correlation-ID: {correlationId}`

#### Pre-flight Validation (`POST /api/v1/commands/validate`, `/api/v1/queries/validate`)

**Request:**
```json
{
  "tenant": "my-tenant",
  "domain": "orders",
  "commandType": "place-order",
  "aggregateId": null  // optional
}
```

**Response:**
```json
{
  "isAuthorized": true,
  "reason": null
}
```

**Use Case:** FrontShell can validate user permissions before showing command buttons — avoids unnecessary rate limit consumption.

#### Command Replay (`POST /api/v1/commands/replay/{correlationId}`)

Resubmits a failed command from the archive. Only commands in terminal failure states (`Rejected`, `PublishFailed`, `TimedOut`) are replayable. Returns `409 Conflict` for completed or in-flight commands.

### Communication Protocols

**HTTP/HTTPS (Primary):**
- All REST endpoints use standard HTTP with JSON payloads (`application/json`)
- HTTPS enforced for non-localhost (FrontShell normalizes URLs)
- Correlation ID propagation via `X-Correlation-ID` header (generated if not provided)

**WebSocket (Real-Time):**
- SignalR hub at `/hubs/projection-changes` uses WebSocket transport (auto-fallback to Server-Sent Events)
- Signal-only model — broadcasts projection type + tenant ID, no payload data
- Client must re-query to fetch updated projection (cache invalidation pattern)

**Health Monitoring:**
- FrontShell polls `commandApiBaseUrl` with `HEAD` requests every 30 seconds
- Exponential backoff on failure (2s → 4s → 8s → ... → 30s max)
- States: `connected` | `reconnecting` | `disconnected`
- 3 consecutive failures required to declare disconnection

### Data Formats and Standards

**Request/Response Format:** JSON (`application/json`) with `Content-Type` headers

**Error Responses:** RFC 9457 Problem Details:
```json
{
  "type": "https://tools.ietf.org/html/rfc9457#section-3",
  "title": "Forbidden",
  "status": 403,
  "detail": "No tenant authorization claims found. Access denied.",
  "instance": "/api/v1/commands",
  "correlationId": "...",
  "tenantId": "my-tenant"
}
```

**Standard HTTP Status Codes:**
| Code | Meaning |
|------|---------|
| `200` | Success (queries, validation, status) |
| `202` | Accepted (commands, replay) |
| `304` | Not Modified (ETag cache hit) |
| `400` | Bad Request (validation, malformed GUID) |
| `401` | Unauthorized (missing/invalid JWT) |
| `403` | Forbidden (tenant or RBAC failure) |
| `404` | Not Found (status/replay not found) |
| `409` | Conflict (non-replayable command) |
| `429` | Too Many Requests (rate limit) |
| `503` | Service Unavailable (authorization service down) |

### Real-Time Notifications — SignalR Integration

**Hub Path:** `/hubs/projection-changes`

**Hub Contract (Server → Client):**
```typescript
// Client receives this method call:
ProjectionChanged(projectionType: string, tenantId: string)
```

**Client → Server Methods:**
```typescript
JoinGroup(projectionType: string, tenantId: string)   // Subscribe to changes
LeaveGroup(projectionType: string, tenantId: string)   // Unsubscribe
```

**Group Naming:** `{projectionType}:{tenantId}` — max 50 groups per connection (configurable).

**Notification Flow:**
1. Domain service processes command → events persisted
2. DAPR pub/sub delivers `ProjectionChangedNotification` to CommandApi
3. ETag actor regenerates cache validator
4. SignalR broadcasts `ProjectionChanged` to subscribed group
5. FrontShell receives signal → re-queries with `If-None-Match` to get fresh data

**Fail-Open Design:** Broadcast failures don't break ETag regeneration — system remains functional even if real-time notifications fail.

**Configuration:**
```json
{
  "EventStore": {
    "SignalR": {
      "Enabled": true,
      "MaxGroupsPerConnection": 50,
      "BackplaneRedisConnectionString": null
    }
  }
}
```

**Multi-Instance:** Redis backplane (StackExchange.Redis) for scaling across multiple CommandApi instances.

**Reconnection:** Automatic reconnect with default exponential backoff (1s, 3s, 5s, 10s, 10s, 10s, 30s). Auto-rejoins all subscribed groups on reconnection.

### Integration Security Patterns

**Authentication — JWT Bearer (OIDC):**
- FrontShell authenticates via `oidc-client-ts` + `react-oidc-context` → Keycloak realm
- JWT token passed as `Authorization: Bearer {token}` on all API requests
- Required claims: `sub` (user ID), `eventstore:tenant` (tenant list)
- Claims transformation on server extracts and normalizes tenant claims

**Authorization — Dual Mode:**
1. **Claims-based (default):** Evaluates JWT claims for tenant access + RBAC
2. **Actor-based (configurable):** Delegates to DAPR actors for dynamic authorization
- Returns `503 Service Unavailable` if authorization service is down

**Rate Limiting — Per-Tenant Sliding Window:**
- Default: 100 requests / 60-second window per tenant
- 6 segments (10-second granularity)
- Health endpoints (`/health`, `/alive`, `/ready`) exempt
- Response: `429` with `Retry-After` header

**Extension Metadata Sanitization (SEC-4):**
- Allowlist validation at API gateway for `extensions` dictionary
- Prevents injection of unauthorized metadata

**Tenant Isolation:** 4-layer enforcement — input validation (reject colons), composite key prefixing, DAPR actor scoping, JWT tenant claim.

### FrontShell Integration Surface — Current State

**What Exists:**
| Component | Status | Location |
|-----------|--------|----------|
| OIDC authentication | ✅ Complete | `@hexalith/shell-api` AuthProvider |
| Tenant management | ✅ Complete | `@hexalith/shell-api` TenantProvider |
| Backend URL config | ✅ Complete | `RuntimeConfig.commandApiBaseUrl` |
| Connection health | ✅ Complete | `ConnectionHealthProvider` (HEAD polling) |
| CQRS client | ❌ Empty stub | `@hexalith/cqrs-client` (`export {};`) |

**What Needs to Be Built in `@hexalith/cqrs-client`:**

1. **TypeScript interfaces** mirroring C# contracts (SubmitCommandRequest, CommandStatusResponse, SubmitQueryRequest, etc.)
2. **Authenticated HTTP client** — fetch wrapper with JWT injection from `useAuth()`, correlation ID propagation, ProblemDetails error parsing
3. **Command hooks** — `useSubmitCommand()` → POST to `/api/v1/commands`, returns correlationId
4. **Status polling hooks** — `useCommandStatus(correlationId)` with backoff until terminal state
5. **Query hooks** — `useQuery()` with ETag caching (`If-None-Match` / `304` handling)
6. **SignalR client** — connect to `/hubs/projection-changes`, `JoinGroup`/`LeaveGroup`, trigger query re-fetch on `ProjectionChanged`
7. **Pre-flight validation hooks** — `useCanExecuteCommand()` / `useCanExecuteQuery()` for UI permission gating
8. **Error handling** — RFC 9457 ProblemDetails parsing, 429 rate limit retry, 403 tenant errors

_Sources:_
- _[Exposing CQRS Through a RESTful API](https://www.infoq.com/articles/rest-api-on-cqrs/)_
- _[Integrating SignalR with React.js](https://medium.com/@iAmrAmosh/integrating-signalr-with-react-js-for-real-time-notifications-5aedeb281e3d)_
- _[SignalR & React — No Extra Package](https://www.abrahamberg.com/blog/aspnet-signalr-and-react/)_
- _[@microsoft/signalr npm package](https://www.npmjs.com/package/react-signalr)_

## Architectural Patterns and Design

### System Architecture Patterns

Hexalith.EventStore implements a layered, distributed CQRS/Event Sourcing architecture orchestrated by DAPR actors. The system is structured in four distinct tiers:

```
┌─────────────────────────────────────────────────────────┐
│  FrontShell (React SPA)                                 │
│  REST + SignalR ↕ JWT Bearer                            │
├─────────────────────────────────────────────────────────┤
│  CommandApi (ASP.NET Core Gateway)                      │
│  Controllers → MediatR Pipeline → Authorization         │
├─────────────────────────────────────────────────────────┤
│  DAPR Actor Layer (Server)                              │
│  AggregateActor │ ProjectionActor │ ETagActor           │
├─────────────────────────────────────────────────────────┤
│  Domain Services (Client SDK)                           │
│  EventStoreAggregate<TState> │ IDomainProcessor         │
├─────────────────────────────────────────────────────────┤
│  DAPR Building Blocks (Infrastructure)                  │
│  State Store │ Pub/Sub │ Service Invocation              │
└─────────────────────────────────────────────────────────┘
```

**Actor Model as Aggregate Boundary:** Each aggregate instance maps to a DAPR virtual actor (`AggregateActor`), identified by `{tenant}:{domain}:{aggregateId}`. The actor model guarantees single-threaded message processing per actor, eliminating concurrency issues at the aggregate level — a natural fit for event sourcing where aggregates are the consistency boundary.

_This aligns with industry best practices: the actor model provides concurrency correctness by construction at the aggregate boundary, enabling horizontal scale without explicit locking._
_Source: [DAPR Actors Overview](https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/)_

### Design Principles and Best Practices

**1. 5-Step Command Processing Pipeline (AggregateActor):**

Every command follows a strict, deterministic pipeline inside the actor:

| Step | Action | Pattern |
|------|--------|---------|
| 1 | **Idempotency Check** | CausationId-based dedup (not CorrelationId) |
| 2 | **Tenant Validation** | Fail-closed, BEFORE any state access (SEC-2) |
| 3 | **State Rehydration** | Snapshot-first, tail-only event replay |
| 4 | **Domain Service Invocation** | Pure function: `Handle(command, state?) → DomainResult` |
| 5 | **Event Persistence + Publication** | Atomic commit, then async pub/sub |

**2. Convention Over Configuration:** Domain processors are discovered via reflection at startup. `AssemblyScanner` finds all `EventStoreAggregate<TState>` and `EventStoreProjection<TReadModel>` subclasses, resolves domain names via `NamingConventionEngine`, and registers them as keyed `IDomainProcessor` services — no manual registration required.

**3. Errors as Values:** `DomainResult` captures three outcomes without exceptions:
- `Success(events)` — state-changing events produced
- `Rejection(rejectionEvents)` — domain rejected the command (IRejectionEvent)
- `NoOp()` — no state change needed

**4. Fail-Open vs Fail-Closed Boundaries:**
- **Fail-Closed:** Tenant validation, RBAC authorization, event deserialization (security-critical paths)
- **Fail-Open:** SignalR broadcast, ETag retrieval, advisory status writes (non-critical observability paths)

### Scalability and Performance Patterns

**Snapshot-Assisted Rehydration (Story 3.10):**
Event streams grow unbounded over time. Hexalith addresses this with periodic snapshots:
- Snapshot threshold configurable (min 10 events)
- On rehydration: load snapshot first, then only tail events after snapshot sequence
- If snapshot is at current sequence → zero event reads (fast path)
- Parallel event loading via `Task.WhenAll()` for multi-event tails

**3-Tier Query Routing:**
Queries are deterministically routed to ProjectionActor instances:
- **Tier 1:** EntityId-scoped (single entity lookup)
- **Tier 2:** Payload-checksum (parameterized query, hashed for actor affinity)
- **Tier 3:** Tenant-wide (full collection query)

**ETag-Based Cache Validation (2-Gate Optimization):**
- Gate 1 (pre-check): If client sends `If-None-Match`, server validates ETag against current projection state → `304 Not Modified` without executing the query
- Gate 2 (post-execution): Fresh ETag included in response for next request
- Self-routing ETags encode projection type for multi-query optimization

**Per-Tenant Rate Limiting:** Sliding window (default 100 req/60s) prevents any single tenant from starving others. Health endpoints exempt.

_Source: [Why CQRS & Event Sourcing Matter in High-Concurrency Systems](https://www.sqlservercentral.com/articles/why-cqrs-and-event-sourcing-are-gaining-ground-in-high-concurrency-web-systems)_

### Crash Recovery and Resilience Patterns

**Pipeline State Machine (ActorStateMachine):**
The AggregateActor checkpoints its progress at key stages (`Processing`, `EventsStored`, `EventsPublished`). On actor reactivation after a crash:
- If checkpoint at `EventsStored` → events are already durable, skip to terminal completion (no re-persistence)
- If checkpoint at `Processing` → safe to reprocess from scratch (idempotency guards prevent duplicates)
- No checkpoint → normal flow

**Event Drain Recovery (Story 4.4):**
If event publication to DAPR pub/sub fails after events are persisted:
- `UnpublishedEventsRecord` stored in actor state
- DAPR reminder registered to wake the actor later
- On reminder fire → retry publication from stored record
- Guarantees at-least-once delivery even across process restarts

**Dead-Letter Routing (Story 4.5):**
Infrastructure failures during rehydration or domain invocation route to a dead-letter queue for manual investigation, preventing silent data loss.

**Idempotency via CausationId:**
Duplicate detection uses `CausationId` (the originating source of the command), not `CorrelationId` (which tracks conversation threads). This prevents re-execution when the same command source retries, while allowing legitimate replays with new correlation IDs.

_Source: [Event Sourcing Pattern — AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/event-sourcing.html)_

### Security Architecture Patterns

**4-Layer Tenant Isolation:**

| Layer | Enforcement |
|-------|-------------|
| 1. Input Validation | Reject colons in tenant/domain/aggregateId (prevents key injection) |
| 2. Composite Key Prefixing | All state store keys prefixed with `{tenant}:{domain}:{aggId}:` |
| 3. DAPR Actor Scoping | Actor ID includes tenant — actors are inherently tenant-scoped |
| 4. JWT Tenant Claims | `eventstore:tenant` claim validated before any data access |

**Dual-Mode Authorization:**
- **Claims-based (default):** Fast path — evaluates JWT claims locally
- **Actor-based (configurable):** Delegates to `IRbacValidatorActor` / `ITenantValidatorActor` — supports dynamic RBAC rules stored in actors
- Returns `503 Service Unavailable` if authorization service is down (fail-closed)

**Payload Protection:** Cryptographic service (`IEventPayloadProtectionService`) encrypts/redacts sensitive event payloads at persistence time and decrypts before publication. Payloads are never logged (Rule #5).

**Extension Metadata Sanitization (SEC-4):** Allowlist validation at the API gateway prevents injection of unauthorized metadata keys.

### Data Architecture Patterns

**Event Stream Schema (Immutable, Append-Only):**
```
Key: {tenant}:{domain}:{aggregateId}:events:{sequenceNumber}
Value: EventEnvelope {
  Metadata: { AggregateId, TenantId, Domain, SequenceNumber, Timestamp,
              CorrelationId, CausationId, UserId, DomainServiceVersion,
              EventTypeName, SerializationFormat }
  Payload: byte[] (encrypted)
  Extensions: { traceparent?, tracestate? }
}
```

**Gapless Sequence Numbers:** Guaranteed by DAPR actor single-writer semantics. No gaps even under high concurrency — each event gets `currentSequence + 1 + i`.

**CloudEvents 1.0 Publication:** Events published to DAPR pub/sub in CloudEvents format with:
- `cloudevent.type`: event type name
- `cloudevent.source`: `hexalith-eventstore/{tenantId}/{domain}`
- `cloudevent.id`: `{correlationId}:{sequenceNumber}`

**DAPR-Abstracted Storage:** No direct database dependencies. Storage backend swappable at deployment time (Redis, Cosmos DB, PostgreSQL) via DAPR component configuration without code changes.

### Deployment and Operations Architecture

**Aspire-Orchestrated Topology (Local Dev):**
.NET Aspire defines the complete distributed system topology in C#:
- CommandApi with DAPR sidecar
- Domain service(s) with DAPR sidecars
- Keycloak for OIDC
- Redis for state store / pub/sub / SignalR backplane
- DAPR access control policies

**Observability Stack:**
- **OpenTelemetry** activities at every pipeline step (tagged with tenant, domain, correlation ID)
- **Structured logging** with source-generated partial `Log` methods
- **Event IDs** for hub operations (1080-1085), pipeline stages, and error categories
- **Correlation ID** propagated end-to-end via `X-Correlation-ID` header and OpenTelemetry trace context

**Production Deployment Targets:**
- Docker containers with DAPR sidecars
- Kubernetes (with ConfigMap for runtime config)
- Azure Container Apps (via Aspire publishing)

_Sources:_
- _[DAPR Actors for Scalable Workflows](https://www.diagrid.io/blog/understanding-dapr-actors-for-scalable-workflows-and-ai-agents)_
- _[Actor Model and Event Sourcing](https://blog.softwaremill.com/actor-model-and-event-sourcing-aa00993d2f1e)_
- _[CQRS Pattern — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)_
- _[Event Sourcing Pattern — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)_

## Implementation Approaches and Technology Adoption

### Technology Adoption Strategy — Incremental Build

The `@hexalith/cqrs-client` package should be built incrementally in layers, each independently testable:

**Phase 1 — Foundation (HTTP Client + Types)**
- TypeScript interfaces mirroring CommandApi request/response models
- Authenticated fetch wrapper integrating `useAuth()` for JWT injection
- RFC 9457 ProblemDetails error parser
- ULID-based correlation ID generation (`ulidx`) and propagation — lexicographically sortable, timestamp-embedded

**Phase 2 — Command Pipeline**
- `useSubmitCommand()` hook — POST to `/api/v1/commands`, returns `{ correlationId, status }`
- `useCommandStatus()` hook — polls `/api/v1/commands/status/{id}` with exponential backoff until terminal state
- `useCommandPipeline()` — combines submit + status polling into a single hook with state machine

**Phase 3 — Query Pipeline**
- `useQuery()` hook — POST to `/api/v1/queries` with ETag caching
- `If-None-Match` / `304` handling for cache optimization
- ETag storage per query key (in-memory or sessionStorage)

**Phase 4 — Real-Time Notifications**
- SignalR client connecting to `/hubs/projection-changes`
- `useProjectionSubscription()` hook — JoinGroup/LeaveGroup lifecycle
- Auto-invalidate query cache on `ProjectionChanged` signal

**Phase 5 — Authorization & Polish**
- `useCanExecute()` — pre-flight validation hooks for UI permission gating
- Command replay support
- Rate limit retry with `Retry-After` header respect

### Development Workflows and Tooling

**Recommended Package Dependencies for `@hexalith/cqrs-client`:**

| Dependency | Purpose | Justification |
|------------|---------|---------------|
| `@microsoft/signalr` | SignalR JS client | Official Microsoft package, TypeScript-native, 80k+ weekly downloads |
| None (fetch API) | HTTP client | Native browser API — no axios/ky needed for JSON POST/GET |
| `ulidx` | ULID correlation ID generation | Actively maintained, TypeScript-native, zero deps, monotonic support, ESM+CJS |

_Note: Avoid heavy dependencies like TanStack Query at this stage. The ETag caching pattern requires custom header management that TanStack Query doesn't natively support. A lightweight custom implementation is more appropriate._
_Source: [TanStack Query ETag Discussion](https://github.com/TanStack/query/discussions/4454)_

**TypeScript Contract Interfaces (mirroring C# models):**

```typescript
// Commands
interface SubmitCommandRequest {
  tenant: string;
  domain: string;
  aggregateId: string;
  commandType: string;
  payload: unknown;
  extensions?: Record<string, string>;
}

interface SubmitCommandResponse {
  correlationId: string;
}

interface CommandStatusResponse {
  correlationId: string;
  status: CommandStatus;
  statusCode: number;
  timestamp: string;
  aggregateId?: string;
  eventCount?: number;
  rejectionEventType?: string;
  failureReason?: string;
  timeoutDuration?: string;
}

type CommandStatus =
  | "Received" | "Processing" | "EventsStored"
  | "EventsPublished" | "Completed"
  | "Rejected" | "PublishFailed" | "TimedOut";

// Queries
interface SubmitQueryRequest {
  tenant: string;
  domain: string;
  aggregateId: string;
  queryType: string;
  payload?: unknown;
  entityId?: string;
}

interface SubmitQueryResponse {
  correlationId: string;
  payload: unknown;
}

// Validation
interface ValidateCommandRequest {
  tenant: string;
  domain: string;
  commandType: string;
  aggregateId?: string;
}

interface PreflightValidationResult {
  isAuthorized: boolean;
  reason?: string;
}

// Errors (RFC 9457)
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  correlationId?: string;
  tenantId?: string;
}
```

### Testing and Quality Assurance

**Testing Strategy:**

| Layer | Approach | Tool |
|-------|----------|------|
| TypeScript types | Compile-time validation | `tsc --noEmit` |
| HTTP client | Mock fetch with MSW (Mock Service Worker) | `msw` + `vitest` |
| Hooks | React Testing Library `renderHook` | `@testing-library/react` |
| SignalR | Mock HubConnection | `vitest` mock of `@microsoft/signalr` |
| Integration | Against running CommandApi | `vitest` + Aspire dev topology |
| E2E | Full browser flow | Playwright |

**Key Test Scenarios:**
1. Command submit → poll → completed (happy path)
2. Command submit → poll → rejected (domain rejection)
3. Query with ETag → 304 Not Modified (cache hit)
4. SignalR ProjectionChanged → triggers query re-fetch
5. 429 Rate limit → respects Retry-After → retries
6. 401 Unauthorized → triggers OIDC re-authentication
7. Network disconnect → ConnectionHealth transitions → reconnect

### Deployment and Operations Practices

**Runtime Configuration:** FrontShell loads `/config.json` at startup (Kubernetes ConfigMap mount). The CQRS client reads `commandApiBaseUrl` from this config via the existing `ConnectionHealthProvider` context — no additional configuration needed.

**SignalR Hub URL:** Derived from `commandApiBaseUrl` + `/hubs/projection-changes`. No separate configuration required.

**Monitoring Integration:**
- Correlation IDs propagated from FrontShell → CommandApi → DAPR actors → OpenTelemetry
- Browser console logging with correlation ID for debugging
- ConnectionHealth context already provides health state for UI status indicators

### Implementation Architecture — Hook Composition

```
@hexalith/cqrs-client
├── core/
│   ├── types.ts              ← TypeScript interfaces (above)
│   ├── fetchClient.ts        ← Authenticated fetch wrapper
│   ├── problemDetails.ts     ← RFC 9457 error parser
│   └── correlationId.ts      ← ULID generation (ulidx) + header management
├── commands/
│   ├── useSubmitCommand.ts   ← POST /api/v1/commands → 202
│   ├── useCommandStatus.ts   ← GET /api/v1/commands/status/{id}
│   └── useCommandPipeline.ts ← Submit + poll combined
├── queries/
│   ├── useQuery.ts           ← POST /api/v1/queries with ETag
│   └── etagCache.ts          ← In-memory ETag store
├── notifications/
│   ├── useSignalR.ts         ← Hub connection lifecycle
│   └── useProjectionSubscription.ts ← JoinGroup/LeaveGroup + callback
├── validation/
│   └── useCanExecute.ts      ← Pre-flight authorization check
└── index.ts                  ← Public API exports
```

**Hook Dependencies (Context Consumption):**

| Hook | Consumes From |
|------|---------------|
| `fetchClient` | `useAuth()` → JWT token, `useTenant()` → active tenant |
| `useSubmitCommand` | `fetchClient` + `backendUrl` from ConnectionHealth |
| `useCommandStatus` | `fetchClient` + `backendUrl` |
| `useQuery` | `fetchClient` + `backendUrl` + `etagCache` |
| `useSignalR` | `backendUrl` + `useAuth()` → access token provider |
| `useProjectionSubscription` | `useSignalR` + `useTenant()` |
| `useCanExecute` | `fetchClient` + `backendUrl` |

### Risk Assessment and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| MediatR licensing change affects EventStore | Medium | Monitor — MediatR is server-side only, transparent to FrontShell |
| SignalR connection instability | Medium | Built-in auto-reconnect + group rejoin; fail-open design on server |
| ETag cache stale after extended offline | Low | SignalR reconnect triggers group rejoin → fresh notifications |
| Rate limit exhaustion | Medium | Pre-flight validation avoids unnecessary command submissions; Retry-After respected |
| JWT token expiry mid-operation | Medium | `oidc-client-ts` silent renew; retry on 401 with fresh token |
| Large projection payloads | Low | ETag caching avoids re-download; 304 is zero-body |

## Technical Research Recommendations

### Implementation Roadmap

1. **Week 1:** Foundation — `fetchClient.ts`, `types.ts`, `problemDetails.ts`, `correlationId.ts`
2. **Week 2:** Commands — `useSubmitCommand`, `useCommandStatus`, `useCommandPipeline`
3. **Week 3:** Queries — `useQuery` with ETag caching
4. **Week 4:** SignalR — `useSignalR`, `useProjectionSubscription`, query cache invalidation
5. **Week 5:** Validation + polish — `useCanExecute`, error UX, rate limit handling

### Technology Stack Recommendations

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| HTTP client | Native `fetch` | No additional dependency; sufficient for JSON API |
| SignalR client | `@microsoft/signalr` | Official, TypeScript-native, well-maintained |
| State management | React hooks + Context | Matches existing FrontShell architecture |
| ETag storage | In-memory Map | Simple, resets on page refresh (acceptable for projections) |
| ID generation | `ulidx` (ULID) | Lexicographically sortable, timestamp-embedded, monotonic, TypeScript-native |
| Testing | Vitest + MSW + RTL | Already in FrontShell dev stack |

### Skill Development Requirements

| Skill | Priority | Context |
|-------|----------|---------|
| CQRS client-side patterns | High | Core to `@hexalith/cqrs-client` implementation |
| SignalR JS client API | High | Real-time notification integration |
| ETag / conditional request handling | Medium | Query caching optimization |
| RFC 9457 ProblemDetails | Medium | Structured error handling |
| React hook composition | Already known | Existing FrontShell pattern |

### Success Metrics and KPIs

| Metric | Target |
|--------|--------|
| Command round-trip (submit → completed) | < 500ms p95 |
| Query cache hit rate (304 Not Modified) | > 60% after initial load |
| SignalR notification delivery latency | < 100ms p99 (server-side NFR38) |
| FrontShell bundle size increase | < 50KB gzipped (SignalR client ~30KB) |
| Test coverage for cqrs-client | > 80% line coverage |

_Sources:_
- _[use-cqrs — React hooks for CQRS](https://github.com/thachp/use-cqrs)_
- _[@microsoft/signalr npm](https://www.npmjs.com/package/@microsoft/signalr)_
- _[react-use-signalr hooks](https://github.com/pguilbert/react-use-signalr)_
- _[ETag/If-None-Match caching](https://dev.to/didof/web-caching-etagif-none-match-517n)_
- _[Caching headers for frontend developers](https://blog.logrocket.com/caching-headers-a-practical-guide-for-frontend-developers/)_

## Research Synthesis: Hexalith.EventStore Interaction Patterns

### Executive Summary

Hexalith.EventStore is a distributed CQRS/Event Sourcing system built on .NET 10 and DAPR 1.17.3, designed for multi-tenant command processing with per-tenant isolation at every layer. The system exposes its capabilities through a well-defined REST API gateway (CommandApi) and a SignalR hub for real-time projection change notifications.

**FrontShell (React 19 SPA) communicates with EventStore exclusively via HTTP REST and WebSocket (SignalR) — DAPR is invisible to the frontend.** The integration surface is clean, well-documented, and ready for consumption, but the client-side implementation (`@hexalith/cqrs-client`) has not yet been built.

**Key Technical Findings:**

- **6 REST endpoints** fully specified: command submission (202 Accepted), status polling, query execution (with 2-gate ETag caching), pre-flight validation, and command replay
- **SignalR signal-only notifications** — broadcasts `{projectionType, tenantId}` to trigger cache invalidation, no payload data transmitted
- **5-step actor pipeline** provides idempotency, tenant isolation, snapshot-assisted rehydration, domain invocation, and atomic event persistence with crash recovery
- **4-layer tenant isolation** ensures complete data segregation (input validation → key prefixing → actor scoping → JWT claims)
- **Convention-based discovery** eliminates manual registration — domain processors found via reflection at startup

**Strategic Recommendations:**

1. Build `@hexalith/cqrs-client` incrementally across 5 phases (foundation → commands → queries → SignalR → validation)
2. Use native `fetch` + `@microsoft/signalr` + `ulidx` — minimal dependencies, ~30KB gzipped addition
3. Implement ETag caching with custom `If-None-Match`/`304` handling for query optimization
4. Leverage existing FrontShell contexts (auth, tenant, connection health) as hook dependencies
5. Test across 6 layers: TypeScript types → HTTP client → hooks → SignalR → integration → E2E

### Table of Contents

1. [Technical Research Scope Confirmation](#technical-research-scope-confirmation)
2. [Technology Stack Analysis](#technology-stack-analysis)
   - Programming Languages & Runtime
   - Development Frameworks and Libraries
   - Database and Storage Technologies
   - Development Tools and Platforms
   - Cloud Infrastructure and Deployment
   - Technology Adoption Trends
3. [Integration Patterns Analysis](#integration-patterns-analysis)
   - API Design Patterns — CommandApi REST Surface
   - Communication Protocols (HTTP + WebSocket)
   - Data Formats and Standards (JSON + RFC 9457)
   - Real-Time Notifications — SignalR Integration
   - Integration Security Patterns
   - FrontShell Integration Surface — Current State
4. [Architectural Patterns and Design](#architectural-patterns-and-design)
   - System Architecture Patterns (4-tier distributed CQRS/ES)
   - Design Principles (5-step pipeline, convention discovery, errors as values)
   - Scalability and Performance Patterns (snapshots, 3-tier queries, ETag caching)
   - Crash Recovery and Resilience (checkpointing, drain recovery, dead-letter)
   - Security Architecture (4-layer tenant isolation, dual-mode auth)
   - Data Architecture (immutable streams, gapless sequences, CloudEvents 1.0)
   - Deployment and Operations (Aspire orchestration, OpenTelemetry)
5. [Implementation Approaches and Technology Adoption](#implementation-approaches-and-technology-adoption)
   - Technology Adoption Strategy — 5-Phase Incremental Build
   - Development Workflows and Tooling
   - TypeScript Contract Interfaces
   - Testing and Quality Assurance
   - Implementation Architecture — Hook Composition
   - Risk Assessment and Mitigation
6. [Technical Research Recommendations](#technical-research-recommendations)
   - Implementation Roadmap
   - Technology Stack Recommendations
   - Success Metrics and KPIs

### Research Goals Achievement

**Original Goals:** Document existing internal architecture (contracts, handlers, projections) AND integration surface for FrontShell consumption.

**Achieved:**

| Goal | Status | Evidence |
|------|--------|----------|
| Internal architecture documented | ✅ Complete | 5-step pipeline, actor model, event persistence, query routing, snapshot rehydration — all key source files analyzed |
| Contracts catalogued | ✅ Complete | CommandEnvelope, EventEnvelope, DomainResult, AggregateIdentity, IQueryContract, ProjectionChangedNotification |
| Handlers documented | ✅ Complete | IDomainProcessor, EventStoreAggregate<TState> convention-based dispatch, MediatR pipeline handlers |
| Projections documented | ✅ Complete | IEventStoreProjection<TReadModel>, 3-tier query routing, ETag-based cache validation, SignalR notification |
| Integration surface mapped | ✅ Complete | 6 REST endpoints + SignalR hub with full request/response schemas, auth, rate limiting, error format |
| FrontShell gap analysis | ✅ Complete | Empty `@hexalith/cqrs-client` stub identified; hook composition architecture designed |
| Implementation roadmap | ✅ Complete | 5-phase build plan with TypeScript interfaces, hook dependencies, and testing strategy |

### Comprehensive Source Documentation

**Primary Technical Sources (Codebase):**
- `Hexalith.EventStore.Contracts/` — CommandEnvelope, EventEnvelope, AggregateIdentity, DomainResult, IQueryContract
- `Hexalith.EventStore.Client/` — EventStoreAggregate<TState>, IDomainProcessor, AssemblyScanner, IProjectionChangeNotifier
- `Hexalith.EventStore.Server/` — AggregateActor (5-step pipeline), EventPersister, EventPublisher, EventStreamReader, QueryRouter
- `Hexalith.EventStore.CommandApi/` — Controllers (Commands, Status, Queries, Validation, Replay), SignalR Hub, JWT Auth, Rate Limiting
- `Hexalith.EventStore.SignalR/` — EventStoreSignalRClient, subscription model, reconnection
- `FrontShell packages/` — shell-api (auth, tenant, connection health), cqrs-client (empty stub), shell (providers, config)

**Web Verification Sources:**
- [DAPR Actors Overview](https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/)
- [DAPR Aspire Integration](https://v1-16.docs.dapr.io/developing-applications/sdks/dotnet/dotnet-integrations/dotnet-development-dapr-aspire/)
- [.NET Aspire & DAPR Complementarity](https://www.diagrid.io/blog/net-aspire-dapr-what-are-they-and-how-they-complement-each-other)
- [CQRS Pattern — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Event Sourcing Pattern — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [Actor Model and Event Sourcing](https://blog.softwaremill.com/actor-model-and-event-sourcing-aa00993d2f1e)
- [DAPR Actors for Scalable Workflows](https://www.diagrid.io/blog/understanding-dapr-actors-for-scalable-workflows-and-ai-agents)
- [Exposing CQRS Through a RESTful API](https://www.infoq.com/articles/rest-api-on-cqrs/)
- [MediatR Pipeline Behaviors](https://toxigon.com/mediatr-pipeline-behaviors-in-dotnet)
- [CQRS with MediatR](https://vabtech.wordpress.com/2025/06/06/cqrs-with-mediatr-command-and-query-separation-in-net/)
- [SignalR Real-Time Apps](https://oneuptime.com/blog/post/2026-01-29-realtime-apps-signalr-dotnet/view)
- [Integrating SignalR with React.js](https://medium.com/@iAmrAmosh/integrating-signalr-with-react-js-for-real-time-notifications-5aedeb281e3d)
- [@microsoft/signalr npm](https://www.npmjs.com/package/@microsoft/signalr)
- [ETag/If-None-Match Caching](https://dev.to/didof/web-caching-etagif-none-match-517n)
- [ulidx — TypeScript ULID generator](https://github.com/perry-mitchell/ulidx)
- [CQRS Best Practices](https://github.com/slashdotdash/cqrs-best-practices)
- [Event Sourcing & CQRS — Microservices.io](https://microservices.io/patterns/data/event-sourcing.html)
- [AWS Event Sourcing Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/event-sourcing.html)

### Technical Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| CommandApi endpoint contracts | **HIGH** | Read directly from controller source code |
| SignalR hub protocol | **HIGH** | Read from hub + client source code |
| 5-step actor pipeline | **HIGH** | Read from AggregateActor.cs (471 lines) |
| Tenant isolation model | **HIGH** | Verified across 4 layers in source |
| FrontShell gap analysis | **HIGH** | Confirmed `export {};` in cqrs-client |
| DAPR 1.17.3 compatibility | **MEDIUM** | Version specified by user; patterns verified against 1.16 docs |
| Implementation timeline estimates | **LOW** | Estimates based on complexity analysis, not empirical data |

---

**Technical Research Completion Date:** 2026-03-15
**Research Period:** Comprehensive codebase analysis + current web verification
**Source Verification:** All technical facts verified against source code and/or current web sources
**Technical Confidence Level:** High — based on direct source code analysis and multiple authoritative references

_This technical research document serves as the authoritative reference for Hexalith.EventStore interaction patterns and provides the implementation blueprint for building the `@hexalith/cqrs-client` package in FrontShell._

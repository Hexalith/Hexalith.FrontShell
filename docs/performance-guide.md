# Performance & Bundle Optimization Guide

How Hexalith FrontShell handles code splitting, caching, and build performance.

## Architecture Overview

```
Browser request
  → index.html (no-cache, always fresh)
  → main app chunk (content-hashed, 1-year cache)
  → vendor chunks (content-hashed, 1-year cache)
  → module chunks (lazy-loaded on route navigation)
```

Key principle: **vendor code is split into stable chunks** that cache independently from application code. Module pages load on demand via `React.lazy()`.

---

## Chunk Splitting Strategy

The shell splits bundles into vendor groups via `apps/shell/vite.config.ts`:

| Chunk | Contains | Why |
|-------|----------|-----|
| `react-vendor` | React, React DOM | Core framework — rarely changes |
| `router-vendor` | React Router | Routing layer |
| `query-vendor` | TanStack React Query | State management |
| `radix-vendor` | Radix UI primitives | Component library internals |
| `signalr-vendor` | Microsoft SignalR | Real-time communication |
| `index` | Shell application code | Changes frequently |
| Per-page chunks | `OrderListPage`, `TenantDetailPage`, etc. | Loaded on navigation |

When you update application code, only the `index` chunk changes. Vendor chunks stay cached in browsers.

---

## Code Splitting & Lazy Loading

### Route-Based Splitting

Every module page uses `React.lazy()` in its `routes.tsx`:

```tsx
const OrderListPage = lazy(() =>
  import("./pages/OrderListPage").then((m) => ({ default: m.OrderListPage }))
);

// Routes use Suspense with Skeleton fallback
<Suspense fallback={<Skeleton variant="table" />}>
  <OrderListPage />
</Suspense>
```

### Dynamic Module Loading

The shell discovers modules at build time via `import.meta.glob()`:

- Manifests are loaded **eagerly** (needed for sidebar/routing)
- Page components are loaded **lazily** (only when navigated to)

### Chunk Load Resilience

`apps/shell/src/modules/lazyWithRetry.ts` wraps `React.lazy()` with automatic retry:

- Detects chunk load failures (network errors, deploy mismatches)
- Retries up to 2 times with 1-second delay
- Non-chunk errors throw immediately (no masking)

---

## Caching Strategy

### Browser Caching (nginx.conf)

| Path | Cache Policy | Reason |
|------|-------------|--------|
| `index.html` | `no-cache` | Entry point — must always be fresh |
| `config.json` | `no-cache` | Runtime config — changes per deploy |
| `/assets/*` | `max-age=31536000, immutable` | Content-hashed — safe to cache 1 year |

Vite generates content hashes in filenames (e.g., `index-BPRu6-kX.js`), so new deploys produce new URLs and old cached assets are never served.

### Build Caching (Turborepo)

Turborepo caches build outputs (`dist/**`) locally. Repeated builds skip work if inputs haven't changed.

Optional remote caching:

```bash
# Set in CI environment
TURBO_TOKEN=your-token
TURBO_TEAM=your-team
```

### Compression

gzip is enabled in nginx for HTML, CSS, JavaScript, and JSON responses.

---

## Library Builds

Foundation packages (`ui`, `cqrs-client`, `shell-api`) use tsup:

- **Format:** ESM only (no CommonJS overhead)
- **Declarations:** TypeScript `.d.ts` files generated
- **Clean builds:** Output directory cleared on each run
- **Tree-shakeable:** ESM enables dead-code elimination in the shell build

---

## CI Performance Gates

### Build Duration Tracking

On the main branch, CI measures build time and compares to a rolling average:

- Stores last 10 build times in `.build-times.json`
- Warns if current build exceeds **120%** of the average
- Informational only — does not block merges

### Bundle Freshness Validation

`pnpm check:bundle-freshness` runs on every CI build and validates:

1. Version match between `shell-api` and AI knowledge bundle
2. Staleness warning if >30 days since last sync
3. All manifest fields documented
4. All hooks documented
5. All components documented
6. Required bundle files exist
7. AI prompt templates reference current APIs

### Contract Verification

Consumer contract tests validate frontend expectations of backend API shapes. CI fails if contracts break.

---

## Docker Build

Multi-stage Dockerfile:

1. **Builder** — Node 22 Alpine, pnpm install + build
2. **Runtime** — nginx Alpine, copies `dist/` only

The runtime image contains only static files and nginx — no Node.js.

---

## Font Loading

Variable fonts (Inter, JetBrains Mono) are bundled as WOFF2 subsets with content hashes. They load with the main CSS bundle and cache for 1 year.

---

## What's Not Set Up (Future Opportunities)

These are not configured today but could be added:

- **Bundle visualization** — `rollup-plugin-visualizer` for treemap views
- **Size budgets** — Per-chunk size limits in Vite config
- **Lighthouse CI** — Automated performance scoring
- **Web Vitals** — Runtime CLS/LCP/FID collection
- **Preload hints** — `<link rel="modulepreload">` for critical module chunks

---

## Quick Reference

```bash
# Full production build
pnpm build

# Build just the shell
pnpm --filter @hexalith/shell build

# Check bundle freshness
pnpm check:bundle-freshness

# Dev server (no optimization, HMR enabled)
pnpm dev
```

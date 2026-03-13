# Story 1.4: Shell API — Tenant, Theme & Locale Providers

Status: done

<!-- Validated: 2026-03-13 — implementation reviewed, review follow-up fixes applied, codebase assumptions re-verified -->

## Story

As a module developer,
I want to access current tenant, theme preference, and locale through shell-provided context,
So that my module renders correctly for the active tenant in the user's preferred theme and language.

## Scope Boundaries

### IN Scope

- `TenantProvider` + `useTenant` in `packages/shell-api/src/tenant/` — reads tenant claims from `useAuth()`, manages active tenant state
- `ThemeProvider` + `useTheme` in `packages/shell-api/src/theme/` — manages `'light' | 'dark'` theme, sets `data-theme` on `document.documentElement`, persists to localStorage
- `LocaleProvider` + `useLocale` in `packages/shell-api/src/locale/` — wraps `Intl.*` APIs, exposes `defaultCurrency` (prop-driven, future: from tenant config)
- `ModuleManifest` type in `packages/shell-api/src/manifest/manifestTypes.ts` — discriminated union with `manifestVersion`
- `MockShellProvider` in `packages/shell-api/src/testing/` — wraps all mock contexts for tests + Storybook
- `createMockAuthContext.ts` (NEW — extracted from Story 1.3 inline test mocks)
- `createMockTenantContext.ts` (NEW)
- Updated barrel exports in `src/index.ts`, new types in `src/types.ts`
- Co-located Vitest tests; ATDD: failing tests written BEFORE implementation (Epic 1 mandate)

### OUT of Scope

- Shell provider hierarchy composition (Story 1.5)
- Status bar tenant display / switching UI (Story 1.6)
- Runtime `/config.json` loading (Story 1.7)
- HTTP client tenant injection via ky (Story 2.2)
- Tenant-scoped cache invalidation on switch (Story 2.4)
- RTL layout, command palette, user locale from backend (Phase 2)
- `validateManifest` runtime function (Story 4.5)
- Any UI components — pure provider/hook/types story

## Dependencies

- **Story 1.1** (Monorepo Scaffold) — `packages/shell-api/` stub. **Done**
- **Story 1.2** (Design Tokens) — `:root[data-theme="light|dark"]` CSS. **Done**
- **Story 1.3** (Auth Provider) — `AuthProvider`, `useAuth()`, `AuthUser.tenantClaims`. **Done**
- No blocking dependencies — proceed immediately

## Acceptance Criteria

| AC  | Summary                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------- |
| #1  | `useTenant()` returns `{ activeTenant, availableTenants, switchTenant }` from JWT claims                   |
| #2  | `useTheme()` returns `{ theme, toggleTheme }`; sets `data-theme` attr; persists to localStorage            |
| #3  | `useLocale()` returns `{ locale, defaultCurrency, formatDate, formatNumber, formatCurrency }` via `Intl.*` |
| #4  | `ModuleManifest` type enforces required fields with `manifestVersion` discriminated union                  |
| #5  | All hooks throw `'{hookName} must be used within {ProviderName}'` outside their provider                   |
| #6  | `MockShellProvider` wraps all mock contexts with optional config overrides                                 |

**Detailed BDD:**

1. **Given** `TenantProvider` and `useTenant` are implemented
   **When** `useTenant()` is called
   **Then** returns `{ activeTenant, availableTenants, switchTenant }` with `availableTenants` from `useAuth().user.tenantClaims`

2. **Given** `ThemeProvider` and `useTheme` are implemented
   **When** `useTheme()` is called
   **Then** returns `{ theme, toggleTheme }` where theme is `'light' | 'dark'`
   **And** sets `data-theme` on `document.documentElement`, persists to `localStorage` (key: `hexalith-theme`)

3. **Given** `LocaleProvider` and `useLocale` are implemented
   **When** `useLocale()` is called
   **Then** returns `{ locale, defaultCurrency, formatDate, formatNumber, formatCurrency }` using `Intl.*` APIs
   **And** `defaultCurrency` is provided via prop (defaults to `'USD'`; future: from tenant config per UX spec)

4. **Given** `ModuleManifest` type is defined
   **When** creating a manifest
   **Then** TypeScript enforces `name`, `displayName`, `version`, `routes`, `navigation`
   **And** `manifestVersion` discriminated union rejects unknown versions at compile time

5. **Given** any hook is called outside its provider
   **Then** throws exactly: `'{hookName} must be used within {ProviderName}'`

6. **Given** `MockShellProvider` is implemented
   **When** imported for testing/Storybook
   **Then** wraps all mock contexts (auth + tenant + theme + locale); custom props **completely override** defaults (no partial merge)

## Tasks / Subtasks

### ATDD Phase

- [x] Task 0: Write failing acceptance tests from ACs (AC: #1-#6)
  - [x] 0.1 `tenant/TenantProvider.test.tsx` — tests for AC #1, #5
  - [x] 0.2 `theme/ThemeProvider.test.tsx` — tests for AC #2, #5
  - [x] 0.3 `locale/LocaleProvider.test.tsx` — tests for AC #3, #5
  - [x] 0.4 `manifest/manifestTypes.test.ts` — compile-time type assertion tests for AC #4
  - [x] 0.5 `testing/MockShellProvider.test.tsx` — tests for AC #6
  - [x] 0.6 Verify `pnpm --filter @hexalith/shell-api test` — all tests fail (red phase)

### Implementation Phase

- [x] Task 1: Define types in `src/types.ts`
  - [x] 1.1 `TenantContextValue`: `{ activeTenant: string | null, availableTenants: string[], switchTenant: (tenantId: string) => void }`
  - [x] 1.2 `ThemeContextValue`: `{ theme: Theme, toggleTheme: () => void }` and `type Theme = 'light' | 'dark'`
  - [x] 1.3 `LocaleContextValue`: `{ locale: string, defaultCurrency: string, formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string, formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string, formatCurrency: (value: number, currency: string, options?: Intl.NumberFormatOptions) => string }`

- [x] Task 2: Define `ModuleManifest` type in `manifest/manifestTypes.ts`
  - [x] 2.1 `ModuleManifestV1`: `{ manifestVersion: 1, name, displayName, version, routes: ModuleRoute[], navigation: ModuleNavigation[] }`
  - [x] 2.2 `type ModuleManifest = ModuleManifestV1` (union grows with future versions)
  - [x] 2.3 `ModuleRoute`: `{ path: string }` / `ModuleNavigation`: `{ label, path, icon?, category? }`

- [x] Task 3: Implement TenantProvider
  - [x] 3.1 Create `tenant/TenantProvider.tsx` — calls `useAuth()` internally to read `user.tenantClaims` (MUST render inside AuthProvider tree)
  - [x] 3.2 Derive `availableTenants` via `useMemo(() => user?.tenantClaims ?? [], [user?.tenantClaims])` — no useState cache, reactive to silent refresh
  - [x] 3.3 Initialize `activeTenant` to `availableTenants[0] ?? null`
  - [x] 3.4 `switchTenant(tenantId)`: validate in availableTenants, update state. Invalid ID or empty list: `console.warn()` + no-op (no throw). Wrap in `useCallback`.
  - [x] 3.5 Eviction: when `availableTenants` changes, keep `activeTenant` if still in list; else reset to `[0] ?? null`. Compare by `JSON.stringify(prev) !== JSON.stringify(curr)` — not by reference.
  - [x] 3.6 Memoize entire `TenantContextValue` via `useMemo` keyed on `[activeTenant, availableTenants, switchTenant]`

- [x] Task 4: Implement `useTenant` hook in `tenant/useTenant.ts`
  - [x] 4.1 Import `TenantContext` from `./TenantProvider` (file-level, not barrel)
  - [x] 4.2 Null check throws: `"useTenant must be used within TenantProvider"`

- [x] Task 5: Implement ThemeProvider
  - [x] 5.1 Create `theme/ThemeProvider.tsx`
  - [x] 5.2 Init priority: (1) `localStorage.getItem('hexalith-theme')` — discard if not `'light'`/`'dark'`, (2) `matchMedia('(prefers-color-scheme: dark)')`, (3) default `'light'`
  - [x] 5.3 FOUC prevention: set `document.documentElement.setAttribute('data-theme', ...)` synchronously in `useState` initializer. Use `useEffect` only for subsequent changes.
  - [x] 5.4 Persist to `localStorage.setItem('hexalith-theme', theme)` on change
  - [x] 5.5 `toggleTheme()` via `useCallback` (no deps — flips current state)
  - [x] 5.6 Memoize `ThemeContextValue` via `useMemo` keyed on `theme`
  - [x] 5.7 Define `const THEME_STORAGE_KEY = 'hexalith-theme'` — no magic strings

- [x] Task 6: Implement `useTheme` hook in `theme/useTheme.ts`
  - [x] 6.1 Null check throws: `"useTheme must be used within ThemeProvider"`

- [x] Task 7: Implement LocaleProvider
  - [x] 7.1 Create `locale/LocaleProvider.tsx`
  - [x] 7.2 Init locale from `navigator.language`; accept optional `locale` prop override
  - [x] 7.3 Accept optional `defaultCurrency` prop (defaults to `'USD'`). UX spec: future stories wire tenant-specific currency here.
  - [x] 7.4 `formatDate(date: string | Date)`: parse ISO 8601 strings via `new Date(isoString)` internally, format via `Intl.DateTimeFormat`. Memoize via `useCallback` keyed on `locale`.
  - [x] 7.5 `formatNumber`: `Intl.NumberFormat`. Memoize via `useCallback` keyed on `locale`.
  - [x] 7.6 `formatCurrency(value, currency)`: `Intl.NumberFormat` with `{ style: 'currency', currency }`. Throws `RangeError` for invalid ISO 4217 codes — caller's responsibility. Memoize via `useCallback` keyed on `locale`.
  - [x] 7.7 Memoize entire `LocaleContextValue` via `useMemo` keyed on `[locale, defaultCurrency]`

- [x] Task 8: Implement `useLocale` hook in `locale/useLocale.ts`
  - [x] 8.1 Null check throws: `"useLocale must be used within LocaleProvider"`

- [x] Task 9: Implement MockShellProvider + test factories
  - [x] 9.1 Create `testing/MockShellProvider.tsx` wrapping Auth, Tenant, Theme, Locale mock contexts (NOT react-oidc-context)
  - [x] 9.2 Create `testing/createMockAuthContext.ts` (NEW file — extract from Story 1.3 inline test mocks). Provides ALL `AuthContextValue` fields with spy-capable default callbacks for `signinRedirect` and `signoutRedirect` without introducing a runtime `vitest` dependency.
  - [x] 9.3 Create `testing/createMockTenantContext.ts` — defaults: `{ activeTenant: 'test-tenant', availableTenants: ['test-tenant'], switchTenant: spy-capable callback }`
  - [x] 9.4 Props: `authContext?`, `tenantContext?`, `theme?`, `locale?`, `defaultCurrency?`. Custom props **completely override** defaults (no merge — caller provides all required fields or uses factory defaults).
  - [x] 9.5 MUST replicate real provider nesting order: Auth → Tenant → Theme → Locale

- [x] Task 10: Update barrel exports in `src/index.ts`
  - [x] 10.1 Export providers, hooks, types, testing utilities (see Barrel Exports section)
  - [x] 10.2 Do NOT export `TenantContext`, `ThemeContext`, `LocaleContext` (internal only)

### Validation Phase

- [x] Task 11: Green phase
  - [x] 11.1 `pnpm --filter @hexalith/shell-api test` — all tests pass (67/67 across 7 files)
  - [x] 11.2 `pnpm --filter @hexalith/shell-api build` — builds with new exports (10.37 KB ESM + 3.47 KB DTS)
  - [x] 11.3 `pnpm --filter @hexalith/shell-api lint` — no violations

## Dev Notes

### Critical Implementation Checklist

**TenantProvider:**

- [ ] Calls `useAuth()` internally — MUST render inside AuthProvider tree
- [ ] Derives `availableTenants` via `useMemo(() => user?.tenantClaims ?? [], [user?.tenantClaims])` — no useState snapshot
- [ ] Guards null user: `user?.tenantClaims ?? []` → availableTenants `[]`, activeTenant `null`
- [ ] Resets activeTenant by value comparison (`JSON.stringify`), not reference — only when set changes or activeTenant evicted
- [ ] Memoizes `TenantContextValue` via `useMemo` keyed on `[activeTenant, availableTenants, switchTenant]`
- [ ] `switchTenant`: validates in list, no-op + `console.warn` if invalid/empty — never throws

**ThemeProvider:**

- [ ] Sets `data-theme` on `document.documentElement` (`:root`) — NOT a wrapper div (Story 1.2 CSS uses `:root[data-theme=...]`)
- [ ] FOUC prevention: sets `data-theme` synchronously in `useState` initializer, NOT just in `useEffect`
- [ ] Init priority: (1) localStorage `hexalith-theme`, (2) `matchMedia('(prefers-color-scheme: dark)')`, (3) default `'light'`
- [ ] Validates localStorage: discards if not `'light'`/`'dark'` (corrupted → fall through to matchMedia)
- [ ] Memoizes `ThemeContextValue` via `useMemo`; `toggleTheme` stable via `useCallback` (no deps)
- [ ] `THEME_STORAGE_KEY = 'hexalith-theme'` constant — no magic strings

**LocaleProvider:**

- [ ] Uses `Intl.*` APIs only — NO i18next, react-intl, or any i18n library
- [ ] `formatDate` accepts `string | Date`; parses ISO 8601 strings via `new Date(isoString)` internally
- [ ] All formatters memoized via `useCallback` keyed on `locale`
- [ ] Context value memoized via `useMemo` keyed on `[locale, defaultCurrency]`
- [ ] `defaultCurrency` from prop (defaults `'USD'`); future: wired from tenant config
- [ ] `formatCurrency` does NOT catch `RangeError` for invalid ISO 4217 codes — caller's responsibility

**All Providers:**

- [ ] Hook error format: exactly `'{hookName} must be used within {ProviderName}'` — no other text
- [ ] Context objects exported from provider file (file-level), NOT from barrel
- [ ] Explicit `React.JSX.Element` return type on all providers (DTS generation — Story 1.3 learning)
- [ ] No new dependencies — React Context + browser APIs only

### Provider Pattern (from Story 1.3 AuthProvider)

```typescript
// Replicate for all three providers:
const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: TenantProviderProps): React.JSX.Element {
  const { user } = useAuth(); // reads auth context — must be inside AuthProvider
  // ... derive availableTenants, manage activeTenant
  return <TenantContext.Provider value={memoizedValue}>{children}</TenantContext.Provider>;
}

// Separate file (useTenant.ts):
import { TenantContext } from './TenantProvider'; // file-level import, NOT barrel
export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
```

**TenantProvider does NOT need the "bridge" pattern from AuthProvider** — it calls our own `useAuth()` hook (not wrapping an external library like react-oidc-context).

### FOUC Prevention Pattern (ThemeProvider)

```typescript
const [theme, setTheme] = useState<Theme>(() => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    document.documentElement.setAttribute("data-theme", stored);
    return stored;
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = prefersDark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", initial);
  return initial;
});
// useEffect only for subsequent changes (toggleTheme updates)
```

### Type Definitions

```typescript
// packages/shell-api/src/types.ts — ADD to existing file (keep AuthUser, AuthContextValue)

export type Theme = "light" | "dark";

export interface TenantContextValue {
  activeTenant: string | null;
  availableTenants: string[];
  switchTenant: (tenantId: string) => void;
}

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

export interface LocaleContextValue {
  locale: string;
  defaultCurrency: string;
  formatDate: (
    date: string | Date,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (
    value: number,
    currency: string,
    options?: Intl.NumberFormatOptions,
  ) => string;
}
```

### Provider Props (explicit interfaces for DTS)

```typescript
export interface TenantProviderProps {
  children: ReactNode;
}
export interface ThemeProviderProps {
  children: ReactNode;
}
export interface LocaleProviderProps {
  locale?: string; // BCP 47 tag override; defaults to navigator.language
  defaultCurrency?: string; // ISO 4217 code; defaults to 'USD'
  children: ReactNode;
}
```

### ModuleManifest Type (types-only — no runtime validation until Story 4.5)

```typescript
interface ModuleManifestV1 {
  manifestVersion: 1;
  name: string; // Package name (e.g., 'tenants')
  displayName: string; // Human-readable (e.g., 'Tenant Management')
  version: string; // Semver (e.g., '0.1.0')
  routes: ModuleRoute[];
  navigation: ModuleNavigation[];
}
type ModuleManifest = ModuleManifestV1; // Union grows: V1 | V2
interface ModuleRoute {
  path: string;
}
interface ModuleNavigation {
  label: string;
  path: string;
  icon?: string;
  category?: string;
}
```

### Barrel Exports (`src/index.ts`)

```typescript
// Auth (Story 1.3)
export { AuthProvider } from "./auth/AuthProvider";
export type { AuthProviderProps } from "./auth/AuthProvider";
export { useAuth } from "./auth/useAuth";

// Tenant
export { TenantProvider } from "./tenant/TenantProvider";
export { useTenant } from "./tenant/useTenant";

// Theme
export { ThemeProvider } from "./theme/ThemeProvider";
export { useTheme } from "./theme/useTheme";

// Locale
export { LocaleProvider } from "./locale/LocaleProvider";
export type { LocaleProviderProps } from "./locale/LocaleProvider";
export { useLocale } from "./locale/useLocale";

// Manifest types
export type {
  ModuleManifest,
  ModuleManifestV1,
  ModuleRoute,
  ModuleNavigation,
} from "./manifest/manifestTypes";

// Types
export type {
  AuthContextValue,
  AuthUser,
  TenantContextValue,
  ThemeContextValue,
  LocaleContextValue,
  Theme,
} from "./types";

// Testing utilities
export { MockShellProvider } from "./testing/MockShellProvider";
export { createMockAuthContext } from "./testing/createMockAuthContext";
export { createMockTenantContext } from "./testing/createMockTenantContext";
```

**NOT exported:** `AuthContext`, `TenantContext`, `ThemeContext`, `LocaleContext`

### Architecture Compliance

| Package             | May Import From                           | MUST NOT Import From                |
| ------------------- | ----------------------------------------- | ----------------------------------- |
| @hexalith/shell-api | React, oidc-client-ts, react-oidc-context | @hexalith/cqrs-client, @hexalith/ui |

| Consumer              | Uses                                  | Story     |
| --------------------- | ------------------------------------- | --------- |
| @hexalith/cqrs-client | `useTenant()` for ky tenant injection | 2.2       |
| @hexalith/ui          | `useLocale()` for formatting          | 3.x       |
| Shell app             | All providers in ShellProviders.tsx   | 1.5       |
| Status bar            | `useTenant()` display                 | 1.6       |
| Module tests          | `MockShellProvider`                   | 3.9, 4.x+ |

**Provider nesting order (assembled in Story 1.5):** QueryClientProvider → AuthProvider → TenantProvider → ThemeProvider → LocaleProvider

### File Structure

```
packages/shell-api/src/
├── index.ts                          (MODIFIED)
├── types.ts                          (MODIFIED)
├── auth/                             (Story 1.3 — DONE, no changes)
│   ├── AuthProvider.tsx
│   ├── AuthProvider.test.tsx
│   └── useAuth.ts
├── tenant/                           (NEW)
│   ├── TenantProvider.tsx
│   ├── TenantProvider.test.tsx
│   └── useTenant.ts
├── theme/                            (NEW)
│   ├── ThemeProvider.tsx
│   ├── ThemeProvider.test.tsx
│   └── useTheme.ts
├── locale/                           (NEW)
│   ├── LocaleProvider.tsx
│   ├── LocaleProvider.test.tsx
│   └── useLocale.ts
├── manifest/                         (NEW)
│   └── manifestTypes.ts
└── testing/                          (NEW)
    ├── MockShellProvider.tsx
    ├── MockShellProvider.test.tsx
    ├── createMockAuthContext.ts       (extracted from Story 1.3 inline mocks)
    └── createMockTenantContext.ts
```

**No changes needed:** `package.json`, `tsup.config.ts`, `vitest.config.ts`, `eslint.config.js`

### Security

- TenantProvider reads `user.tenantClaims` — never accesses raw JWT tokens
- `switchTenant()` validates tenantId in `availableTenants` — no arbitrary tenant switching
- localStorage stores only theme value (`'light'`/`'dark'`) — no PII, no tokens

### Testing

**Framework:** Vitest + `@testing-library/react` + jsdom (configured in Story 1.3). Call `cleanup()` in `afterEach`.

**Test cases by provider:**

| #   | Test                                                                                      | AC    |
| --- | ----------------------------------------------------------------------------------------- | ----- |
| 1   | useTenant returns `{ activeTenant, availableTenants, switchTenant }`                      | #1    |
| 2   | availableTenants from `user.tenantClaims`                                                 | #1    |
| 3   | activeTenant defaults to first tenant                                                     | #1    |
| 4   | switchTenant changes activeTenant                                                         | #1    |
| 5   | switchTenant invalid ID: warn + no-op                                                     | #1    |
| 6   | Auth user changes → tenants update                                                        | #1    |
| 7   | No tenant claims → activeTenant null, availableTenants []                                 | #1    |
| 8   | Auth loading → activeTenant null, availableTenants []                                     | #1    |
| 9   | Throws outside TenantProvider                                                             | #5    |
| 10  | availableTenants change, activeTenant still in list → keep                                | #1    |
| 11  | availableTenants change, activeTenant evicted → reset to [0]                              | #1    |
| 12  | Silent refresh with same claims → no activeTenant reset                                   | #1    |
| 13  | useTheme returns `{ theme, toggleTheme }`                                                 | #2    |
| 14  | Sets `data-theme` on `document.documentElement`                                           | #2    |
| 15  | toggleTheme switches light↔dark                                                           | #2    |
| 16  | Persists to localStorage `hexalith-theme`                                                 | #2    |
| 17  | Initializes from localStorage                                                             | #2    |
| 18  | Initializes from matchMedia when no localStorage                                          | #2    |
| 19  | Corrupted localStorage → falls to matchMedia                                              | #2    |
| 20  | localStorage precedence over matchMedia                                                   | #2    |
| 21  | Throws outside ThemeProvider                                                              | #5    |
| 22  | useLocale returns `{ locale, defaultCurrency, formatDate, formatNumber, formatCurrency }` | #3    |
| 23  | formatDate formats ISO 8601 string                                                        | #3    |
| 24  | formatNumber formats number                                                               | #3    |
| 25  | formatCurrency with currency code                                                         | #3    |
| 26  | defaultCurrency defaults to 'USD'                                                         | #3    |
| 27  | defaultCurrency prop override                                                             | #3    |
| 28  | Locale defaults to navigator.language                                                     | #3    |
| 29  | Locale prop overrides browser default                                                     | #3    |
| 30  | formatNumber locale="de-DE" → German formatting                                           | #3    |
| 31  | formatDate locale="de-DE" → German formatting                                             | #3    |
| 32  | formatCurrency locale="de-DE" currency="EUR" → German euro                                | #3    |
| 33  | Locale prop change → formatters update                                                    | #3    |
| 34  | Throws outside LocaleProvider                                                             | #5    |
| 35  | Valid ModuleManifest compiles                                                             | #4    |
| 36  | Missing required field → @ts-expect-error                                                 | #4    |
| 37  | manifestVersion: 2 → @ts-expect-error                                                     | #4    |
| 38  | MockShellProvider renders children                                                        | #6    |
| 39  | useTenant works inside MockShellProvider                                                  | #6    |
| 40  | useTheme works inside MockShellProvider                                                   | #6    |
| 41  | useLocale works inside MockShellProvider                                                  | #6    |
| 42  | useAuth works inside MockShellProvider                                                    | #6    |
| 43  | Custom overrides applied                                                                  | #6    |
| 44  | All 4 hooks work simultaneously (integration)                                             | #6    |
| 45  | Barrel exports all providers/hooks                                                        | #1-#6 |
| 46  | Barrel does NOT export internal contexts                                                  | #1-#6 |

**Key test patterns:**

```typescript
// Mock useAuth for TenantProvider tests — cleanest approach
vi.mock("../auth/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: {
      sub: "test-user",
      tenantClaims: ["tenant-a", "tenant-b"],
      name: "Test",
      email: "test@test.com",
    },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    signinRedirect: vi.fn(),
    signoutRedirect: vi.fn(),
  })),
}));
const mockUseAuth = vi.mocked(useAuth);
// Per-test override: mockUseAuth.mockReturnValue({ ...defaults, user: null });

// Error-outside-provider pattern
it("throws when used outside TenantProvider", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => renderHook(() => useTenant())).toThrow(
    "useTenant must be used within TenantProvider",
  );
  spy.mockRestore();
});

// matchMedia mock (jsdom doesn't support it)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Type assertion test for ModuleManifest
it("rejects manifest missing required fields", () => {
  // @ts-expect-error — missing required 'name' field
  const bad: ModuleManifest = {
    manifestVersion: 1,
    displayName: "Test",
    version: "0.1.0",
    routes: [],
    navigation: [],
  };
  expect(bad).toBeDefined();
});

// Export verification
it("does not export internal contexts from barrel", async () => {
  const barrel = await import("../index");
  expect("TenantContext" in barrel).toBe(false);
  expect("ThemeContext" in barrel).toBe(false);
  expect("LocaleContext" in barrel).toBe(false);
});
```

### Previous Story Intelligence (Story 1.3)

**Reuse:** Context+Provider pattern, file-level context export, hook in separate file, `cleanup()` in afterEach, explicit `React.JSX.Element` return types.

**Codebase facts:** Tenant claims already normalized in AuthProvider (`undefined→[], string→[string], array→filter(string)`). TenantProvider reads the clean `tenantClaims: string[]` from `AuthUser`. No ESLint overrides needed (no new external libraries). Story 1.3 has 16 passing tests — new tests must not break them.

### References

- epics.md — Epic 1 overview, Story 1.4 ACs, ATDD mandate, parallel tracks
- architecture.md — Provider pattern, nesting order, shell-api file structure, package rules, naming conventions
- ux-design-specification.md — Theme: data-theme + semantic tokens, locale: Intl.\* APIs, defaultCurrency from tenant config
- prd.md — FR32 (tenant context), FR34 (tenant info), FR38 (tenant switching)
- 1-3-shell-api-authentication-provider.md — AuthProvider patterns, debug learnings, DTS fix, test patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

2026-03-13 review follow-up: aligned `TenantProvider` tenant-list change detection with content-based comparison, replaced plain no-op mock callbacks with spy-capable test helpers that remain runtime-safe for Storybook/test utility usage, and revalidated package test/build/lint successfully.

### Completion Notes List

- Implemented TenantProvider with useAuth() integration, activeTenant eviction logic, and JSON.stringify-based change detection for silent refresh stability
- Implemented ThemeProvider with FOUC prevention (synchronous data-theme in useState initializer), localStorage persistence, matchMedia fallback
- Implemented LocaleProvider with Intl.\* formatters (DateTimeFormat, NumberFormat), locale/currency prop overrides, memoized callbacks
- Defined ModuleManifest discriminated union type with manifestVersion: 1 as discriminant
- Created MockShellProvider wrapping all 4 context providers in correct nesting order (Auth → Tenant → Theme → Locale)
- Created createMockAuthContext and createMockTenantContext factory functions with spy-capable default callbacks suitable for tests without coupling runtime helpers to `vitest`
- Added `createMockFn` helper and focused tests covering mock callback call tracking
- Updated barrel exports: all providers, hooks, types, testing utilities exported; internal contexts NOT exported
- 67 tests across 7 test files, all passing. No regressions to Story 1.3's 16 tests.
- Build output: 10.37 KB ESM + 3.47 KB DTS. Lint clean.
- Review follow-up fixed the previously identified story/code mismatches and synchronized the artifact with the validated implementation state.

### File List

**Modified files:**

- packages/shell-api/src/types.ts (MODIFIED — added TenantContextValue, ThemeContextValue, LocaleContextValue, Theme)
- packages/shell-api/src/index.ts (MODIFIED — added barrel exports for all new providers/hooks/types/testing)
- packages/shell-api/src/tenant/TenantProvider.tsx (NEW)
- packages/shell-api/src/tenant/TenantProvider.test.tsx (NEW)
- packages/shell-api/src/tenant/useTenant.ts (NEW)
- packages/shell-api/src/theme/ThemeProvider.tsx (NEW)
- packages/shell-api/src/theme/ThemeProvider.test.tsx (NEW)
- packages/shell-api/src/theme/useTheme.ts (NEW)
- packages/shell-api/src/locale/LocaleProvider.tsx (NEW)
- packages/shell-api/src/locale/LocaleProvider.test.tsx (NEW)
- packages/shell-api/src/locale/useLocale.ts (NEW)
- packages/shell-api/src/manifest/manifestTypes.ts (NEW)
- packages/shell-api/src/manifest/manifestTypes.test.ts (NEW)
- packages/shell-api/src/testing/MockShellProvider.tsx (NEW)
- packages/shell-api/src/testing/MockShellProvider.test.tsx (NEW)
- packages/shell-api/src/testing/createMockAuthContext.ts (NEW, later review-follow-up modified for spy-capable callbacks)
- packages/shell-api/src/testing/createMockTenantContext.ts (NEW, later review-follow-up modified for spy-capable callbacks)

**Review follow-up files:**

- packages/shell-api/src/testing/createMockFn.ts (NEW — runtime-safe spy-capable callback helper for testing utilities)
- packages/shell-api/src/testing/createMockContexts.test.ts (NEW — verifies mock context factory callback tracking)

### Change Log

- 2026-03-13: Implemented Story 1.4 — TenantProvider, ThemeProvider, LocaleProvider, ModuleManifest types, MockShellProvider, test factories, barrel exports. 65 tests passing, build + lint clean.
- 2026-03-13: Senior developer review follow-up — fixed tenant-list content comparison, replaced plain no-op mock callbacks with spy-capable helpers, added focused mock factory tests, revalidated with 67 passing tests, build, and lint.

## Senior Developer Review (AI)

### Review Summary

- Verified AC coverage against the implemented `packages/shell-api/src/**` source files and tests.
- Fixed the previously identified review issues instead of deferring them:
  - aligned `TenantProvider` with content-based tenant-list change detection;
  - replaced plain no-op mock callbacks with spy-capable runtime-safe helpers;
  - added focused tests to cover mock callback behavior;
  - corrected this story artifact's validation counts and file accounting.

### Git / Story Traceability Note

- The initial review found that the current working tree mostly contained artifact changes while the source implementation already existed in repository history.
- This review follow-up introduced explicit source updates for the identified mismatches and synchronized the story record with the now-validated reviewable state.

### Outcome

- **Approved after fixes**
- Story status updated to `done`
- Package verification rerun successfully: `test`, `build`, and `lint`

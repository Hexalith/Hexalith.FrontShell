import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";

// eslint-disable-next-line import-x/order -- type-only sibling import triggers conflicting group rules
import type { RuntimeConfig } from "./config/types";

// Mock the entire shell-api module so ShellProviders works without real OIDC
const mockShellProviders = vi.fn();

vi.mock("@hexalith/shell-api", async (importOriginal) => {
  const React = await import("react");
  const actual = (await importOriginal()) as Record<string, unknown>;

  const mockAuthValue = {
    user: {
      sub: "test",
      name: "Test User",
      email: "test@test.com",
      tenantClaims: ["tenant-a"],
    },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    signinRedirect: async () => {},
    signoutRedirect: async () => {},
  };

  const mockTenantValue = {
    activeTenant: "tenant-a",
    availableTenants: ["tenant-a"],
    switchTenant: () => {},
  };

  const mockThemeValue = {
    theme: "light" as const,
    toggleTheme: () => {},
  };

  const mockLocaleValue = {
    locale: "en-US",
    defaultCurrency: "USD",
    formatDate: (date: string | Date) => String(date),
    formatNumber: (value: number) => String(value),
    formatCurrency: (value: number) => String(value),
  };

  const mockConnectionHealthValue = {
    health: "connected" as const,
    lastChecked: new Date(),
    checkNow: () => {},
  };

  const mockFormDirtyValue = {
    isDirty: false,
    setDirty: () => {},
    dirtyFormId: null,
    setDirtyFormId: () => {},
  };

  return {
    ...actual,
    useAuth: () => mockAuthValue,
    useTenant: () => mockTenantValue,
    useConnectionHealth: () => mockConnectionHealthValue,
    useFormDirty: () => mockFormDirtyValue,
    useTheme: () => mockThemeValue,
    useLocale: () => mockLocaleValue,
    AuthProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    TenantProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    ConnectionHealthProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    FormDirtyProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    LocaleProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

// Mock ShellProviders to capture props
vi.mock("./providers/ShellProviders", async () => {
  const React = await import("react");
  return {
    ShellProviders: (props: Record<string, unknown>) => {
      mockShellProviders(props);
      return React.createElement(React.Fragment, null, props.children as React.ReactNode);
    },
  };
});

// Import App after mocks
// eslint-disable-next-line import-x/order
import App from "./App";

afterEach(() => {
  cleanup();
  mockShellProviders.mockClear();
});

const TEST_CONFIG: RuntimeConfig = {
  oidcAuthority: "https://keycloak.test.com/realms/hexalith",
  oidcClientId: "test-client",
  commandApiBaseUrl: "https://api.test.com",
  tenantClaimName: "custom:tenant",
};

describe("App", () => {
  it("renders the full app with shell layout when authenticated", () => {
    render(<App config={TEST_CONFIG} />);
    expect(
      screen.getByRole("heading", { name: /welcome to hexalith\.frontshell/i }),
    ).toBeTruthy();
  });

  it("renders the shell layout landmarks", () => {
    render(<App config={TEST_CONFIG} />);
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("navigation")).toBeTruthy();
    expect(screen.getByRole("main")).toBeTruthy();
  });

  it("renders the not-found page for unknown routes", () => {
    window.history.pushState({}, "", "/unknown-route");

    render(<App config={TEST_CONFIG} />);

    expect(screen.getByText(/page not found/i)).toBeTruthy();

    window.history.replaceState({}, "", "/");
  });

  // ─── AC #3: OIDC config derived from RuntimeConfig ─────────────
  it("derives OIDC config from RuntimeConfig and passes to ShellProviders", () => {
    render(<App config={TEST_CONFIG} />);

    expect(mockShellProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        oidcConfig: expect.objectContaining({
          authority: "https://keycloak.test.com/realms/hexalith",
          client_id: "test-client",
        }),
      }),
    );
  });

  // ─── AC #3: backendUrl passed from config ──────────────────────
  it("passes backendUrl to ShellProviders from config.commandApiBaseUrl", () => {
    render(<App config={TEST_CONFIG} />);

    expect(mockShellProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        backendUrl: "https://api.test.com",
      }),
    );
  });

  // ─── AC #3: Optional fields use defaults ───────────────────────
  it("uses default values for optional OIDC fields when not in config", () => {
    render(<App config={TEST_CONFIG} />);

    expect(mockShellProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        oidcConfig: expect.objectContaining({
          scope: "openid profile email",
          redirect_uri: window.location.origin,
          post_logout_redirect_uri: window.location.origin,
        }),
      }),
    );
  });
});

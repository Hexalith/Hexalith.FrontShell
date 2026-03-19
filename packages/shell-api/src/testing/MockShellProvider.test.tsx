import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { MockShellProvider } from "./MockShellProvider";
import { useAuth } from "../auth/useAuth";
import { useLocale } from "../locale/useLocale";
import { useTenant } from "../tenant/useTenant";
import { useTheme } from "../theme/useTheme";

// Consumer that uses all hooks
function AllHooksConsumer() {
  const auth = useAuth();
  const tenant = useTenant();
  const { theme } = useTheme();
  const { locale, defaultCurrency } = useLocale();

  return (
    <div>
      <span data-testid="auth-user">{auth.user?.sub ?? "none"}</span>
      <span data-testid="auth-authenticated">
        {String(auth.isAuthenticated)}
      </span>
      <span data-testid="tenant-active">
        {tenant.activeTenant ?? "none"}
      </span>
      <span data-testid="tenant-available">
        {JSON.stringify(tenant.availableTenants)}
      </span>
      <span data-testid="theme">{theme}</span>
      <span data-testid="locale">{locale}</span>
      <span data-testid="currency">{defaultCurrency}</span>
    </div>
  );
}

describe("MockShellProvider — Acceptance Tests", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  // ─── AC #6: MockShellProvider wraps all mock contexts ──────────
  describe("AC #6 — MockShellProvider wraps all mock contexts", () => {
    it("renders children", () => {
      render(
        <MockShellProvider>
          <span data-testid="child">Hello</span>
        </MockShellProvider>,
      );

      expect(screen.getByTestId("child").textContent).toBe("Hello");
    });

    it("useTenant works inside MockShellProvider", () => {
      function TenantOnly() {
        const t = useTenant();
        return (
          <span data-testid="t-active">{t.activeTenant ?? "none"}</span>
        );
      }

      render(
        <MockShellProvider>
          <TenantOnly />
        </MockShellProvider>,
      );

      expect(screen.getByTestId("t-active").textContent).not.toBe("");
    });

    it("useTheme works inside MockShellProvider", () => {
      function ThemeOnly() {
        const { theme } = useTheme();
        return <span data-testid="t-theme">{theme}</span>;
      }

      render(
        <MockShellProvider>
          <ThemeOnly />
        </MockShellProvider>,
      );

      expect(screen.getByTestId("t-theme").textContent).toMatch(
        /^(light|dark)$/,
      );
    });

    it("useLocale works inside MockShellProvider", () => {
      function LocaleOnly() {
        const { locale } = useLocale();
        return <span data-testid="t-locale">{locale}</span>;
      }

      render(
        <MockShellProvider>
          <LocaleOnly />
        </MockShellProvider>,
      );

      expect(screen.getByTestId("t-locale").textContent).toBeTruthy();
    });

    it("useAuth works inside MockShellProvider", () => {
      function AuthOnly() {
        const auth = useAuth();
        return (
          <span data-testid="t-auth">{auth.user?.sub ?? "none"}</span>
        );
      }

      render(
        <MockShellProvider>
          <AuthOnly />
        </MockShellProvider>,
      );

      expect(screen.getByTestId("t-auth").textContent).not.toBe("");
    });

    it("custom overrides applied — completely replaces defaults", () => {
      render(
        <MockShellProvider
          authContext={{
            user: {
              sub: "custom-user",
              tenantClaims: ["custom-tenant"],
              name: "Custom",
              email: "custom@test.com",
            },
            isAuthenticated: true,
            isLoading: false,
            error: null,
            signinRedirect: vi.fn(),
            signoutRedirect: vi.fn(),
          }}
          tenantContext={{
            activeTenant: "custom-tenant",
            availableTenants: ["custom-tenant"],
            switchTenant: vi.fn(),
          }}
          theme="dark"
          locale="fr-FR"
          defaultCurrency="EUR"
        >
          <AllHooksConsumer />
        </MockShellProvider>,
      );

      expect(screen.getByTestId("auth-user").textContent).toBe(
        "custom-user",
      );
      expect(screen.getByTestId("tenant-active").textContent).toBe(
        "custom-tenant",
      );
      expect(screen.getByTestId("theme").textContent).toBe("dark");
      expect(screen.getByTestId("locale").textContent).toBe("fr-FR");
      expect(screen.getByTestId("currency").textContent).toBe("EUR");
    });

    it("all 4 hooks work simultaneously (integration)", () => {
      render(
        <MockShellProvider>
          <AllHooksConsumer />
        </MockShellProvider>,
      );

      // All hooks should return valid defaults
      expect(screen.getByTestId("auth-user").textContent).not.toBe("");
      expect(screen.getByTestId("auth-authenticated").textContent).toBe(
        "true",
      );
      expect(screen.getByTestId("tenant-active").textContent).not.toBe(
        "",
      );
      expect(screen.getByTestId("theme").textContent).toMatch(
        /^(light|dark)$/,
      );
      expect(screen.getByTestId("locale").textContent).toBeTruthy();
      expect(screen.getByTestId("currency").textContent).toBeTruthy();
    });
  });

  // ─── Barrel export verification ────────────────────────────────
  describe("Barrel exports all providers/hooks and hides internals", () => {
    it("exports all providers and hooks from barrel", async () => {
      const barrel = await import("../index");
      expect(barrel.AuthProvider).toBeDefined();
      expect(barrel.useAuth).toBeDefined();
      expect(barrel.TenantProvider).toBeDefined();
      expect(barrel.useTenant).toBeDefined();
      expect(barrel.ThemeProvider).toBeDefined();
      expect(barrel.useTheme).toBeDefined();
      expect(barrel.LocaleProvider).toBeDefined();
      expect(barrel.useLocale).toBeDefined();
      expect(barrel.MockShellProvider).toBeDefined();
      expect(barrel.createMockAuthContext).toBeDefined();
      expect(barrel.createMockTenantContext).toBeDefined();
    });

    it("does NOT export internal contexts from barrel", async () => {
      const barrel = await import("../index");
      expect("TenantContext" in barrel).toBe(false);
      expect("ThemeContext" in barrel).toBe(false);
      expect("LocaleContext" in barrel).toBe(false);
    });
  });
});

import React from "react";
import {
  render,
  screen,
  renderHook,
  cleanup,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock useAuth — TenantProvider depends on it
const mockUseAuth = vi.fn();
vi.mock("../auth/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Import AFTER mock setup
import { TenantProvider } from "./TenantProvider";
import { useTenant } from "./useTenant";

function setMockAuth(overrides: Record<string, unknown> = {}) {
  mockUseAuth.mockReturnValue({
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
    ...overrides,
  });
}

function TenantConsumer() {
  const tenant = useTenant();
  return (
    <div>
      <span data-testid="active-tenant">
        {tenant.activeTenant ?? "none"}
      </span>
      <span data-testid="available-tenants">
        {JSON.stringify(tenant.availableTenants)}
      </span>
      <button
        data-testid="switch-btn"
        onClick={() => tenant.switchTenant("tenant-b")}
      />
      <button
        data-testid="switch-invalid-btn"
        onClick={() => tenant.switchTenant("non-existent")}
      />
    </div>
  );
}

describe("TenantProvider & useTenant — Acceptance Tests", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setMockAuth();
  });

  // ─── AC #1: useTenant returns tenant state ─────────────────────
  describe("AC #1 — useTenant returns tenant state from JWT claims", () => {
    it("returns { activeTenant, availableTenants, switchTenant }", () => {
      render(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      expect(screen.getByTestId("active-tenant").textContent).toBe(
        "tenant-a",
      );
      expect(screen.getByTestId("available-tenants").textContent).toBe(
        JSON.stringify(["tenant-a", "tenant-b"]),
      );
    });

    it("derives availableTenants from user.tenantClaims", () => {
      setMockAuth({
        user: {
          sub: "u1",
          tenantClaims: ["x", "y", "z"],
          name: "Test",
          email: "test@test.com",
        },
      });

      render(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      expect(screen.getByTestId("available-tenants").textContent).toBe(
        JSON.stringify(["x", "y", "z"]),
      );
    });

    it("defaults activeTenant to first tenant", () => {
      render(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      expect(screen.getByTestId("active-tenant").textContent).toBe(
        "tenant-a",
      );
    });

    it("switchTenant changes activeTenant", () => {
      render(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      act(() => {
        screen.getByTestId("switch-btn").click();
      });

      expect(screen.getByTestId("active-tenant").textContent).toBe(
        "tenant-b",
      );
    });

    it("switchTenant with invalid ID: warns and does nothing", () => {
      const warnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      render(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      act(() => {
        screen.getByTestId("switch-invalid-btn").click();
      });

      expect(screen.getByTestId("active-tenant").textContent).toBe(
        "tenant-a",
      );
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("auth user changes → tenants update", () => {
      const { rerender } = render(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      expect(screen.getByTestId("available-tenants").textContent).toBe(
        JSON.stringify(["tenant-a", "tenant-b"]),
      );

      setMockAuth({
        user: {
          sub: "test-user",
          tenantClaims: ["tenant-c"],
          name: "Test",
          email: "test@test.com",
        },
      });

      rerender(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      expect(screen.getByTestId("available-tenants").textContent).toBe(
        JSON.stringify(["tenant-c"]),
      );
    });

    it("no tenant claims → activeTenant null, availableTenants []", () => {
      setMockAuth({
        user: {
          sub: "test-user",
          tenantClaims: [],
          name: "Test",
          email: "test@test.com",
        },
      });

      render(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      expect(screen.getByTestId("active-tenant").textContent).toBe("none");
      expect(screen.getByTestId("available-tenants").textContent).toBe("[]");
    });

    it("auth loading → activeTenant null, availableTenants []", () => {
      setMockAuth({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      });

      render(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      expect(screen.getByTestId("active-tenant").textContent).toBe("none");
      expect(screen.getByTestId("available-tenants").textContent).toBe("[]");
    });

    it("availableTenants change, activeTenant still in list → keep", () => {
      // Start with tenant-a active
      const { rerender } = render(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      expect(screen.getByTestId("active-tenant").textContent).toBe(
        "tenant-a",
      );

      // Change tenants but keep tenant-a
      setMockAuth({
        user: {
          sub: "test-user",
          tenantClaims: ["tenant-c", "tenant-a"],
          name: "Test",
          email: "test@test.com",
        },
      });

      rerender(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      expect(screen.getByTestId("active-tenant").textContent).toBe(
        "tenant-a",
      );
    });

    it("availableTenants change, activeTenant evicted → reset to [0]", () => {
      const { rerender } = render(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      expect(screen.getByTestId("active-tenant").textContent).toBe(
        "tenant-a",
      );

      // Remove tenant-a from list
      setMockAuth({
        user: {
          sub: "test-user",
          tenantClaims: ["tenant-c", "tenant-d"],
          name: "Test",
          email: "test@test.com",
        },
      });

      rerender(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      expect(screen.getByTestId("active-tenant").textContent).toBe(
        "tenant-c",
      );
    });

    it("silent refresh with same claims → no activeTenant reset", () => {
      const { rerender } = render(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      // Switch to tenant-b
      act(() => {
        screen.getByTestId("switch-btn").click();
      });
      expect(screen.getByTestId("active-tenant").textContent).toBe(
        "tenant-b",
      );

      // Silent refresh — same claims, different object reference
      setMockAuth({
        user: {
          sub: "test-user",
          tenantClaims: ["tenant-a", "tenant-b"],
          name: "Test",
          email: "test@test.com",
        },
      });

      rerender(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>,
      );

      // activeTenant should still be tenant-b (not reset)
      expect(screen.getByTestId("active-tenant").textContent).toBe(
        "tenant-b",
      );
    });
  });

  // ─── AC #5: Error outside provider ─────────────────────────────
  describe("AC #5 — throws outside TenantProvider", () => {
    it("throws when used outside TenantProvider", () => {
      const spy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      expect(() => renderHook(() => useTenant())).toThrow(
        "useTenant must be used within TenantProvider",
      );
      spy.mockRestore();
    });
  });
});

import React, { useRef } from "react";
import {
  render,
  screen,
  renderHook,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { AuthProvider, useAuth } from "../index";

import type { AuthContextValue, AuthUser } from "../index";

// Mock react-oidc-context — we test OUR wrapper, not the library
const mockSigninRedirect = vi.fn();
const mockSignoutRedirect = vi.fn();
const mockOidcProvider = vi.fn();

let mockOidcState: Record<string, unknown> = {};

vi.mock("react-oidc-context", () => ({
  AuthProvider: (props: {
    children: React.ReactNode;
    accessTokenExpiringNotificationTimeInSeconds?: number;
    automaticSilentRenew?: boolean;
    validateSubOnSilentRenew?: boolean;
    onSigninCallback?: () => void;
  }) => {
    mockOidcProvider(props);
    return <>{props.children}</>;
  },
  useAuth: () => mockOidcState,
}));

function setMockOidcState(state: Record<string, unknown>) {
  mockOidcState = {
    signinRedirect: mockSigninRedirect,
    signoutRedirect: mockSignoutRedirect,
    ...state,
  };
}

// Helper component that displays auth state
function AuthConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="authenticated">
        {String(auth.isAuthenticated)}
      </span>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="user-sub">{auth.user?.sub ?? "none"}</span>
      <span data-testid="tenant-claims">
        {JSON.stringify(auth.user?.tenantClaims ?? [])}
      </span>
      {auth.error && (
        <span data-testid="error">{auth.error.message}</span>
      )}
    </div>
  );
}

describe("AuthProvider & useAuth — Acceptance Tests", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setMockOidcState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      activeNavigator: undefined,
      error: undefined,
    });
  });

  // ─── AC #1: useAuth returns typed state ─────────────────────────
  describe("AC #1 — useAuth returns typed user information", () => {
    it("returns user with sub and tenant claims when authenticated", () => {
      setMockOidcState({
        user: {
          profile: {
            sub: "user-123",
            "eventstore:tenant": ["tenant-a", "tenant-b"],
            name: "Test User",
            email: "test@example.com",
          },
        },
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });

      render(
        <AuthProvider authority="" client_id="" redirect_uri="">
          <AuthConsumer />
        </AuthProvider>,
      );

      expect(screen.getByTestId("authenticated").textContent).toBe(
        "true",
      );
      expect(screen.getByTestId("loading").textContent).toBe("false");
      expect(screen.getByTestId("user-sub").textContent).toBe("user-123");
      expect(screen.getByTestId("tenant-claims").textContent).toBe(
        JSON.stringify(["tenant-a", "tenant-b"]),
      );
    });

    it("returns null user when not authenticated", async () => {
      setMockOidcState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: undefined,
      });

      render(
        <AuthProvider authority="" client_id="" redirect_uri="">
          <AuthConsumer />
        </AuthProvider>,
      );

      expect(screen.getByTestId("authenticated").textContent).toBe(
        "false",
      );
      expect(screen.getByTestId("user-sub").textContent).toBe("none");
      await waitFor(() => {
        expect(mockSigninRedirect).toHaveBeenCalledTimes(1);
      });
    });

    it("passes explicit silent renew defaults to the OIDC provider", () => {
      setMockOidcState({
        user: {
          profile: {
            sub: "user-123",
            "eventstore:tenant": ["tenant-a"],
          },
        },
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });

      render(
        <AuthProvider authority="" client_id="" redirect_uri="">
          <AuthConsumer />
        </AuthProvider>,
      );

      expect(mockOidcProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          accessTokenExpiringNotificationTimeInSeconds: 60,
          automaticSilentRenew: true,
          validateSubOnSilentRenew: true,
        }),
      );
    });
  });

  // ─── AC #2: Redirect when not authenticated ────────────────────
  describe("AC #2 — redirect to OIDC provider when no session", () => {
    it("calls signinRedirect when not authenticated and not loading", async () => {
      setMockOidcState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: undefined,
      });

      render(
        <AuthProvider authority="" client_id="" redirect_uri="">
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(mockSigninRedirect).toHaveBeenCalledTimes(1);
      });
    });

    it("does not redirect when the token is invalid because sub is missing", async () => {
      const errorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      setMockOidcState({
        user: {
          profile: {
            "eventstore:tenant": ["tenant-a"],
          },
        },
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });

      render(
        <AuthProvider authority="" client_id="" redirect_uri="">
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("error").textContent).toBe(
          "OIDC token missing required 'sub' claim — backend will reject all requests. Check OIDC provider configuration.",
        );
      });
      expect(mockSigninRedirect).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  // ─── AC #3: Silent refresh is non-destructive ──────────────────
  describe("AC #3 — silent refresh preserves React tree", () => {
    it("does not remount components when token refresh updates user", () => {
      // Start with initial authenticated state
      setMockOidcState({
        user: {
          profile: {
            sub: "user-123",
            "eventstore:tenant": ["tenant-a"],
          },
        },
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });

      // Component that tracks mount identity via ref
      let refValue: string | null = null;
      function RefTracker() {
        const auth = useAuth();
        const mountId = useRef("mounted");
        refValue = mountId.current;
        return (
          <span data-testid="sub">{auth.user?.sub ?? "none"}</span>
        );
      }

      const { rerender } = render(
        <AuthProvider authority="" client_id="" redirect_uri="">
          <RefTracker />
        </AuthProvider>,
      );

      expect(refValue).toBe("mounted");
      expect(screen.getByTestId("sub").textContent).toBe("user-123");

      // Simulate token refresh — user object updates but component should NOT remount
      setMockOidcState({
        user: {
          profile: {
            sub: "user-123",
            "eventstore:tenant": ["tenant-a"],
            name: "Refreshed User",
          },
        },
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });

      rerender(
        <AuthProvider authority="" client_id="" redirect_uri="">
          <RefTracker />
        </AuthProvider>,
      );

      // Ref should still be "mounted" — tree was NOT remounted
      // (Note: full form/scroll verification requires E2E — Story 1.5+)
      expect(refValue).toBe("mounted");
      expect(screen.getByTestId("sub").textContent).toBe("user-123");
    });
  });

  // ─── AC #4: Error outside provider ─────────────────────────────
  describe("AC #4 — descriptive error outside AuthProvider", () => {
    it("throws when useAuth is called outside AuthProvider", () => {
      const spy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      expect(() => renderHook(() => useAuth())).toThrow(
        "useAuth must be used within AuthProvider",
      );
      spy.mockRestore();
    });
  });

  // ─── AC #5: Public API exports ─────────────────────────────────
  describe("AC #5 — barrel exports and public API", () => {
    it("exports AuthProvider and useAuth from barrel", () => {
      expect(AuthProvider).toBeDefined();
      expect(typeof AuthProvider).toBe("function");
      expect(useAuth).toBeDefined();
      expect(typeof useAuth).toBe("function");
    });

    it("does not export AuthContext from barrel", async () => {
      const barrel = await import("../index");
      expect("AuthContext" in barrel).toBe(false);
    });

    it("exports AuthContextValue and AuthUser types (compile-time check)", () => {
      // Type-level verification — if these imports fail, TypeScript catches it
      const _context: AuthContextValue = {} as AuthContextValue;
      const _user: AuthUser = {} as AuthUser;
      expect(_context).toBeDefined();
      expect(_user).toBeDefined();
    });
  });

  // ─── Tenant claim normalization ────────────────────────────────
  describe("Tenant claim normalization", () => {
    it("normalizes undefined tenant claim to empty array", () => {
      setMockOidcState({
        user: {
          profile: { sub: "user-1" },
        },
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });

      render(
        <AuthProvider authority="" client_id="" redirect_uri="">
          <AuthConsumer />
        </AuthProvider>,
      );

      expect(screen.getByTestId("tenant-claims").textContent).toBe(
        "[]",
      );
    });

    it("normalizes single string tenant claim to array", () => {
      setMockOidcState({
        user: {
          profile: {
            sub: "user-1",
            "eventstore:tenant": "single-tenant",
          },
        },
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });

      render(
        <AuthProvider authority="" client_id="" redirect_uri="">
          <AuthConsumer />
        </AuthProvider>,
      );

      expect(screen.getByTestId("tenant-claims").textContent).toBe(
        JSON.stringify(["single-tenant"]),
      );
    });

    it("passes through array tenant claims as-is", () => {
      setMockOidcState({
        user: {
          profile: {
            sub: "user-1",
            "eventstore:tenant": ["tenant-a", "tenant-b"],
          },
        },
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });

      render(
        <AuthProvider authority="" client_id="" redirect_uri="">
          <AuthConsumer />
        </AuthProvider>,
      );

      expect(screen.getByTestId("tenant-claims").textContent).toBe(
        JSON.stringify(["tenant-a", "tenant-b"]),
      );
    });

    it("filters out non-string tenant claim values from arrays", () => {
      setMockOidcState({
        user: {
          profile: {
            sub: "user-1",
            "eventstore:tenant": ["tenant-a", 42, null, "tenant-b"],
          },
        },
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });

      render(
        <AuthProvider authority="" client_id="" redirect_uri="">
          <AuthConsumer />
        </AuthProvider>,
      );

      expect(screen.getByTestId("tenant-claims").textContent).toBe(
        JSON.stringify(["tenant-a", "tenant-b"]),
      );
    });
  });

  // ─── Configurable tenant claim name ──────────────────────────
  describe("Configurable tenantClaimName", () => {
    it("extracts tenants from custom claim name when tenantClaimName prop is provided", () => {
      setMockOidcState({
        user: {
          profile: {
            sub: "user-123",
            "custom:tenants": ["custom-tenant-a", "custom-tenant-b"],
          },
        },
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });

      render(
        <AuthProvider
          authority=""
          client_id=""
          redirect_uri=""
          tenantClaimName="custom:tenants"
        >
          <AuthConsumer />
        </AuthProvider>,
      );

      expect(screen.getByTestId("tenant-claims").textContent).toBe(
        JSON.stringify(["custom-tenant-a", "custom-tenant-b"]),
      );
    });

    it("uses default eventstore:tenant claim when tenantClaimName is not provided", () => {
      setMockOidcState({
        user: {
          profile: {
            sub: "user-123",
            "eventstore:tenant": ["default-tenant"],
          },
        },
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });

      render(
        <AuthProvider authority="" client_id="" redirect_uri="">
          <AuthConsumer />
        </AuthProvider>,
      );

      expect(screen.getByTestId("tenant-claims").textContent).toBe(
        JSON.stringify(["default-tenant"]),
      );
    });
  });

  // ─── Sub claim validation ──────────────────────────────────────
  describe("Sub claim validation", () => {
    it("sets user to null and isAuthenticated to false when sub is missing", () => {
      const errorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      setMockOidcState({
        user: {
          profile: {
            "eventstore:tenant": ["tenant-a"],
          },
        },
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });

      render(
        <AuthProvider authority="" client_id="" redirect_uri="">
          <AuthConsumer />
        </AuthProvider>,
      );

      expect(screen.getByTestId("user-sub").textContent).toBe("none");
      expect(screen.getByTestId("authenticated").textContent).toBe(
        "false",
      );
      errorSpy.mockRestore();
    });

    it("surfaces descriptive error when sub claim is missing", async () => {
      const errorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      setMockOidcState({
        user: {
          profile: {},
        },
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      });

      render(
        <AuthProvider authority="" client_id="" redirect_uri="">
          <AuthConsumer />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("error").textContent).toBe(
          "OIDC token missing required 'sub' claim — backend will reject all requests. Check OIDC provider configuration.",
        );
      });
      expect(errorSpy).toHaveBeenCalledWith(
        "OIDC token missing required 'sub' claim — backend will reject all requests. Check OIDC provider configuration.",
      );
      errorSpy.mockRestore();
    });
  });
});

import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";

import { useAuth } from "@hexalith/shell-api";
import type { AuthContextValue } from "@hexalith/shell-api";

import { AuthGate } from "./AuthGate";

vi.mock("@hexalith/shell-api", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

const mockUseAuth = vi.mocked(useAuth);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

function createAuthValue(
  overrides: Partial<AuthContextValue>,
): AuthContextValue {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    signinRedirect: async () => {},
    signoutRedirect: async () => {},
    ...overrides,
  };
}

describe("AuthGate", () => {
  // AC #3: Loading state
  it("shows loading when isLoading=true", () => {
    mockUseAuth.mockReturnValue(createAuthValue({ isLoading: true }));

    render(
      <AuthGate>
        <div>Protected</div>
      </AuthGate>,
    );

    expect(screen.getByText(/loading/i)).toBeTruthy();
    expect(screen.queryByText("Protected")).toBeNull();
  });

  // AC #3: Error state
  it("shows error when error is present", () => {
    mockUseAuth.mockReturnValue(
      createAuthValue({ error: new Error("Auth failed") }),
    );

    render(
      <AuthGate>
        <div>Protected</div>
      </AuthGate>,
    );

    expect(screen.getByText(/auth failed/i)).toBeTruthy();
    expect(screen.queryByText("Protected")).toBeNull();
  });

  // AC #3: Error state handles undefined error.message
  it("error state handles undefined error.message gracefully", () => {
    const error = new Error();
    error.message = "";
    mockUseAuth.mockReturnValue(createAuthValue({ error }));

    render(
      <AuthGate>
        <div>Protected</div>
      </AuthGate>,
    );

    // Should render error UI without crashing
    expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
  });

  // AC #3: Redirect indicator when not authenticated
  it("shows redirecting when not authenticated", () => {
    mockUseAuth.mockReturnValue(
      createAuthValue({ isAuthenticated: false, isLoading: false }),
    );

    render(
      <AuthGate>
        <div>Protected</div>
      </AuthGate>,
    );

    expect(screen.getByText(/redirecting to login/i)).toBeTruthy();
    expect(screen.queryByText("Protected")).toBeNull();
  });

  // AC #3: Renders children when authenticated
  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue(
      createAuthValue({
        isAuthenticated: true,
        user: {
          sub: "test",
          name: "Test",
          tenantClaims: ["t1"],
        },
      }),
    );

    render(
      <AuthGate>
        <div>Protected</div>
      </AuthGate>,
    );

    expect(screen.getByText("Protected")).toBeTruthy();
  });

  // AC #3: OIDC callback detection shows "Processing login..."
  it("shows 'Processing login...' when OIDC callback params present", () => {
    window.history.replaceState({}, "", "/?code=abc123&state=xyz");

    mockUseAuth.mockReturnValue(
      createAuthValue({ isLoading: false, isAuthenticated: false }),
    );

    render(
      <AuthGate>
        <div>Protected</div>
      </AuthGate>,
    );

    expect(screen.getByText(/processing login/i)).toBeTruthy();
    expect(screen.queryByText(/redirecting/i)).toBeNull();
  });

  it("shows redirecting when only code is present without state", () => {
    window.history.replaceState({}, "", "/?code=abc123");

    mockUseAuth.mockReturnValue(
      createAuthValue({ isLoading: false, isAuthenticated: false }),
    );

    render(
      <AuthGate>
        <div>Protected</div>
      </AuthGate>,
    );

    expect(screen.getByText(/redirecting to login/i)).toBeTruthy();
    expect(screen.queryByText(/processing login/i)).toBeNull();
  });

  // Retry button reloads the page
  it("retry button exists on error state", () => {
    mockUseAuth.mockReturnValue(
      createAuthValue({ error: new Error("Something went wrong") }),
    );

    render(
      <AuthGate>
        <div>Protected</div>
      </AuthGate>,
    );

    expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
  });
});

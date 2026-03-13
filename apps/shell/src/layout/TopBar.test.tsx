import { render, screen, cleanup } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, afterEach, vi } from "vitest";

import {
  MockShellProvider,
  createMockAuthContext,
} from "@hexalith/shell-api";

import { TopBar } from "./TopBar";

afterEach(cleanup);

// Use sentinel to distinguish "not provided" from "explicitly undefined"
const NOT_SET = Symbol("NOT_SET");

function renderTopBar(
  overrides?: {
    userName?: string | typeof NOT_SET;
    userEmail?: string | typeof NOT_SET;
    signoutRedirect?: () => Promise<void>;
    toggleTheme?: () => void;
    theme?: "light" | "dark";
  },
) {
  const signoutRedirect =
    overrides?.signoutRedirect ?? vi.fn(async () => {});

  const name =
    overrides?.userName === NOT_SET
      ? undefined
      : (overrides?.userName ?? "Test User");
  const email =
    overrides?.userEmail === NOT_SET
      ? undefined
      : (overrides?.userEmail ?? "test@test.com");

  return render(
    <MockShellProvider
      authContext={createMockAuthContext({
        user: {
          sub: "test",
          name,
          email,
          tenantClaims: ["t1"],
        },
        isAuthenticated: true,
        signoutRedirect,
      })}
      theme={overrides?.theme ?? "light"}
    >
      <TopBar />
    </MockShellProvider>,
  );
}

describe("TopBar", () => {
  // AC #8: User name display
  it("displays user name", () => {
    renderTopBar({ userName: "Jerome Piquot" });
    expect(screen.getByText("Jerome Piquot")).toBeTruthy();
  });

  // AC #8: Shows email when user.name is null
  it("shows email when user.name is undefined", () => {
    renderTopBar({ userName: NOT_SET, userEmail: "jerome@test.com" });
    expect(screen.getByText("jerome@test.com")).toBeTruthy();
  });

  // AC #8: Shows 'User' when both name and email are null
  it("shows 'User' when both name and email are undefined", () => {
    renderTopBar({ userName: NOT_SET, userEmail: NOT_SET });
    expect(screen.getByText("User")).toBeTruthy();
  });

  // AC #8: Theme toggle button
  it("displays theme toggle button", () => {
    renderTopBar();
    expect(
      screen.getByRole("button", { name: /switch to dark/i }),
    ).toBeTruthy();
  });

  it("theme toggle button shows opposite theme label", () => {
    renderTopBar({ theme: "dark" });
    expect(
      screen.getByRole("button", { name: /switch to light/i }),
    ).toBeTruthy();
  });

  // AC #4: Logout button
  it("displays logout button", () => {
    renderTopBar();
    expect(screen.getByRole("button", { name: /logout/i })).toBeTruthy();
  });

  // AC #4: Logout calls signoutRedirect (no manual sessionStorage.clear)
  it("calls signoutRedirect on logout", async () => {
    const signoutRedirect = vi.fn(async () => {});
    renderTopBar({ signoutRedirect });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /logout/i }));

    expect(signoutRedirect).toHaveBeenCalledOnce();
  });
});

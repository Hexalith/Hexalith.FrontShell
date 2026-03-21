import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, afterEach, vi } from "vitest";

import {
  MockShellProvider,
  createMockAuthContext,
  createMockTenantContext,
} from "@hexalith/shell-api";

import { ShellLayout } from "./ShellLayout";

afterEach(cleanup);

// Mock react-router's Outlet to render a known child
vi.mock("react-router", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  };
});

function renderShellLayout() {
  return render(
    <MockShellProvider
      authContext={createMockAuthContext({
        user: {
          sub: "test",
          name: "Test User",
          email: "test@test.com",
          tenantClaims: ["tenant-a"],
        },
        isAuthenticated: true,
      })}
      tenantContext={createMockTenantContext({
        activeTenant: "tenant-a",
        availableTenants: ["tenant-a"],
      })}
    >
      <MemoryRouter>
        <ShellLayout />
      </MemoryRouter>
    </MockShellProvider>,
  );
}

describe("ShellLayout", () => {
  it("renders a skip navigation link targeting main content", () => {
    renderShellLayout();
    const skipLink = screen.getByRole("link", {
      name: /skip to main content/i,
    });
    expect(skipLink.getAttribute("href")).toBe("#main-content");
  });

  // AC #2, #5: Semantic landmarks
  it("renders a <header> element", () => {
    renderShellLayout();
    expect(screen.getByRole("banner")).toBeTruthy();
  });

  it("renders a <nav> element", () => {
    renderShellLayout();
    expect(screen.getByRole("navigation")).toBeTruthy();
  });

  it("renders a <main> element", () => {
    renderShellLayout();
    expect(screen.getByRole("main")).toBeTruthy();
  });

  // AC #2: Layout renders Outlet for child routes
  it("renders Outlet for child routes", () => {
    renderShellLayout();
    expect(screen.getByTestId("outlet")).toBeTruthy();
  });

  // AC #5: Semantic landmarks with aria-labels
  it("header has aria-label='Shell header'", () => {
    renderShellLayout();
    const header = screen.getByRole("banner");
    expect(header.getAttribute("aria-label")).toBe("Shell header");
  });

  it("main has id='main-content' and tabindex='-1' for skip navigation", () => {
    renderShellLayout();
    const main = screen.getByRole("main");
    expect(main.id).toBe("main-content");
    expect(main.getAttribute("tabindex")).toBe("-1");
  });

  // Status bar now renders as StatusBar component
  it("renders StatusBar component with role='status'", () => {
    renderShellLayout();
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("StatusBar shows active tenant name", () => {
    renderShellLayout();
    const matches = screen.getAllByText(/tenant-a/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("StatusBar has aria-label='Application status bar'", () => {
    renderShellLayout();
    expect(screen.getByLabelText("Application status bar")).toBeTruthy();
  });
});

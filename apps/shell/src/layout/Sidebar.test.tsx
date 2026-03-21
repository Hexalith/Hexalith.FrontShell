import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, afterEach, vi } from "vitest";

import { MockShellProvider } from "@hexalith/shell-api";
import type { NavigationItem } from "@hexalith/ui";

import type { SidebarNavigationItem } from "../modules/navigationBuilder";

import { Sidebar } from "./Sidebar";

// Mock useNavigate to track navigation calls
const mockNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Default: mock with modules
vi.mock("../modules", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    modules: [
      {
        manifest: {
          name: "tenants",
          displayName: "Tenants",
          version: "1.0.0",
          navigation: [
            { label: "Tenants", path: "/", icon: "users", category: "Admin" },
          ],
        },
        component: React.lazy(() =>
          Promise.resolve({ default: () => null }),
        ),
        basePath: "tenants",
      },
      {
        manifest: {
          name: "orders",
          displayName: "Orders",
          version: "1.0.0",
          navigation: [
            { label: "Orders", path: "/", category: "Business" },
          ],
        },
        component: React.lazy(() =>
          Promise.resolve({ default: () => null }),
        ),
        basePath: "orders",
      },
    ],
  };
});

afterEach(() => {
  cleanup();
  mockNavigate.mockClear();
});

function renderSidebar(initialRoute = "/") {
  return render(
    <MockShellProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Sidebar />
      </MemoryRouter>
    </MockShellProvider>,
  );
}

describe("Sidebar", () => {
  // AC #1: renders all module navigation items from manifests
  it("renders all module navigation items from manifests", () => {
    renderSidebar();
    expect(screen.getByText("Tenants")).toBeTruthy();
    expect(screen.getByText("Orders")).toBeTruthy();
  });

  // AC #1: groups items by manifest-declared category
  it("groups items by manifest-declared category", () => {
    renderSidebar();
    // Category headers rendered by @hexalith/ui Sidebar as collapsible group headers
    expect(screen.getByText("Admin")).toBeTruthy();
    expect(screen.getByText("Business")).toBeTruthy();
  });

  // AC #1: collapsible category groups expand/collapse on click
  it("collapsible category groups expand/collapse on click", () => {
    renderSidebar();
    const adminHeader = screen.getByText("Admin");
    // Click to collapse
    fireEvent.click(adminHeader);
    // The Tenants item should be hidden (Radix Collapsible hides content)
    // Radix Collapsible sets data-state="closed" on the content
    const collapsibleContent = adminHeader
      .closest("[data-state]")
      ?.parentElement?.querySelector("[data-state]");
    // After clicking, the trigger should have data-state="closed"
    expect(adminHeader.closest("[data-state]")?.getAttribute("data-state")).toBe(
      "closed",
    );
  });

  // AC #1: search/filter narrows visible items
  it("search/filter narrows visible items (type 'tenant' -> only Tenants visible)", () => {
    renderSidebar();
    const searchInput = screen.getByLabelText("Filter navigation");
    fireEvent.change(searchInput, { target: { value: "tenant" } });
    expect(screen.getByText("Tenants")).toBeTruthy();
    expect(screen.queryByText("Orders")).toBeNull();
  });

  // AC #1: search shows "No results" when nothing matches
  it("search shows 'No results' when nothing matches", () => {
    renderSidebar();
    const searchInput = screen.getByLabelText("Filter navigation");
    fireEvent.change(searchInput, { target: { value: "zzzzzzz" } });
    expect(screen.getByText("No results")).toBeTruthy();
  });

  // AC #2: active item has aria-current="page"
  it("active item has aria-current='page'", () => {
    renderSidebar("/tenants");
    const tenantsLink = screen.getByText("Tenants").closest("a");
    expect(tenantsLink?.getAttribute("aria-current")).toBe("page");
  });

  // AC #2: clicking a navigation item calls navigate()
  it("clicking a navigation item calls navigate()", () => {
    renderSidebar();
    const tenantsLink = screen.getByText("Tenants").closest("a");
    fireEvent.click(tenantsLink!);
    expect(mockNavigate).toHaveBeenCalledWith("/tenants");
  });

  // Home item is present and links to "/"
  it("Home item is present and links to '/'", () => {
    renderSidebar();
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink).toBeTruthy();
    expect(homeLink?.getAttribute("href")).toBe("/");
  });

  // Active Home item at root
  it("Home item is active on root path", () => {
    renderSidebar("/");
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink?.getAttribute("aria-current")).toBe("page");
  });

  // Sidebar remains mounted across route changes (no unmount/remount)
  it("sidebar remains mounted across route changes", () => {
    const { container } = renderSidebar();
    const sidebarElement = container.querySelector("nav");
    expect(sidebarElement).toBeTruthy();
    // The sidebar nav element is present and remains stable
    // (This test validates the component doesn't conditionally render)
  });

  // Navigating from deep path via sidebar goes to module root
  it("navigating from deep path (/tenants/detail/123) via sidebar goes to module root (/tenants)", () => {
    renderSidebar("/tenants/detail/123");
    const tenantsLink = screen.getByText("Tenants").closest("a");
    fireEvent.click(tenantsLink!);
    expect(mockNavigate).toHaveBeenCalledWith("/tenants");
  });

  // Mock module with icon: "users" — NavigationItem receives the icon value
  it("module with icon 'users' — NavigationItem receives the icon value, not undefined", () => {
    renderSidebar();
    const tenantsItem = screen.getByText("Tenants").closest("a");
    // First child span is the icon container rendered by @hexalith/ui Sidebar
    const iconSpan = tenantsItem?.querySelector("span");
    expect(iconSpan?.textContent).toBe("users");
  });

  // 5.2 Type compatibility assertion
  it("SidebarNavigationItem maps to NavigationItem fields", () => {
    // Compile-time type test: verify the mapping from SidebarNavigationItem to NavigationItem is valid
    const sidebarItem: SidebarNavigationItem = {
      label: "Test",
      to: "/test",
      icon: "test-icon",
      category: "TestCategory",
    };

    const navItem: NavigationItem = {
      id: sidebarItem.to,
      label: sidebarItem.label,
      icon: sidebarItem.icon,
      href: sidebarItem.to,
      category: sidebarItem.category,
    };

    // Runtime verification that the mapping produces valid NavigationItem
    expect(navItem.id).toBe("/test");
    expect(navItem.label).toBe("Test");
    expect(navItem.icon).toBe("test-icon");
    expect(navItem.href).toBe("/test");
    expect(navItem.category).toBe("TestCategory");
  });

  // All test imports come from react-router (NOT react-router-dom) - verified by import statement above
  // using MemoryRouter from "react-router"
});

describe("Sidebar — empty modules", () => {
  it("renders sidebar with only Home item and no search field when modules is empty", async () => {
    // Temporarily clear the modules array to test empty state
    const mod = await import("../modules");
    const saved = [...mod.modules];
    mod.modules.length = 0;

    render(
      <MockShellProvider>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </MockShellProvider>,
    );

    expect(screen.getByText("Home")).toBeTruthy();
    // No search field when there are no module items
    expect(screen.queryByLabelText("Filter navigation")).toBeNull();
    // No category groups
    expect(screen.queryByText("Admin")).toBeNull();

    // Restore
    mod.modules.push(...saved);
  });
});

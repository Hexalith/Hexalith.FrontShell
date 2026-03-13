import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, afterEach } from "vitest";

import { MockShellProvider } from "@hexalith/shell-api";

import { Sidebar } from "./Sidebar";

afterEach(cleanup);

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
  // AC #8: Placeholder navigation renders
  it("renders placeholder navigation items", () => {
    renderSidebar();
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Tenants")).toBeTruthy();
  });

  // AC #5: Active item has aria-current="page"
  it("active item has aria-current='page'", () => {
    renderSidebar("/");
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink?.getAttribute("aria-current")).toBe("page");
  });

  // Home NavLink uses `end` prop — not active on other routes
  it("Home link is NOT active on /tenants route", () => {
    renderSidebar("/tenants");
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink?.getAttribute("aria-current")).not.toBe("page");
  });

  // Navigation items are links
  it("navigation items are rendered as links", () => {
    renderSidebar();
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(2);
    expect(links[0].getAttribute("href")).toBe("/");
    expect(links[1].getAttribute("href")).toBe("/tenants");
  });
});

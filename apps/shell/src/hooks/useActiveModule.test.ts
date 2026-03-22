import React from "react";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { useActiveModule } from "./useActiveModule";

// Mock the modules import
vi.mock("../modules", () => ({
  modules: [
    {
      manifest: {
        name: "tenants",
        displayName: "Tenants",
        version: "1.0.0",
        navigation: [{ label: "Tenants", path: "/", category: "Admin" }],
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
        navigation: [{ label: "Orders", path: "/", category: "Business" }],
      },
      component: React.lazy(() =>
        Promise.resolve({ default: () => null }),
      ),
      basePath: "orders",
    },
  ],
}));

function renderUseActiveModule(initialRoute: string) {
  return renderHook(() => useActiveModule(), {
    wrapper: ({ children }) =>
      React.createElement(MemoryRouter, { initialEntries: [initialRoute] }, children),
  });
}

describe("useActiveModule", () => {
  it("returns undefined activeModule and 'Welcome' name for root path /", () => {
    const { result } = renderUseActiveModule("/");
    expect(result.current.activeModule).toBeUndefined();
    expect(result.current.activeModuleName).toBe("Welcome");
  });

  it("returns correct module for /tenants path", () => {
    const { result } = renderUseActiveModule("/tenants");
    expect(result.current.activeModule?.basePath).toBe("tenants");
    expect(result.current.activeModuleName).toBe("Tenants");
  });

  it("returns correct module for deep path /tenants/detail/123?status=active", () => {
    const { result } = renderUseActiveModule(
      "/tenants/detail/123?status=active",
    );
    expect(result.current.activeModule?.basePath).toBe("tenants");
    expect(result.current.activeModuleName).toBe("Tenants");
  });

  it("returns undefined for unknown paths like /nonexistent", () => {
    const { result } = renderUseActiveModule("/nonexistent");
    expect(result.current.activeModule).toBeUndefined();
    expect(result.current.activeModuleName).toBe("Welcome");
  });

  it("matches the first segment only — /tenants-extra does NOT match tenants module", () => {
    const { result } = renderUseActiveModule("/tenants-extra");
    expect(result.current.activeModule).toBeUndefined();
    expect(result.current.activeModuleName).toBe("Welcome");
  });
});

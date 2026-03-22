import { lazy } from "react";
import { describe, it, expect } from "vitest";

import type { ModuleManifest } from "@hexalith/shell-api";

import { buildModuleRoutes } from "./routeBuilder";
import { ModuleRenderGuard } from "../errors/ModuleRenderGuard";

import type { RegisteredModule } from "./registry";

function makeMockModule(
  name: string,
  displayName: string,
  basePath: string,
): RegisteredModule {
  return {
    manifest: {
      manifestVersion: 1,
      name,
      displayName,
      version: "1.0.0",
      routes: [{ path: "/" }],
      navigation: [{ label: displayName, path: "/", icon: "box" }],
    } satisfies ModuleManifest,
    component: lazy(() => Promise.resolve({ default: () => null })),
    basePath,
  };
}

describe("buildModuleRoutes", () => {
  it("produces a single wildcard route per module at basePath/*", () => {
    const modules = [makeMockModule("tasks", "Tasks", "tasks")];
    const routes = buildModuleRoutes(modules);

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe("tasks/*");
  });

  it("wraps element in ErrorBoundary (outermost) then Suspense (inside)", () => {
    const modules = [makeMockModule("tasks", "Tasks", "tasks")];
    const routes = buildModuleRoutes(modules);

    const element = routes[0].element as React.ReactElement;
    // Outermost: ModuleErrorBoundary
    expect(element.type).toBeTruthy();
    expect((element.props as Record<string, unknown>).name).toBe("Tasks");

    // Inside: Suspense wrapping the lazy component
    const suspenseChild = (element.props as Record<string, unknown>)
      .children as React.ReactElement;
    expect(suspenseChild).toBeTruthy();
  });

  it("empty modules array produces empty routes", () => {
    const routes = buildModuleRoutes([]);
    expect(routes).toHaveLength(0);
  });

  it("multiple modules produce non-colliding routes", () => {
    const modules = [
      makeMockModule("tasks", "Tasks", "tasks"),
      makeMockModule("orders", "Orders", "orders"),
    ];
    const routes = buildModuleRoutes(modules);

    expect(routes).toHaveLength(2);
    expect(routes[0].path).toBe("tasks/*");
    expect(routes[1].path).toBe("orders/*");

    const paths = routes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("module basePath does not collide with reserved shell paths", () => {
    const modules = [makeMockModule("tasks", "Tasks", "tasks")];
    const routes = buildModuleRoutes(modules);

    for (const route of routes) {
      expect(route.path).not.toBe("/*");
      expect(route.path).not.toBe("*");
    }
  });

  it("wraps module component inside ModuleRenderGuard within Suspense", () => {
    const modules = [makeMockModule("tasks", "Tasks", "tasks")];
    const routes = buildModuleRoutes(modules);

    const element = routes[0].element as React.ReactElement;
    // Outermost: ModuleErrorBoundary
    expect(element.type).toBeTruthy();

    // Inside: Suspense
    const suspenseChild = (element.props as Record<string, unknown>)
      .children as React.ReactElement;
    expect(suspenseChild).toBeTruthy();

    // Inside Suspense: children should include ModuleRenderGuard
    const suspenseChildren = (suspenseChild.props as Record<string, unknown>)
      .children as React.ReactElement;
    expect(suspenseChildren).toBeTruthy();
    expect(suspenseChildren.type).toBe(ModuleRenderGuard);
    expect((suspenseChildren.props as Record<string, unknown>).moduleName).toBe("Tasks");
  });

  it("ModuleRenderGuard receives correct moduleName from manifest displayName", () => {
    const modules = [makeMockModule("orders", "Order Management", "orders")];
    const routes = buildModuleRoutes(modules);

    const element = routes[0].element as React.ReactElement;
    const suspenseChild = (element.props as Record<string, unknown>)
      .children as React.ReactElement;
    const renderGuard = (suspenseChild.props as Record<string, unknown>)
      .children as React.ReactElement;
    expect((renderGuard.props as Record<string, unknown>).moduleName).toBe("Order Management");
  });
});

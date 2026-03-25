import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { manifest } from "./manifest.js";
import { OrderRootPage, routes } from "./routes.js";
import { renderWithProviders } from "./testing/renderWithProviders.js";

// AC: 7-3#1

describe("routes", () => {
  it("every manifest route has a matching route entry", () => {
    const routePaths = routes.map((r) => r.path);
    for (const manifestRoute of manifest.routes) {
      expect(routePaths).toContain(manifestRoute.path);
    }
  });

  it("every route entry has an element", () => {
    for (const route of routes) {
      expect(route.element).toBeDefined();
    }
  });

  it("route count matches manifest route count", () => {
    expect(routes).toHaveLength(manifest.routes.length);
  });

  it("OrderRootPage renders the list page", async () => {
    renderWithProviders(<OrderRootPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
    });
  });
});

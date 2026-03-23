import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TenantRootPage, routes } from "./routes";
import { renderWithProviders } from "./testing/renderWithProviders";

describe("routes", () => {
  it("exports the expected route paths", () => {
    expect(routes.map((route) => route.path)).toEqual([
      "/",
      "/detail/:id",
      "/create",
    ]);
  });

  it("renders the tenants root page through the suspense boundary", async () => {
    renderWithProviders(<TenantRootPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
    });
  });
});
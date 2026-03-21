import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { Routes, Route } from "react-router";
import { MockQueryBus } from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import { renderWithProviders } from "../testing/renderWithProviders";
import { ExampleDetailPage } from "./ExampleDetailPage";
import { exampleDetails, EXAMPLE_DETAIL_QUERY } from "../data/sampleData.js";

describe("ExampleDetailPage", () => {
  const firstDetail = exampleDetails[0];

  it("renders detail data for a specific item", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<ExampleDetailPage />} />
      </Routes>,
      { initialRoute: `/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(screen.getByText(firstDetail.name)).toBeInTheDocument();
    });

    // Verify General Information section
    expect(screen.getByText("General Information")).toBeInTheDocument();
    expect(screen.getByText(firstDetail.category)).toBeInTheDocument();
    expect(screen.getByText(firstDetail.priority)).toBeInTheDocument();
    expect(screen.getByText(firstDetail.status)).toBeInTheDocument();

    // Verify Audit Trail section
    expect(screen.getByText("Audit Trail")).toBeInTheDocument();
    expect(screen.getByText("Created By")).toBeInTheDocument();
  });

  it("renders loading skeleton while data loads", () => {
    const slowQueryBus = new MockQueryBus({ delay: 500 });
    const TENANT = createMockTenantContext().activeTenant;
    const detailKey = `${TENANT}:${EXAMPLE_DETAIL_QUERY.domain}:${EXAMPLE_DETAIL_QUERY.queryType}:${firstDetail.id}:`;
    slowQueryBus.setResponse(detailKey, firstDetail);

    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<ExampleDetailPage />} />
      </Routes>,
      { initialRoute: `/${firstDetail.id}`, queryBus: slowQueryBus },
    );

    // Should show loading skeleton (page title during loading)
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders error state on failure", async () => {
    const errorQueryBus = new MockQueryBus({ delay: 30 });
    const TENANT = createMockTenantContext().activeTenant;
    const detailKey = `${TENANT}:${EXAMPLE_DETAIL_QUERY.domain}:${EXAMPLE_DETAIL_QUERY.queryType}:${firstDetail.id}:`;
    errorQueryBus.setError(detailKey, new Error("Not found"));

    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<ExampleDetailPage />} />
      </Routes>,
      { initialRoute: `/${firstDetail.id}`, queryBus: errorQueryBus },
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load item")).toBeInTheDocument();
    });
  });
});

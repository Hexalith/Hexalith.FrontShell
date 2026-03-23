import { screen, waitFor } from "@testing-library/react";
import { Routes, Route } from "react-router";
import { describe, it, expect } from "vitest";

import { MockQueryBus } from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import { TenantDetailPage } from "./TenantDetailPage";
import { sampleTenantDetails, TENANT_DETAIL_QUERY } from "../data/sampleData.js";
import { renderWithProviders } from "../testing/renderWithProviders";

describe("TenantDetailPage", () => {
  const firstDetail = sampleTenantDetails[0];

  it("renders detail data for a specific tenant", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<TenantDetailPage />} />
      </Routes>,
      { initialRoute: `/${firstDetail.id}` },
    );

    await waitFor(() => {
      // Name appears in both PageLayout title and DetailView — use getAllByText
      expect(screen.getAllByText(firstDetail.name).length).toBeGreaterThanOrEqual(1);
    });

    // Verify General Information section
    expect(screen.getByText("General Information")).toBeInTheDocument();
    expect(screen.getByText(firstDetail.code)).toBeInTheDocument();
    expect(screen.getByText(firstDetail.status)).toBeInTheDocument();

    // Verify Audit Trail section
    expect(screen.getByText("Audit Trail")).toBeInTheDocument();
    expect(screen.getByText("Created By")).toBeInTheDocument();
  });

  it("renders loading skeleton while data loads", () => {
    const slowQueryBus = new MockQueryBus({ delay: 500 });
    const TENANT = createMockTenantContext().activeTenant;
    const detailKey = `${TENANT}:${TENANT_DETAIL_QUERY.domain}:${TENANT_DETAIL_QUERY.queryType}:${firstDetail.id}:`;
    slowQueryBus.setResponse(detailKey, firstDetail);

    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<TenantDetailPage />} />
      </Routes>,
      { initialRoute: `/${firstDetail.id}`, queryBus: slowQueryBus },
    );

    expect(
      screen.getByRole("status", { name: /loading content/i }),
    ).toBeInTheDocument();
  });

  it("renders error state on failure", async () => {
    const errorQueryBus = new MockQueryBus({ delay: 30 });
    const TENANT = createMockTenantContext().activeTenant;
    const detailKey = `${TENANT}:${TENANT_DETAIL_QUERY.domain}:${TENANT_DETAIL_QUERY.queryType}:${firstDetail.id}:`;
    errorQueryBus.setError(detailKey, new Error("Not found"));

    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<TenantDetailPage />} />
      </Routes>,
      { initialRoute: `/${firstDetail.id}`, queryBus: errorQueryBus },
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load tenant")).toBeInTheDocument();
    });
  });

  it("renders back button", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<TenantDetailPage />} />
      </Routes>,
      { initialRoute: `/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(screen.getAllByText(firstDetail.name).length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("renders an inline error when the tenant id is missing", () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<TenantDetailPage />} />
      </Routes>,
      { initialRoute: "/" },
    );

    expect(screen.getByText("Failed to load tenant")).toBeInTheDocument();
    expect(
      screen.getByText(/Tenant identifier is missing/i),
    ).toBeInTheDocument();
  });
});

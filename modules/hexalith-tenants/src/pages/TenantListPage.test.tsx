import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router";
import { describe, it, expect } from "vitest";

import { MockQueryBus } from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import { TenantListPage } from "./TenantListPage";
import { sampleTenants, TENANT_LIST_QUERY } from "../data/sampleData.js";
import { renderWithProviders } from "../testing/renderWithProviders";

describe("TenantListPage", () => {
  it("renders loading state initially", () => {
    const slowQueryBus = new MockQueryBus({ delay: 500 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${TENANT_LIST_QUERY.domain}:${TENANT_LIST_QUERY.queryType}::`;
    slowQueryBus.setResponse(listKey, sampleTenants);

    renderWithProviders(<TenantListPage />, { queryBus: slowQueryBus });

    expect(
      screen.getByRole("status", { name: /loading content/i }),
    ).toBeInTheDocument();
  });

  it("renders sample data in table after load", async () => {
    renderWithProviders(<TenantListPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
    });

    // Verify multiple sample items render
    expect(screen.getByText("TechVentures Inc.")).toBeInTheDocument();
    expect(screen.getByText("GlobalTrade Solutions")).toBeInTheDocument();

    // Verify column headers
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Code")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("renders empty state when no data", async () => {
    const emptyQueryBus = new MockQueryBus({ delay: 30 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${TENANT_LIST_QUERY.domain}:${TENANT_LIST_QUERY.queryType}::`;
    emptyQueryBus.setResponse(listKey, []);

    renderWithProviders(<TenantListPage />, { queryBus: emptyQueryBus });

    await waitFor(() => {
      expect(screen.getByText("No tenants yet")).toBeInTheDocument();
    });
  });

  it("renders error state on query failure", async () => {
    const errorQueryBus = new MockQueryBus({ delay: 30 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${TENANT_LIST_QUERY.domain}:${TENANT_LIST_QUERY.queryType}::`;
    errorQueryBus.setError(listKey, new Error("Network error"));

    renderWithProviders(<TenantListPage />, { queryBus: errorQueryBus });

    await waitFor(() => {
      expect(screen.getByText("Failed to load tenants")).toBeInTheDocument();
    });
  });

  it("navigates to detail on row click", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/" element={<TenantListPage />} />
        <Route path="/detail/:id" element={<div>Detail Page</div>} />
      </Routes>,
    );

    await waitFor(() => {
      expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Acme Corporation"));

    await waitFor(() => {
      expect(screen.getByText("Detail Page")).toBeInTheDocument();
    });
  });

  it("navigates to create on Create Tenant button click", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/" element={<TenantListPage />} />
        <Route path="/create" element={<div>Create Page</div>} />
      </Routes>,
    );

    await waitFor(() => {
      expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /create tenant/i }));

    await waitFor(() => {
      expect(screen.getByText("Create Page")).toBeInTheDocument();
    });
  });
});

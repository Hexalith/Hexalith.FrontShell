import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router";
import { describe, it, expect } from "vitest";

import { MockQueryBus } from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import { OrderListPage } from "./OrderListPage";
import { orderItems, ORDER_LIST_QUERY } from "../data/sampleData.js";
import { renderWithProviders } from "../testing/renderWithProviders";

// AC: 7-3#1, 7-3#3
describe("OrderListPage", () => {
  it("renders loading state initially", () => {
    const slowQueryBus = new MockQueryBus({ delay: 500 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${ORDER_LIST_QUERY.domain}:${ORDER_LIST_QUERY.queryType}::`;
    slowQueryBus.setResponse(listKey, orderItems);

    renderWithProviders(<OrderListPage />, { queryBus: slowQueryBus });

    expect(
      screen.getByRole("status", { name: /loading content/i }),
    ).toBeInTheDocument();
  });

  it("renders sample data in table after load", async () => {
    renderWithProviders(<OrderListPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
    });

    // Verify multiple sample items render
    expect(screen.getByText("TechVentures Inc.")).toBeInTheDocument();
    expect(screen.getByText("GlobalTrade Solutions")).toBeInTheDocument();

    // Verify column headers
    expect(screen.getByText("Order #")).toBeInTheDocument();
    expect(screen.getByText("Customer")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("renders empty state when no data", async () => {
    const emptyQueryBus = new MockQueryBus({ delay: 30 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${ORDER_LIST_QUERY.domain}:${ORDER_LIST_QUERY.queryType}::`;
    emptyQueryBus.setResponse(listKey, []);

    renderWithProviders(<OrderListPage />, { queryBus: emptyQueryBus });

    await waitFor(() => {
      expect(screen.getByText("No orders yet")).toBeInTheDocument();
    });
  });

  it("renders error state on query failure", async () => {
    const errorQueryBus = new MockQueryBus({ delay: 30 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${ORDER_LIST_QUERY.domain}:${ORDER_LIST_QUERY.queryType}::`;
    errorQueryBus.setError(listKey, new Error("Network error"));

    renderWithProviders(<OrderListPage />, { queryBus: errorQueryBus });

    await waitFor(() => {
      expect(screen.getByText("Failed to load orders")).toBeInTheDocument();
    });
  });

  it("navigates to detail on row click", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/" element={<OrderListPage />} />
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

  it("navigates to create on Create Order button click", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/" element={<OrderListPage />} />
        <Route path="/create" element={<div>Create Page</div>} />
      </Routes>,
    );

    await waitFor(() => {
      expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /create order/i }));

    await waitFor(() => {
      expect(screen.getByText("Create Page")).toBeInTheDocument();
    });
  });
});

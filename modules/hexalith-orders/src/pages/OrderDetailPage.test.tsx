import { screen, waitFor } from "@testing-library/react";
import { Routes, Route } from "react-router";
import { describe, it, expect } from "vitest";

import { MockQueryBus } from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import { OrderDetailPage } from "./OrderDetailPage";
import { orderDetails, ORDER_DETAIL_QUERY } from "../data/sampleData.js";
import { renderWithProviders } from "../testing/renderWithProviders";

// AC: 7-3#1, 7-3#3
describe("OrderDetailPage", () => {
  const firstDetail = orderDetails[0];

  it("renders detail data for a specific order", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<OrderDetailPage />} />
      </Routes>,
      { initialRoute: `/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(
        screen.getByText(`Order ${firstDetail.orderNumber}`),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Order Information")).toBeInTheDocument();
    expect(screen.getByText(firstDetail.customerName)).toBeInTheDocument();
    expect(screen.getByText(firstDetail.status)).toBeInTheDocument();

    expect(screen.getByText("Shipping")).toBeInTheDocument();
    // Shipping and billing addresses may be identical, so use getAllByText
    expect(
      screen.getAllByText(firstDetail.shippingAddress).length,
    ).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("Audit Trail")).toBeInTheDocument();
    expect(screen.getByText("Created At")).toBeInTheDocument();
    expect(screen.getByText("Updated At")).toBeInTheDocument();
  });

  it("renders loading skeleton while data loads", () => {
    const slowQueryBus = new MockQueryBus({ delay: 500 });
    const TENANT = createMockTenantContext().activeTenant;
    const detailKey = `${TENANT}:${ORDER_DETAIL_QUERY.domain}:${ORDER_DETAIL_QUERY.queryType}:${firstDetail.id}:`;
    slowQueryBus.setResponse(detailKey, firstDetail);

    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<OrderDetailPage />} />
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
    const detailKey = `${TENANT}:${ORDER_DETAIL_QUERY.domain}:${ORDER_DETAIL_QUERY.queryType}:${firstDetail.id}:`;
    errorQueryBus.setError(detailKey, new Error("Not found"));

    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<OrderDetailPage />} />
      </Routes>,
      { initialRoute: `/${firstDetail.id}`, queryBus: errorQueryBus },
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load order")).toBeInTheDocument();
    });
  });

  it("renders back button", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<OrderDetailPage />} />
      </Routes>,
      { initialRoute: `/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(
        screen.getByText(`Order ${firstDetail.orderNumber}`),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("renders nothing when id is missing and query is disabled", () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<OrderDetailPage />} />
      </Routes>,
      { initialRoute: "/" },
    );

    // With no id, useQuery is disabled and data is undefined — renders null
    expect(screen.queryByText("Order Information")).not.toBeInTheDocument();
  });
});

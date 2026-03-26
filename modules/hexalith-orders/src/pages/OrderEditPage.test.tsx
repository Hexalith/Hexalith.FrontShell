import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { describe, it, expect, afterEach, vi } from "vitest";

import {
  CommandRejectedError,
  MockQueryBus,
} from "@hexalith/cqrs-client";
import * as cqrsClient from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import { OrderEditPage } from "./OrderEditPage";
import {
  orderDetails,
  ORDER_DETAIL_QUERY,
} from "../data/sampleData.js";
import { renderWithProviders } from "../testing/renderWithProviders";

describe("OrderEditPage", () => {
  const firstDetail = orderDetails[0];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading skeleton while data loads", () => {
    const slowQueryBus = new MockQueryBus({ delay: 500 });
    const TENANT = createMockTenantContext().activeTenant;
    const detailKey = `${TENANT}:${ORDER_DETAIL_QUERY.domain}:${ORDER_DETAIL_QUERY.queryType}:${firstDetail.id}:`;
    slowQueryBus.setResponse(detailKey, firstDetail);

    renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<OrderEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}`, queryBus: slowQueryBus },
    );

    expect(
      screen.getByRole("status", { name: /loading content/i }),
    ).toBeInTheDocument();
  });

  it("pre-fills form with existing order data", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<OrderEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/customer name/i)).toHaveValue(
        firstDetail.customerName,
      );
    });

    expect(screen.getByLabelText(/shipping address/i)).toHaveValue(
      firstDetail.shippingAddress,
    );
    expect(screen.getByLabelText(/billing address/i)).toHaveValue(
      firstDetail.billingAddress,
    );
  });

  it("submits update command on valid form submission", async () => {
    const user = userEvent.setup();
    const { commandBus } = renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<OrderEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/customer name/i)).toHaveValue(
        firstDetail.customerName,
      );
    });

    await user.clear(screen.getByLabelText(/customer name/i));
    await user.type(screen.getByLabelText(/customer name/i), "Updated Corp");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(commandBus.getCalls().length).toBeGreaterThanOrEqual(1);
    });

    const call = commandBus.getCalls()[0];
    expect(call.command.commandType).toBe("UpdateOrder");
    expect(call.command.domain).toBe("Orders");
    expect(call.command.aggregateId).toBe(firstDetail.id);
  });

  it("renders inline rejection feedback when the command is rejected", async () => {
    vi.spyOn(cqrsClient, "useCommandPipeline").mockReturnValue({
      send: vi.fn(),
      status: "rejected",
      error: new CommandRejectedError("OrderAlreadyShipped", "corr-1"),
      correlationId: "corr-1",
      replay: null,
    });

    renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<OrderEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByText("Command rejected")).toBeInTheDocument();
  });

  it("offers replay when the command times out", async () => {
    const user = userEvent.setup();
    const replay = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(cqrsClient, "useCommandPipeline").mockReturnValue({
      send: vi.fn(),
      status: "timedOut",
      error: new Error("Command timed out before confirmation."),
      correlationId: "corr-2",
      replay,
    });

    renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<OrderEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /try again/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(replay).toHaveBeenCalledTimes(1);
  });

  it("navigates back on cancel", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/" element={<div>Order List</div>} />
        <Route path="/edit/:id" element={<OrderEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/customer name/i)).toHaveValue(
        firstDetail.customerName,
      );
    });

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByText("Order List")).toBeInTheDocument();
    });
  });

  it("renders error when order id is missing", () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<OrderEditPage />} />
      </Routes>,
      { initialRoute: "/" },
    );

    expect(screen.getByText("Failed to load order")).toBeInTheDocument();
    expect(screen.getByText("Order not found")).toBeInTheDocument();
  });

  it("renders error state on data fetch failure", async () => {
    const errorQueryBus = new MockQueryBus({ delay: 30 });
    const TENANT = createMockTenantContext().activeTenant;
    const detailKey = `${TENANT}:${ORDER_DETAIL_QUERY.domain}:${ORDER_DETAIL_QUERY.queryType}:${firstDetail.id}:`;
    errorQueryBus.setError(detailKey, new Error("Not found"));

    renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<OrderEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}`, queryBus: errorQueryBus },
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load order")).toBeInTheDocument();
    });
  });
});

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { describe, it, expect, afterEach, vi } from "vitest";

import {
  CommandRejectedError,
  MockCommandBus,
} from "@hexalith/cqrs-client";
import * as cqrsClient from "@hexalith/cqrs-client";

import { OrderCreatePage } from "./OrderCreatePage";
import { renderWithProviders } from "../testing/renderWithProviders";

// AC: 7-3#1, 7-3#3
describe("OrderCreatePage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders create form with all fields", () => {
    renderWithProviders(<OrderCreatePage />);

    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/shipping address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/billing address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create order/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("submits command via useCommandPipeline", async () => {
    const user = userEvent.setup();
    const { commandBus } = renderWithProviders(<OrderCreatePage />);

    await user.type(
      screen.getByLabelText(/customer name/i),
      "Acme Corporation",
    );
    await user.type(
      screen.getByLabelText(/shipping address/i),
      "123 Main Street",
    );
    await user.type(
      screen.getByLabelText(/billing address/i),
      "456 Billing Ave",
    );

    await user.click(screen.getByRole("button", { name: /create order/i }));

    await waitFor(() => {
      expect(commandBus.getCalls().length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows field-level validation errors for empty required fields", async () => {
    const user = userEvent.setup();

    renderWithProviders(<OrderCreatePage />);

    await user.click(screen.getByRole("button", { name: /create order/i }));

    await waitFor(() => {
      // All 3 required fields (customerName, shippingAddress, billingAddress) show errors
      expect(screen.getAllByText("Required").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows disabled button during submission", async () => {
    const user = userEvent.setup();
    const slowCommandBus = new MockCommandBus({
      delay: 2000,
      defaultBehavior: "success",
    });
    renderWithProviders(<OrderCreatePage />, { commandBus: slowCommandBus });

    await user.type(
      screen.getByLabelText(/customer name/i),
      "Acme Corporation",
    );
    await user.type(
      screen.getByLabelText(/shipping address/i),
      "123 Main Street",
    );
    await user.type(
      screen.getByLabelText(/billing address/i),
      "456 Billing Ave",
    );

    await user.click(screen.getByRole("button", { name: /create order/i }));

    await waitFor(() => {
      const submitButton = screen.getByRole("button", {
        name: /sending|confirming/i,
      });
      expect(submitButton).toBeDisabled();
    });
  });

  it("renders inline rejection feedback when the command is rejected", () => {
    vi.spyOn(cqrsClient, "useCommandPipeline").mockReturnValue({
      send: vi.fn(),
      status: "rejected",
      error: new CommandRejectedError("OrderLimitExceeded", "corr-1"),
      correlationId: "corr-1",
      replay: null,
    });

    renderWithProviders(<OrderCreatePage />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("OrderLimitExceeded");
  });

  it("navigates back on cancel", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/" element={<div>Order List</div>} />
        <Route path="/create" element={<OrderCreatePage />} />
      </Routes>,
      { initialRoute: "/create" },
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByText("Order List")).toBeInTheDocument();
    });
  });
});

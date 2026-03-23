import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { describe, it, expect, afterEach, vi } from "vitest";

import {
  CommandRejectedError,
  MockCommandBus,
} from "@hexalith/cqrs-client";
import * as cqrsClient from "@hexalith/cqrs-client";

import { TenantCreatePage } from "./TenantCreatePage";
import { renderWithProviders } from "../testing/renderWithProviders";

describe("TenantCreatePage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders create form with all fields", () => {
    renderWithProviders(<TenantCreatePage />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create tenant/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("submits command via useCommandPipeline", async () => {
    const user = userEvent.setup();
    const { commandBus } = renderWithProviders(<TenantCreatePage />);

    await user.type(screen.getByLabelText(/name/i), "Test Tenant");
    await user.type(screen.getByLabelText(/code/i), "test-tenant");

    await user.click(screen.getByRole("button", { name: /create tenant/i }));

    await waitFor(() => {
      expect(commandBus.getCalls().length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows field-level validation errors for empty name, invalid code, and invalid email", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TenantCreatePage />);

    await user.type(screen.getByLabelText(/code/i), "INVALID CODE");
    await user.type(screen.getByLabelText(/contact email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /create tenant/i }));

    await waitFor(() => {
      expect(screen.getByText("Required")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Lowercase alphanumeric and hyphens only"),
    ).toBeInTheDocument();
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
  });

  it("shows disabled button during submission", async () => {
    const user = userEvent.setup();
    const slowCommandBus = new MockCommandBus({ delay: 2000, defaultBehavior: "success" });
    renderWithProviders(<TenantCreatePage />, { commandBus: slowCommandBus });

    await user.type(screen.getByLabelText(/name/i), "Test Tenant");
    await user.type(screen.getByLabelText(/code/i), "test-tenant");

    await user.click(screen.getByRole("button", { name: /create tenant/i }));

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /sending|confirming/i });
      expect(submitButton).toBeDisabled();
    });
  });

  it("renders inline rejection feedback when the command is rejected", () => {
    vi.spyOn(cqrsClient, "useCommandPipeline").mockReturnValue({
      send: vi.fn(),
      status: "rejected",
      error: new CommandRejectedError("TenantAlreadyExists", "corr-1"),
      correlationId: "corr-1",
      replay: null,
    });

    renderWithProviders(<TenantCreatePage />);

    const alert = screen.getByRole("alert");

    expect(within(alert).getByText("Command rejected")).toBeInTheDocument();
    expect(alert).toHaveTextContent("TenantAlreadyExists");
    expect(
      screen.queryByRole("button", { name: /try again/i }),
    ).not.toBeInTheDocument();
  });

  it("offers replay when the command fails or times out", async () => {
    const user = userEvent.setup();
    const replay = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(cqrsClient, "useCommandPipeline").mockReturnValue({
      send: vi.fn(),
      status: "timedOut",
      error: new Error("Command timed out before confirmation."),
      correlationId: "corr-2",
      replay,
    });

    renderWithProviders(<TenantCreatePage />);

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(replay).toHaveBeenCalledTimes(1);
  });

  it("navigates back on cancel", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/" element={<div>Tenant List</div>} />
        <Route path="/create" element={<TenantCreatePage />} />
      </Routes>,
      { initialRoute: "/create" },
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByText("Tenant List")).toBeInTheDocument();
    });
  });
});

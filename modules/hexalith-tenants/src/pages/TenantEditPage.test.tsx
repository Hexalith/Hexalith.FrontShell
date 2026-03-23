import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { describe, it, expect, afterEach, vi } from "vitest";

import {
  CommandRejectedError,
  MockQueryBus,
} from "@hexalith/cqrs-client";
import * as cqrsClient from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import { TenantEditPage } from "./TenantEditPage";
import {
  sampleTenantDetails,
  TENANT_DETAIL_QUERY,
} from "../data/sampleData.js";
import { renderWithProviders } from "../testing/renderWithProviders";

describe("TenantEditPage", () => {
  const firstDetail = sampleTenantDetails[0];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading skeleton while data loads", () => {
    const slowQueryBus = new MockQueryBus({ delay: 500 });
    const TENANT = createMockTenantContext().activeTenant;
    const detailKey = `${TENANT}:${TENANT_DETAIL_QUERY.domain}:${TENANT_DETAIL_QUERY.queryType}:${firstDetail.id}:`;
    slowQueryBus.setResponse(detailKey, firstDetail);

    renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<TenantEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}`, queryBus: slowQueryBus },
    );

    expect(
      screen.getByRole("status", { name: /loading content/i }),
    ).toBeInTheDocument();
  });

  it("pre-fills form with existing tenant data", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<TenantEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue(firstDetail.name);
    });

    expect(screen.getByLabelText(/description/i)).toHaveValue(
      firstDetail.description,
    );
    expect(screen.getByLabelText(/contact email/i)).toHaveValue(
      firstDetail.contactEmail,
    );
  });

  it("validates empty name triggers error", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<TenantEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue(firstDetail.name);
    });

    // Clear name field
    await user.clear(screen.getByLabelText(/name/i));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/required|at least/i)).toBeInTheDocument();
    });
  });

  it("submits update command on valid form submission", async () => {
    const user = userEvent.setup();
    const { commandBus } = renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<TenantEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue(firstDetail.name);
    });

    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/name/i), "Updated Tenant");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(commandBus.getCalls().length).toBeGreaterThanOrEqual(1);
    });

    const call = commandBus.getCalls()[0];
    expect(call.command.commandType).toBe("UpdateTenant");
    expect(call.command.domain).toBe("Tenants");
    expect(call.command.aggregateId).toBe(firstDetail.id);
  });

  it("renders inline rejection feedback when the command is rejected", async () => {
    vi.spyOn(cqrsClient, "useCommandPipeline").mockReturnValue({
      send: vi.fn(),
      status: "rejected",
      error: new CommandRejectedError("TenantNameAlreadyExists", "corr-1"),
      correlationId: "corr-1",
      replay: null,
    });

    renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<TenantEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}` },
    );

    // Wait for data to load before asserting on error display
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Command rejected")).toBeInTheDocument();
    expect(alert).toHaveTextContent("TenantNameAlreadyExists");
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

    renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<TenantEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}` },
    );

    // Wait for data to load before looking for the retry button
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(replay).toHaveBeenCalledTimes(1);
  });

  it("navigates back on cancel", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/" element={<div>Tenant List</div>} />
        <Route path="/edit/:id" element={<TenantEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue(firstDetail.name);
    });

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByText("Tenant List")).toBeInTheDocument();
    });
  });

  it("renders error when tenant id is missing", () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<TenantEditPage />} />
      </Routes>,
      { initialRoute: "/" },
    );

    expect(screen.getByText("Failed to load tenant")).toBeInTheDocument();
    expect(screen.getByText("Tenant not found")).toBeInTheDocument();
  });

  it("renders error state on data fetch failure", async () => {
    const errorQueryBus = new MockQueryBus({ delay: 30 });
    const TENANT = createMockTenantContext().activeTenant;
    const detailKey = `${TENANT}:${TENANT_DETAIL_QUERY.domain}:${TENANT_DETAIL_QUERY.queryType}:${firstDetail.id}:`;
    errorQueryBus.setError(detailKey, new Error("Not found"));

    renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<TenantEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}`, queryBus: errorQueryBus },
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load tenant")).toBeInTheDocument();
    });
  });
});

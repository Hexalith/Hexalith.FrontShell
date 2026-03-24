import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router";
import { describe, it, expect, afterEach, vi } from "vitest";

import { MockQueryBus } from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import { TenantDetailPage } from "./TenantDetailPage";
import {
  sampleTenantDetails,
  TENANT_DETAIL_QUERY,
} from "../data/sampleData.js";
import { renderWithProviders } from "../testing/renderWithProviders";

// AC: 6-4#3 — Tenant detail page rendering and interactions
describe("TenantDetailPage", () => {
  const firstDetail = sampleTenantDetails[0];
  const disabledDetail = sampleTenantDetails.find(
    (t) => t.status === "Disabled",
  )!;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders detail data for a specific tenant", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<TenantDetailPage />} />
      </Routes>,
      { initialRoute: `/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(
        screen.getAllByText(firstDetail.name).length,
      ).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText("General Information")).toBeInTheDocument();
    expect(screen.getByText(firstDetail.code)).toBeInTheDocument();
    expect(screen.getByText(firstDetail.status)).toBeInTheDocument();

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
      expect(
        screen.getAllByText(firstDetail.name).length,
      ).toBeGreaterThanOrEqual(1);
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

  // --- New tests for Task 2 ---

  it("renders Edit button that navigates to edit page", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/detail/:id" element={<TenantDetailPage />} />
        <Route path="/edit/:id" element={<div>Edit Page</div>} />
      </Routes>,
      { initialRoute: `/detail/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(
        screen.getAllByText(firstDetail.name).length,
      ).toBeGreaterThanOrEqual(1);
    });

    await user.click(screen.getByRole("button", { name: /edit/i }));

    await waitFor(() => {
      expect(screen.getByText("Edit Page")).toBeInTheDocument();
    });
  });

  it("renders Disable button that opens Modal", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<TenantDetailPage />} />
      </Routes>,
      { initialRoute: `/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(
        screen.getAllByText(firstDetail.name).length,
      ).toBeGreaterThanOrEqual(1);
    });

    await user.click(screen.getByRole("button", { name: /disable/i }));

    await waitFor(() => {
      expect(screen.getByText("Disable Tenant")).toBeInTheDocument();
      expect(
        screen.getByText(/This action will disable the tenant/),
      ).toBeInTheDocument();
    });
  });

  it("disable form submit closes modal immediately and triggers command", async () => {
    const user = userEvent.setup();
    const { commandBus } = renderWithProviders(
      <Routes>
        <Route path="/:id" element={<TenantDetailPage />} />
      </Routes>,
      { initialRoute: `/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(
        screen.getAllByText(firstDetail.name).length,
      ).toBeGreaterThanOrEqual(1);
    });

    await user.click(screen.getByRole("button", { name: /disable/i }));

    await waitFor(() => {
      expect(screen.getByText("Disable Tenant")).toBeInTheDocument();
    });

    await user.type(
      screen.getByLabelText(/reason/i),
      "No longer needed",
    );
    await user.click(
      screen.getByRole("button", { name: /confirm disable/i }),
    );

    // Modal should close optimistically
    await waitFor(() => {
      expect(
        screen.queryByText("This action will disable the tenant"),
      ).not.toBeInTheDocument();
    });

    // Command should have been sent
    await waitFor(() => {
      expect(commandBus.getCalls().length).toBeGreaterThanOrEqual(1);
    });

    const call = commandBus.getCalls()[0];
    expect(call.command.commandType).toBe("DisableTenant");
    expect(call.command.domain).toBe("Tenants");
  });

  it("hides Disable button when status is Disabled", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<TenantDetailPage />} />
      </Routes>,
      { initialRoute: `/${disabledDetail.id}` },
    );

    await waitFor(() => {
      expect(
        screen.getAllByText(disabledDetail.name).length,
      ).toBeGreaterThanOrEqual(1);
    });

    expect(
      screen.queryByRole("button", { name: /disable/i }),
    ).not.toBeInTheDocument();

    // Edit and Back should still be there
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("Modal cancel closes without action", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/:id" element={<TenantDetailPage />} />
      </Routes>,
      { initialRoute: `/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(
        screen.getAllByText(firstDetail.name).length,
      ).toBeGreaterThanOrEqual(1);
    });

    await user.click(screen.getByRole("button", { name: /disable/i }));

    await waitFor(() => {
      expect(screen.getByText("Disable Tenant")).toBeInTheDocument();
    });

    // Click Cancel in the modal
    await user.click(
      screen.getByRole("button", { name: /cancel/i }),
    );

    await waitFor(() => {
      expect(
        screen.queryByText("This action will disable the tenant"),
      ).not.toBeInTheDocument();
    });
  });
});

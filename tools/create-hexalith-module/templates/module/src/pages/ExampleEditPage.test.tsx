import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { describe, it, expect } from "vitest";

import { MockQueryBus } from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import { ExampleEditPage } from "./ExampleEditPage";
import { renderWithProviders } from "../testing/renderWithProviders";
import { exampleDetails, EXAMPLE_DETAIL_QUERY } from "../data/sampleData.js";

describe("ExampleEditPage", () => {
  const firstDetail = exampleDetails[0];

  it("renders loading state initially", () => {
    const slowQueryBus = new MockQueryBus({ delay: 500 });
    const TENANT = createMockTenantContext().activeTenant;
    const detailKey = `${TENANT}:${EXAMPLE_DETAIL_QUERY.domain}:${EXAMPLE_DETAIL_QUERY.queryType}:${firstDetail.id}:`;
    slowQueryBus.setResponse(detailKey, firstDetail);

    renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<ExampleEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}`, queryBus: slowQueryBus },
    );

    expect(
      screen.getByRole("status", { name: /loading content/i }),
    ).toBeInTheDocument();
  });

  it("renders form pre-populated with existing data", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/edit/:id" element={<ExampleEditPage />} />
      </Routes>,
      { initialRoute: `/edit/${firstDetail.id}` },
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue(firstDetail.name);
    });

    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });
});

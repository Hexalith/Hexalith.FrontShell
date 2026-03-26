import { screen, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { MockQueryBus } from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import { ExampleEditPage } from "./ExampleEditPage";
import { renderWithProviders } from "../testing/renderWithProviders";
import { exampleDetails, DETAIL_QUERY } from "../data/sampleData.js";

describe("ExampleEditPage", () => {
  it("renders loading state initially", () => {
    const slowQueryBus = new MockQueryBus({ delay: 500 });
    const TENANT = createMockTenantContext().activeTenant;
    const detailKey = `${TENANT}:${DETAIL_QUERY.domain}:${DETAIL_QUERY.queryType}:${exampleDetails[0].id}:`;
    slowQueryBus.setResponse(detailKey, exampleDetails[0]);

    renderWithProviders(<ExampleEditPage />, {
      queryBus: slowQueryBus,
      routePath: "/edit/:id",
      initialEntry: `/edit/${exampleDetails[0].id}`,
    });

    expect(
      screen.getByRole("status", { name: /loading content/i }),
    ).toBeInTheDocument();
  });

  it("renders form pre-populated with existing data", async () => {
    renderWithProviders(<ExampleEditPage />, {
      routePath: "/edit/:id",
      initialEntry: `/edit/${exampleDetails[0].id}`,
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue(exampleDetails[0].name);
    });

    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });
});

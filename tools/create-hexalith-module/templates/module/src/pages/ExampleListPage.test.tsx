import { screen, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { MockQueryBus } from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import { ExampleListPage } from "./ExampleListPage";
import { exampleItems, EXAMPLE_LIST_QUERY } from "../data/sampleData.js";
import { renderWithProviders } from "../testing/renderWithProviders";

describe("ExampleListPage", () => {
  it("renders loading state initially", () => {
    // Use a long delay to catch the loading state
    const slowQueryBus = new MockQueryBus({ delay: 500 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${EXAMPLE_LIST_QUERY.domain}:${EXAMPLE_LIST_QUERY.queryType}::`;
    slowQueryBus.setResponse(listKey, exampleItems);

    renderWithProviders(<ExampleListPage />, { queryBus: slowQueryBus });

    expect(
      screen.getByRole("status", { name: /loading content/i }),
    ).toBeInTheDocument();
  });

  it("renders sample data in table after load", async () => {
    renderWithProviders(<ExampleListPage />);

    // Wait for the first sample item to appear
    await waitFor(() => {
      expect(screen.getByText("Project Atlas")).toBeInTheDocument();
    });

    // Verify multiple sample items render
    expect(screen.getByText("Operation Horizon")).toBeInTheDocument();
    expect(screen.getByText("Northern Distribution Hub")).toBeInTheDocument();

    // Verify column headers
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("renders empty state when no data", async () => {
    // Create a MockQueryBus with an explicit empty list response.
    // No configured response would produce a 404 error state, not an empty state.
    const emptyQueryBus = new MockQueryBus({ delay: 30 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${EXAMPLE_LIST_QUERY.domain}:${EXAMPLE_LIST_QUERY.queryType}::`;
    emptyQueryBus.setResponse(listKey, []);

    renderWithProviders(<ExampleListPage />, { queryBus: emptyQueryBus });

    await waitFor(() => {
      expect(screen.getByText("No items yet")).toBeInTheDocument();
    });
  });

  it("renders error state on query failure", async () => {
    const errorQueryBus = new MockQueryBus({ delay: 30 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${EXAMPLE_LIST_QUERY.domain}:${EXAMPLE_LIST_QUERY.queryType}::`;
    errorQueryBus.setError(listKey, new Error("Network error"));

    renderWithProviders(<ExampleListPage />, { queryBus: errorQueryBus });

    await waitFor(() => {
      expect(screen.getByText("Failed to load items")).toBeInTheDocument();
    });
  });
});

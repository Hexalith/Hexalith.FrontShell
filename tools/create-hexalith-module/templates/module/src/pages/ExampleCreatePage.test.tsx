import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockCommandBus } from "@hexalith/cqrs-client";

import { renderWithProviders } from "../testing/renderWithProviders";
import { ExampleCreatePage } from "./ExampleCreatePage";

describe("ExampleCreatePage", () => {
  it("renders create form with all fields", () => {
    renderWithProviders(<ExampleCreatePage />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("submits command via useCommandPipeline", async () => {
    const user = userEvent.setup();
    const { commandBus } = renderWithProviders(<ExampleCreatePage />);

    // Fill text fields
    await user.type(screen.getByLabelText(/name/i), "Test Item Name");
    await user.type(screen.getByLabelText(/description/i), "A test description");

    // Select Category — Radix Select: click trigger to open, click option
    const categoryTrigger = screen.getByRole("combobox", { name: /category/i });
    await user.click(categoryTrigger);
    await waitFor(() => {
      expect(screen.getByText("Operations")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Operations"));

    // Select Priority — same pattern
    const priorityTrigger = screen.getByRole("combobox", { name: /priority/i });
    await user.click(priorityTrigger);
    await waitFor(() => {
      expect(screen.getByText("High")).toBeInTheDocument();
    });
    await user.click(screen.getByText("High"));

    // Submit form
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(commandBus.getCalls().length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows disabled button during submission", async () => {
    const user = userEvent.setup();
    const slowCommandBus = new MockCommandBus({ delay: 2000, defaultBehavior: "success" });
    renderWithProviders(<ExampleCreatePage />, { commandBus: slowCommandBus });

    // Fill valid form data
    await user.type(screen.getByLabelText(/name/i), "Test Item Name");
    await user.type(screen.getByLabelText(/description/i), "A test description");

    // Select Category
    const categoryTrigger = screen.getByRole("combobox", { name: /category/i });
    await user.click(categoryTrigger);
    await waitFor(() => {
      expect(screen.getByText("Operations")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Operations"));

    // Select Priority
    const priorityTrigger = screen.getByRole("combobox", { name: /priority/i });
    await user.click(priorityTrigger);
    await waitFor(() => {
      expect(screen.getByText("High")).toBeInTheDocument();
    });
    await user.click(screen.getByText("High"));

    // Submit
    await user.click(screen.getByRole("button", { name: /create/i }));

    // Button should become disabled during submission
    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /sending|confirming/i });
      expect(submitButton).toBeDisabled();
    });
  });
});

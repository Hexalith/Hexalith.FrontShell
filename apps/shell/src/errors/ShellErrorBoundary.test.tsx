import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

import { ShellErrorBoundary } from "./ShellErrorBoundary";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function ThrowingComponent() {
  throw new Error("Shell catastrophic failure");
}

describe("ShellErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ShellErrorBoundary>
        <div>App content</div>
      </ShellErrorBoundary>,
    );
    expect(screen.getByText("App content")).toBeTruthy();
  });

  it('catches error and shows diagnostic UI with "Something went wrong" heading', () => {
    render(
      <ShellErrorBoundary>
        <ThrowingComponent />
      </ShellErrorBoundary>,
    );

    expect(
      screen.getByText("Something went wrong"),
    ).toBeTruthy();
    expect(
      screen.getByText(/Your session is preserved/i),
    ).toBeTruthy();
  });

  it("shows reload button", () => {
    render(
      <ShellErrorBoundary>
        <ThrowingComponent />
      </ShellErrorBoundary>,
    );

    expect(screen.getByRole("button", { name: /reload/i })).toBeTruthy();
  });

  it("reload button triggers window.location.reload", async () => {
    const originalLocation = window.location;
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, reload: reloadMock },
      writable: true,
    });

    render(
      <ShellErrorBoundary>
        <ThrowingComponent />
      </ShellErrorBoundary>,
    );

    await userEvent.click(screen.getByRole("button", { name: /reload/i }));
    expect(reloadMock).toHaveBeenCalledOnce();

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  it("error info is logged to console", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ShellErrorBoundary>
        <ThrowingComponent />
      </ShellErrorBoundary>,
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      "[ShellError]",
      expect.objectContaining({
        error: "Shell catastrophic failure",
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      }),
    );
  });
});

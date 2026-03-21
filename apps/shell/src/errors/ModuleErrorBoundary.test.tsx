import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

import { ModuleErrorBoundary } from "./ModuleErrorBoundary";

// Suppress React error boundary console.error noise during tests
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Module render failure");
  }
  return <div>Module content</div>;
}

describe("ModuleErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ModuleErrorBoundary name="Tenants">
        <div>Module content</div>
      </ModuleErrorBoundary>,
    );
    expect(screen.getByText("Module content")).toBeTruthy();
  });

  it("catches render error and shows fallback UI", () => {
    render(
      <ModuleErrorBoundary name="Tenants">
        <ThrowingComponent />
      </ModuleErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Module render failure")).toBeTruthy();
  });

  it("displays module name in error title", () => {
    render(
      <ModuleErrorBoundary name="Tenants">
        <ThrowingComponent />
      </ModuleErrorBoundary>,
    );
    expect(screen.getByText("Unable to load Tenants")).toBeTruthy();
  });

  it("retry button resets error boundary and re-renders children", async () => {
    let shouldThrow = true;
    function ConditionalThrow() {
      if (shouldThrow) {
        throw new Error("Temporary failure");
      }
      return <div>Recovered content</div>;
    }

    render(
      <ModuleErrorBoundary name="Orders">
        <ConditionalThrow />
      </ModuleErrorBoundary>,
    );

    expect(screen.getByText("Unable to load Orders")).toBeTruthy();

    // Fix the error condition before retry
    shouldThrow = false;

    const retryButton = screen.getByRole("button", { name: /try again/i });
    await userEvent.click(retryButton);

    expect(screen.getByText("Recovered content")).toBeTruthy();
  });

  it("other modules remain unaffected when one crashes", () => {
    render(
      <div>
        <ModuleErrorBoundary name="Broken">
          <ThrowingComponent />
        </ModuleErrorBoundary>
        <ModuleErrorBoundary name="Working">
          <div>Working module</div>
        </ModuleErrorBoundary>
      </div>,
    );

    expect(screen.getByText("Unable to load Broken")).toBeTruthy();
    expect(screen.getByText("Working module")).toBeTruthy();
  });

  it("catches lazy import rejection and shows retry UI", () => {
    function ChunkLoadFailure() {
      throw new Error("Failed to fetch dynamically imported module");
    }

    render(
      <ModuleErrorBoundary name="Tasks">
        <ChunkLoadFailure />
      </ModuleErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Unable to load Tasks")).toBeTruthy();
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
  });
});

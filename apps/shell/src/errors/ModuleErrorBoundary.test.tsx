import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

import { CommandRejectedError } from "@hexalith/cqrs-client";

import { ModuleErrorBoundary } from "./ModuleErrorBoundary";
import { getModuleErrorLog, _clearModuleErrorLog } from "./moduleErrorEvents";

// Suppress React error boundary console.error noise during tests
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  _clearModuleErrorLog();
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

  it("displays contextual render-error title with module name", () => {
    render(
      <ModuleErrorBoundary name="Tenants">
        <ThrowingComponent />
      </ModuleErrorBoundary>,
    );
    expect(
      screen.getByText(/Unable to load Tenants\. Other sections continue to work normally\./i),
    ).toBeTruthy();
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

    expect(
      screen.getByText(/Unable to load Orders/i),
    ).toBeTruthy();

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

    expect(screen.getByText(/Unable to load Broken/i)).toBeTruthy();
    expect(screen.getByText("Working module")).toBeTruthy();
  });

  it("catches lazy import rejection and shows chunk-load error message", () => {
    function ChunkLoadFailure() {
      throw new Error("Failed to fetch dynamically imported module");
    }

    render(
      <ModuleErrorBoundary name="Tasks">
        <ChunkLoadFailure />
      </ModuleErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(
      screen.getByText(/Unable to load Tasks\. Check your connection and try again\./i),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
  });

  it('shows network-error message for TypeError with "fetch"', () => {
    function NetworkFailure() {
      throw new TypeError("Failed to fetch");
    }

    render(
      <ModuleErrorBoundary name="Inventory">
        <NetworkFailure />
      </ModuleErrorBoundary>,
    );

    expect(
      screen.getByText(/Inventory data is temporarily unavailable/i),
    ).toBeTruthy();
  });

  it("emits structured error event on componentDidCatch", () => {
    render(
      <ModuleErrorBoundary name="Tenants">
        <ThrowingComponent />
      </ModuleErrorBoundary>,
    );

    const log = getModuleErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0]!.moduleName).toBe("Tenants");
    expect(log[0]!.classification).toBe("render-error");
    expect(log[0]!.errorMessage).toBe("Module render failure");
    expect(log[0]!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("retry button clears error for all error classifications", async () => {
    // Test chunk-load retry
    let throwChunk = true;
    function ChunkError() {
      if (throwChunk) throw new Error("Failed to fetch dynamically imported module");
      return <div>Chunk recovered</div>;
    }

    const { unmount: u1 } = render(
      <ModuleErrorBoundary name="A">
        <ChunkError />
      </ModuleErrorBoundary>,
    );
    throwChunk = false;
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByText("Chunk recovered")).toBeTruthy();
    u1();

    // Test network retry
    let throwNetwork = true;
    function NetworkError() {
      if (throwNetwork) throw new TypeError("Failed to fetch");
      return <div>Network recovered</div>;
    }

    const { unmount: u2 } = render(
      <ModuleErrorBoundary name="B">
        <NetworkError />
      </ModuleErrorBoundary>,
    );
    throwNetwork = false;
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByText("Network recovered")).toBeTruthy();
    u2();

    // Test render retry
    let throwRender = true;
    function RenderError() {
      if (throwRender) throw new Error("render crash");
      return <div>Render recovered</div>;
    }

    render(
      <ModuleErrorBoundary name="C">
        <RenderError />
      </ModuleErrorBoundary>,
    );
    throwRender = false;
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByText("Render recovered")).toBeTruthy();
  });

  // In production, CommandRejectedError is surfaced via hook return value, not thrown.
  // This test confirms the boundary handles it gracefully if it ever does reach the boundary.
  it("catches CommandRejectedError gracefully (AC5 boundary proof)", () => {
    function BusinessError() {
      throw new CommandRejectedError("OrderRejected", "corr-123");
    }

    render(
      <ModuleErrorBoundary name="Orders">
        <BusinessError />
      </ModuleErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Unable to load Orders/i)).toBeTruthy();
  });
});

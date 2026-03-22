import React from "react";
import { render, screen, act, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

import { ModuleRenderGuard } from "./ModuleRenderGuard";

// Simple error boundary for test assertions
class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <div data-testid="error-caught">{this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

// Suppress React error boundary console.error noise during tests
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ModuleRenderGuard", () => {
  it("renders children normally when module returns valid content", async () => {
    render(
      <TestErrorBoundary>
        <ModuleRenderGuard moduleName="Tasks">
          <div>Task list content</div>
        </ModuleRenderGuard>
      </TestErrorBoundary>,
    );

    // Advance past the 100ms check
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText("Task list content")).toBeTruthy();
    expect(screen.queryByTestId("error-caught")).toBeNull();
  });

  it("throws error when module renders null (empty children)", async () => {
    function NullModule() {
      return null;
    }

    render(
      <TestErrorBoundary>
        <ModuleRenderGuard moduleName="Broken">
          <NullModule />
        </ModuleRenderGuard>
      </TestErrorBoundary>,
    );

    // Advance past the 100ms check
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const errorEl = screen.getByTestId("error-caught");
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain("Module 'Broken' rendered empty content");
  });

  it("throws error when module renders undefined (no children passed)", async () => {
    render(
      <TestErrorBoundary>
        <ModuleRenderGuard moduleName="Empty">
          {undefined as unknown as React.ReactNode}
        </ModuleRenderGuard>
      </TestErrorBoundary>,
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const errorEl = screen.getByTestId("error-caught");
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain("Module 'Empty' rendered empty content");
  });

  it("does not interfere with module that renders valid content", async () => {
    function ValidModule() {
      return <span>Valid content</span>;
    }

    render(
      <TestErrorBoundary>
        <ModuleRenderGuard moduleName="Valid">
          <ValidModule />
        </ModuleRenderGuard>
      </TestErrorBoundary>,
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText("Valid content")).toBeTruthy();
    expect(screen.queryByTestId("error-caught")).toBeNull();
  });

  it("error message includes module name for debugging", async () => {
    function NullModule() {
      return null;
    }

    render(
      <TestErrorBoundary>
        <ModuleRenderGuard moduleName="MySpecialModule">
          <NullModule />
        </ModuleRenderGuard>
      </TestErrorBoundary>,
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const errorEl = screen.getByTestId("error-caught");
    expect(errorEl.textContent).toContain("MySpecialModule");
  });

  it("guard cleans up timeout on unmount — no error thrown after navigation away", async () => {
    function NullModule() {
      return null;
    }

    const { unmount } = render(
      <TestErrorBoundary>
        <ModuleRenderGuard moduleName="NavAway">
          <NullModule />
        </ModuleRenderGuard>
      </TestErrorBoundary>,
    );

    // Unmount before 100ms elapses
    unmount();

    // Advance past the timeout — should not throw since component unmounted
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // No error should be thrown (component is unmounted)
    // If the timeout wasn't cleaned up, this would cause issues
  });
});

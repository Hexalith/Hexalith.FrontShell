import React from "react";
import {
  render,
  screen,
  renderHook,
  cleanup,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ThemeProvider } from "./ThemeProvider";
import { useTheme } from "./useTheme";

// Mock matchMedia (jsdom doesn't support it)
function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: prefersDark && query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function ThemeConsumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button data-testid="toggle-btn" onClick={toggleTheme} />
    </div>
  );
}

describe("ThemeProvider & useTheme — Acceptance Tests", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    mockMatchMedia(false);
  });

  // ─── AC #2: useTheme returns theme state ───────────────────────
  describe("AC #2 — useTheme returns theme state", () => {
    it("returns { theme, toggleTheme }", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId("theme").textContent).toBe("light");
    });

    it("sets data-theme on document.documentElement", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(
        document.documentElement.getAttribute("data-theme"),
      ).toBe("light");
    });

    it("toggleTheme switches light↔dark", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId("theme").textContent).toBe("light");

      act(() => {
        screen.getByTestId("toggle-btn").click();
      });

      expect(screen.getByTestId("theme").textContent).toBe("dark");

      act(() => {
        screen.getByTestId("toggle-btn").click();
      });

      expect(screen.getByTestId("theme").textContent).toBe("light");
    });

    it("persists to localStorage hexalith-theme", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      act(() => {
        screen.getByTestId("toggle-btn").click();
      });

      expect(localStorage.getItem("hexalith-theme")).toBe("dark");
    });

    it("initializes from localStorage", () => {
      localStorage.setItem("hexalith-theme", "dark");

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId("theme").textContent).toBe("dark");
      expect(
        document.documentElement.getAttribute("data-theme"),
      ).toBe("dark");
    });

    it("initializes from matchMedia when no localStorage", () => {
      mockMatchMedia(true); // prefers dark

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId("theme").textContent).toBe("dark");
    });

    it("corrupted localStorage → falls to matchMedia", () => {
      localStorage.setItem("hexalith-theme", "invalid-value");
      mockMatchMedia(true);

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId("theme").textContent).toBe("dark");
    });

    it("localStorage precedence over matchMedia", () => {
      localStorage.setItem("hexalith-theme", "light");
      mockMatchMedia(true); // prefers dark, but localStorage says light

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId("theme").textContent).toBe("light");
    });
  });

  // ─── AC #5: Error outside provider ─────────────────────────────
  describe("AC #5 — throws outside ThemeProvider", () => {
    it("throws when used outside ThemeProvider", () => {
      const spy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      expect(() => renderHook(() => useTheme())).toThrow(
        "useTheme must be used within ThemeProvider",
      );
      spy.mockRestore();
    });
  });
});

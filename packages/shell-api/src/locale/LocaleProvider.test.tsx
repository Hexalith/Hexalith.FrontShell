import React from "react";
import {
  render,
  screen,
  renderHook,
  cleanup,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { LocaleProvider } from "./LocaleProvider";
import { useLocale } from "./useLocale";

function LocaleConsumer() {
  const {
    locale,
    defaultCurrency,
    formatDate,
    formatNumber,
    formatCurrency,
  } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="default-currency">{defaultCurrency}</span>
      <span data-testid="format-date">
        {formatDate("2026-01-15T10:30:00Z")}
      </span>
      <span data-testid="format-number">{formatNumber(1234.56)}</span>
      <span data-testid="format-currency">
        {formatCurrency(1234.56, "USD")}
      </span>
    </div>
  );
}

describe("LocaleProvider & useLocale — Acceptance Tests", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── AC #3: useLocale returns locale state ─────────────────────
  describe("AC #3 — useLocale returns locale-aware formatters", () => {
    it("returns { locale, defaultCurrency, formatDate, formatNumber, formatCurrency }", () => {
      render(
        <LocaleProvider locale="en-US">
          <LocaleConsumer />
        </LocaleProvider>,
      );

      expect(screen.getByTestId("locale").textContent).toBe("en-US");
      expect(screen.getByTestId("default-currency").textContent).toBe(
        "USD",
      );
      // formatDate, formatNumber, formatCurrency should render something
      expect(screen.getByTestId("format-date").textContent).toBeTruthy();
      expect(screen.getByTestId("format-number").textContent).toBeTruthy();
      expect(
        screen.getByTestId("format-currency").textContent,
      ).toBeTruthy();
    });

    it("formatDate formats ISO 8601 string", () => {
      render(
        <LocaleProvider locale="en-US">
          <LocaleConsumer />
        </LocaleProvider>,
      );

      const dateText = screen.getByTestId("format-date").textContent;
      // en-US should format as something like "1/15/2026"
      expect(dateText).toContain("2026");
    });

    it("formatNumber formats number", () => {
      render(
        <LocaleProvider locale="en-US">
          <LocaleConsumer />
        </LocaleProvider>,
      );

      const numText = screen.getByTestId("format-number").textContent;
      // en-US formats 1234.56 as "1,234.56"
      expect(numText).toBe("1,234.56");
    });

    it("formatCurrency with currency code", () => {
      render(
        <LocaleProvider locale="en-US">
          <LocaleConsumer />
        </LocaleProvider>,
      );

      const currText = screen.getByTestId("format-currency").textContent;
      // en-US USD should format as "$1,234.56"
      expect(currText).toContain("1,234.56");
      expect(currText).toContain("$");
    });

    it("defaultCurrency defaults to USD", () => {
      render(
        <LocaleProvider locale="en-US">
          <LocaleConsumer />
        </LocaleProvider>,
      );

      expect(screen.getByTestId("default-currency").textContent).toBe(
        "USD",
      );
    });

    it("defaultCurrency prop override", () => {
      render(
        <LocaleProvider locale="en-US" defaultCurrency="EUR">
          <LocaleConsumer />
        </LocaleProvider>,
      );

      expect(screen.getByTestId("default-currency").textContent).toBe(
        "EUR",
      );
    });

    it("locale defaults to navigator.language", () => {
      // jsdom default navigator.language is typically 'en'
      render(
        <LocaleProvider>
          <LocaleConsumer />
        </LocaleProvider>,
      );

      expect(screen.getByTestId("locale").textContent).toBe(
        navigator.language,
      );
    });

    it("locale prop overrides browser default", () => {
      render(
        <LocaleProvider locale="fr-FR">
          <LocaleConsumer />
        </LocaleProvider>,
      );

      expect(screen.getByTestId("locale").textContent).toBe("fr-FR");
    });

    it("formatNumber locale=de-DE → German formatting", () => {
      function DeConsumer() {
        const { formatNumber: fmt } = useLocale();
        return <span data-testid="de-number">{fmt(1234.56)}</span>;
      }

      render(
        <LocaleProvider locale="de-DE">
          <DeConsumer />
        </LocaleProvider>,
      );

      // German format: "1.234,56"
      const text = screen.getByTestId("de-number").textContent!;
      expect(text).toContain("1.234");
      expect(text).toContain("56");
    });

    it("formatDate locale=de-DE → German formatting", () => {
      function DeConsumer() {
        const { formatDate: fmt } = useLocale();
        return (
          <span data-testid="de-date">{fmt("2026-01-15T10:30:00Z")}</span>
        );
      }

      render(
        <LocaleProvider locale="de-DE">
          <DeConsumer />
        </LocaleProvider>,
      );

      const text = screen.getByTestId("de-date").textContent!;
      // German date format: "15.1.2026" or similar
      expect(text).toContain("15");
      expect(text).toContain("2026");
    });

    it("formatCurrency locale=de-DE currency=EUR → German euro", () => {
      function DeConsumer() {
        const { formatCurrency: fmt } = useLocale();
        return (
          <span data-testid="de-currency">{fmt(1234.56, "EUR")}</span>
        );
      }

      render(
        <LocaleProvider locale="de-DE">
          <DeConsumer />
        </LocaleProvider>,
      );

      const text = screen.getByTestId("de-currency").textContent!;
      expect(text).toContain("1.234");
      expect(text).toContain("56");
    });

    it("locale prop change → formatters update", () => {
      function DynamicConsumer() {
        const { formatNumber: fmt } = useLocale();
        return <span data-testid="dynamic-num">{fmt(1234.56)}</span>;
      }

      const { rerender } = render(
        <LocaleProvider locale="en-US">
          <DynamicConsumer />
        </LocaleProvider>,
      );

      expect(screen.getByTestId("dynamic-num").textContent).toBe(
        "1,234.56",
      );

      rerender(
        <LocaleProvider locale="de-DE">
          <DynamicConsumer />
        </LocaleProvider>,
      );

      const text = screen.getByTestId("dynamic-num").textContent!;
      expect(text).toContain("1.234");
    });
  });

  // ─── AC #5: Error outside provider ─────────────────────────────
  describe("AC #5 — throws outside LocaleProvider", () => {
    it("throws when used outside LocaleProvider", () => {
      const spy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      expect(() => renderHook(() => useLocale())).toThrow(
        "useLocale must be used within LocaleProvider",
      );
      spy.mockRestore();
    });
  });
});

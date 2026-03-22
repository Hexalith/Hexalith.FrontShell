import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScrollRestoration, scrollManager } from "./ScrollRestoration";

describe("ScrollRestoration", () => {
  let scrollToSpy: ReturnType<typeof vi.spyOn>;
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    rafCallbacks = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    scrollManager.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function flushRAF() {
    for (const cb of rafCallbacks) {
      cb(0);
    }
    rafCallbacks = [];
  }

  function Home() {
    const navigate = useNavigate();

    return createElement(
      "button",
      { onClick: () => navigate("/tenants") },
      "Go to tenants",
    );
  }

  function Tenants() {
    const navigate = useNavigate();

    return createElement(
      "div",
      null,
      createElement(
        "button",
        { onClick: () => navigate("/") },
        "Go home",
      ),
      createElement(
        "button",
        { onClick: () => navigate(-1) },
        "Back",
      ),
    );
  }

  function TestApp({ initialPath = "/" }: { initialPath?: string }) {
    return createElement(
      MemoryRouter,
      { initialEntries: [initialPath] },
      createElement(ScrollRestoration),
      createElement(
        Routes,
        null,
        createElement(Route, { path: "/", element: createElement(Home) }),
        createElement(Route, { path: "/tenants", element: createElement(Tenants) }),
        createElement(Route, { path: "/orders", element: createElement("div", null, "Orders") }),
      ),
    );
  }

  it("scrolls to top for new routes", () => {
    render(createElement(TestApp, { initialPath: "/" }));
    flushRAF();

    // No saved position for "/" → scrolls to 0
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
  });

  it("saves scroll position on pathname change", () => {
    (window as unknown as { scrollY: number }).scrollY = 500;

    render(createElement(TestApp));
    flushRAF();

    fireEvent.click(screen.getByRole("button", { name: "Go to tenants" }));
    flushRAF();
    expect(scrollToSpy).toHaveBeenLastCalledWith(0, 0);

    (window as unknown as { scrollY: number }).scrollY = 120;

    fireEvent.click(screen.getByRole("button", { name: "Go home" }));
    flushRAF();

    expect(scrollToSpy).toHaveBeenLastCalledWith(0, 500);
  });

  it("restores scroll position for previously visited route", () => {
    (window as unknown as { scrollY: number }).scrollY = 350;
    render(createElement(TestApp));
    flushRAF();

    fireEvent.click(screen.getByRole("button", { name: "Go to tenants" }));
    flushRAF();

    (window as unknown as { scrollY: number }).scrollY = 50;

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    flushRAF();

    expect(scrollToSpy).toHaveBeenCalledWith(0, 350);
  });
});

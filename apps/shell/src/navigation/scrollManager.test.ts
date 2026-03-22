import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createScrollManager } from "./scrollManager";

describe("createScrollManager", () => {
  let scrollToSpy: ReturnType<typeof vi.spyOn>;
  let rafCallback: FrameRequestCallback | undefined;

  beforeEach(() => {
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallback = cb;
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rafCallback = undefined;
  });

  it("save() captures current window.scrollY value", () => {
    const manager = createScrollManager();
    (window as unknown as { scrollY: number }).scrollY = 500;

    manager.save("/tenants");

    // Verify by restoring and checking the value passed to scrollTo
    manager.restore("/tenants");
    rafCallback?.(0);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 500);
  });

  it("restore() calls window.scrollTo inside requestAnimationFrame", () => {
    const manager = createScrollManager();
    (window as unknown as { scrollY: number }).scrollY = 300;
    manager.save("/orders");

    manager.restore("/orders");

    // scrollTo not called yet (deferred via rAF)
    expect(scrollToSpy).not.toHaveBeenCalled();

    // Fire rAF callback
    rafCallback?.(0);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 300);
  });

  it("restore() scrolls to top (0) when no saved position exists", () => {
    const manager = createScrollManager();

    manager.restore("/unknown-route");
    rafCallback?.(0);

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
  });

  it("clear() removes all saved positions", () => {
    const manager = createScrollManager();
    (window as unknown as { scrollY: number }).scrollY = 100;
    manager.save("/route-a");
    (window as unknown as { scrollY: number }).scrollY = 200;
    manager.save("/route-b");

    manager.clear();

    // After clear, restoring should scroll to top (no saved position)
    manager.restore("/route-a");
    rafCallback?.(0);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
  });

  it("multiple routes maintain independent positions", () => {
    const manager = createScrollManager();

    (window as unknown as { scrollY: number }).scrollY = 100;
    manager.save("/tenants");

    (window as unknown as { scrollY: number }).scrollY = 750;
    manager.save("/orders");

    // Restore tenants
    manager.restore("/tenants");
    rafCallback?.(0);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 100);

    // Restore orders
    manager.restore("/orders");
    rafCallback?.(0);
    expect(scrollToSpy).toHaveBeenCalledWith(0, 750);
  });
});

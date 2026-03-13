import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";

import {
  MockShellProvider,
  createMockAuthContext,
  createMockTenantContext,
  createMockConnectionHealthContext,
  createMockFormDirtyContext,
} from "@hexalith/shell-api";
import type {
  TenantContextValue,
  ConnectionHealthContextValue,
  FormDirtyContextValue,
} from "@hexalith/shell-api";

import { StatusBar } from "./StatusBar";

afterEach(cleanup);

function renderStatusBar(overrides?: {
  tenantContext?: Partial<TenantContextValue>;
  connectionHealth?: Partial<ConnectionHealthContextValue>;
  formDirty?: Partial<FormDirtyContextValue>;
}) {
  return render(
    <MockShellProvider
      authContext={createMockAuthContext({
        isAuthenticated: true,
        user: {
          sub: "test",
          name: "Test User",
          tenantClaims: ["tenant-a", "tenant-b"],
        },
      })}
      tenantContext={createMockTenantContext(overrides?.tenantContext)}
      connectionHealthContext={createMockConnectionHealthContext(
        overrides?.connectionHealth,
      )}
      formDirtyContext={createMockFormDirtyContext(overrides?.formDirty)}
    >
      <StatusBar />
    </MockShellProvider>,
  );
}

// ─── 0.1 — Tests for AC #1, #2, #3, #8: segments, styling, truncation ───

describe("AC #1 — Status bar renders 4 segments", () => {
  it("renders tenant context segment", () => {
    renderStatusBar();
    // Tenant name appears in both <span> and <option> — use getAllByText
    const matches = screen.getAllByText(/test-tenant/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders connection health segment", () => {
    renderStatusBar();
    expect(screen.getByText(/Connected/)).toBeTruthy();
  });

  it("renders last command status segment with placeholder", () => {
    renderStatusBar();
    const placeholder = screen.getByLabelText("No recent commands");
    expect(placeholder).toBeTruthy();
    expect(placeholder.textContent).toContain("—");
  });

  it("renders active module segment with Welcome default", () => {
    renderStatusBar();
    expect(screen.getByText("Welcome")).toBeTruthy();
  });

  it("renders segment dividers between all four segments", () => {
    const { container } = renderStatusBar();
    // Segments are separated by CSS border — verify 4 segment elements exist
    const segments = container.querySelectorAll('[class*="segment"]');
    expect(segments.length).toBe(4);
  });
});

describe("AC #2 — Status bar styling", () => {
  it("has role='status' on the status bar container", () => {
    renderStatusBar();
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("has aria-label='Application status bar'", () => {
    renderStatusBar();
    expect(screen.getByLabelText("Application status bar")).toBeTruthy();
  });
});

describe("AC #3 — Tenant segment typography", () => {
  it("tenant segment uses promoted typography styling", () => {
    const { container } = renderStatusBar();
    const tenantSegment = container.querySelector('[class*="tenantSegment"]');
    expect(tenantSegment).toBeTruthy();
  });
});

describe("AC #8 — Tenant name truncation", () => {
  it("truncates tenant name at 20 characters with tooltip", () => {
    renderStatusBar({
      tenantContext: {
        activeTenant: "A Very Long Tenant Name That Exceeds Limit",
      },
    });
    const truncated = screen.getByText("A Very Long Tenant N...");
    expect(truncated).toBeTruthy();
    expect(truncated.getAttribute("title")).toBe(
      "A Very Long Tenant Name That Exceeds Limit",
    );
  });

  it("does not truncate names with 20 or fewer characters", () => {
    renderStatusBar({
      tenantContext: { activeTenant: "Short Tenant" },
    });
    expect(screen.getByText("Short Tenant")).toBeTruthy();
  });
});

// ─── 0.2 — Tests for AC #4: tenant dropdown and switching ───

describe("AC #4 — Tenant dropdown", () => {
  it("renders all available tenants as options", () => {
    renderStatusBar({
      tenantContext: {
        activeTenant: "tenant-a",
        availableTenants: ["tenant-a", "tenant-b", "tenant-c"],
      },
    });
    const select = screen.getByLabelText("Switch tenant");
    const options = select.querySelectorAll("option");
    expect(options.length).toBe(3);
    expect(options[0].textContent).toBe("tenant-a");
    expect(options[1].textContent).toBe("tenant-b");
    expect(options[2].textContent).toBe("tenant-c");
  });

  it("calls switchTenant when selecting a different tenant (clean form)", () => {
    const switchTenant = vi.fn();
    renderStatusBar({
      tenantContext: {
        activeTenant: "tenant-a",
        availableTenants: ["tenant-a", "tenant-b"],
        switchTenant,
      },
      formDirty: { isDirty: false },
    });
    const select = screen.getByLabelText("Switch tenant");
    fireEvent.change(select, { target: { value: "tenant-b" } });
    expect(switchTenant).toHaveBeenCalledWith("tenant-b");
  });

  it("disables select when only one tenant is available", () => {
    renderStatusBar({
      tenantContext: {
        activeTenant: "only-tenant",
        availableTenants: ["only-tenant"],
      },
    });
    const select = screen.getByLabelText("Switch tenant") as HTMLSelectElement;
    expect(select.disabled).toBe(true);
  });

  it("shows 'No tenant' with disabled select when no tenants available", () => {
    renderStatusBar({
      tenantContext: {
        activeTenant: null,
        availableTenants: [],
      },
    });
    // "No tenant" appears in both <span> label and <option> — use getAllByText
    const matches = screen.getAllByText(/No tenant/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const select = screen.getByLabelText("Switch tenant") as HTMLSelectElement;
    expect(select.disabled).toBe(true);
  });

  it("dropdown options show full tenant names (no truncation)", () => {
    const longName = "A Very Long Tenant Name That Exceeds Limit";
    renderStatusBar({
      tenantContext: {
        activeTenant: longName,
        availableTenants: [longName],
      },
    });
    const select = screen.getByLabelText("Switch tenant");
    const option = select.querySelector("option");
    expect(option?.textContent).toBe(longName);
  });
});

// ─── 0.3 — Tests for AC #5: dirty form confirmation ───

describe("AC #5 — Dirty form state triggers confirmation", () => {
  it("shows confirmation dialog when switching tenant with dirty form", () => {
    const switchTenant = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    renderStatusBar({
      tenantContext: {
        activeTenant: "tenant-a",
        availableTenants: ["tenant-a", "tenant-b"],
        switchTenant,
      },
      formDirty: { isDirty: true },
    });

    const select = screen.getByLabelText("Switch tenant");
    fireEvent.change(select, { target: { value: "tenant-b" } });

    expect(confirmSpy).toHaveBeenCalledWith(
      "Switching tenants will discard unsaved changes. Continue?",
    );
    expect(switchTenant).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("calls switchTenant and resets dirty on confirm", () => {
    const switchTenant = vi.fn();
    const setDirty = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderStatusBar({
      tenantContext: {
        activeTenant: "tenant-a",
        availableTenants: ["tenant-a", "tenant-b"],
        switchTenant,
      },
      formDirty: { isDirty: true, setDirty },
    });

    const select = screen.getByLabelText("Switch tenant");
    fireEvent.change(select, { target: { value: "tenant-b" } });

    expect(switchTenant).toHaveBeenCalledWith("tenant-b");
    expect(setDirty).toHaveBeenCalledWith(false);
    confirmSpy.mockRestore();
  });

  it("reverts select value when confirmation is cancelled", () => {
    const switchTenant = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    renderStatusBar({
      tenantContext: {
        activeTenant: "tenant-a",
        availableTenants: ["tenant-a", "tenant-b"],
        switchTenant,
      },
      formDirty: { isDirty: true },
    });

    const select = screen.getByLabelText("Switch tenant") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "tenant-b" } });

    // Select should revert to tenant-a
    expect(select.value).toBe("tenant-a");
    vi.restoreAllMocks();
  });
});

// ─── 0.4 — Tests for AC #6: connection health indicator states ───

describe("AC #6 — Connection health states", () => {
  it("shows green dot and 'Connected' text when connected", () => {
    const { container } = renderStatusBar({
      connectionHealth: { health: "connected" },
    });
    expect(screen.getByText("Connected")).toBeTruthy();
    const dot = container.querySelector('[class*="healthDotConnected"]');
    expect(dot).toBeTruthy();
  });

  it("shows amber dot with pulse and 'Reconnecting...' text when reconnecting", () => {
    const { container } = renderStatusBar({
      connectionHealth: { health: "reconnecting" },
    });
    expect(screen.getByText("Reconnecting...")).toBeTruthy();
    const dot = container.querySelector('[class*="healthDotReconnecting"]');
    expect(dot).toBeTruthy();
  });

  it("shows red dot and 'Disconnected' text when disconnected", () => {
    const { container } = renderStatusBar({
      connectionHealth: { health: "disconnected" },
    });
    expect(screen.getByText("Disconnected")).toBeTruthy();
    const dot = container.querySelector('[class*="healthDotDisconnected"]');
    expect(dot).toBeTruthy();
  });

  it("connection health segment has aria-live='polite'", () => {
    renderStatusBar();
    const healthSegment = screen.getByText("Connected").closest("[aria-live]");
    expect(healthSegment?.getAttribute("aria-live")).toBe("polite");
  });
});

// ─── 0.5 — Tests for AC #7: disconnection banner ───

describe("AC #7 — Disconnection banner", () => {
  it("does NOT appear before 10 seconds of disconnection", () => {
    vi.useFakeTimers();

    renderStatusBar({
      connectionHealth: { health: "disconnected" },
    });

    act(() => {
      vi.advanceTimersByTime(9_999);
    });

    expect(screen.queryByText(/Connection lost/)).toBeNull();
    vi.useRealTimers();
  });

  it("appears after 10 seconds of disconnected state", async () => {
    vi.useFakeTimers();

    renderStatusBar({
      connectionHealth: { health: "disconnected" },
    });

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByText(/Connection lost/)).toBeTruthy();
    vi.useRealTimers();
  });

  it("has aria-live='assertive'", async () => {
    vi.useFakeTimers();

    renderStatusBar({
      connectionHealth: { health: "disconnected" },
    });

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    const banner = screen
      .getByText(/Connection lost/)
      .closest("[aria-live]");
    expect(banner?.getAttribute("aria-live")).toBe("assertive");
    vi.useRealTimers();
  });

  it("has no close button (non-dismissable)", async () => {
    vi.useFakeTimers();

    renderStatusBar({
      connectionHealth: { health: "disconnected" },
    });

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    const banner = screen.getByText(/Connection lost/).closest("[aria-live]");
    expect(banner?.querySelector("button")).toBeNull();
    vi.useRealTimers();
  });

  it("disappears when connection restores", async () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <MockShellProvider
        connectionHealthContext={createMockConnectionHealthContext({
          health: "disconnected",
        })}
      >
        <StatusBar />
      </MockShellProvider>,
    );

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByText(/Connection lost/)).toBeTruthy();

    // Connection restores
    rerender(
      <MockShellProvider
        connectionHealthContext={createMockConnectionHealthContext({
          health: "connected",
        })}
      >
        <StatusBar />
      </MockShellProvider>,
    );

    // Banner should disappear (after fade transition or immediately)
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText(/Connection lost/)).toBeNull();
    vi.useRealTimers();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { loadRuntimeConfig } from "./loadRuntimeConfig";

import type { RuntimeConfig } from "./types";

const VALID_CONFIG: RuntimeConfig = {
  oidcAuthority: "https://keycloak.example.com/realms/hexalith",
  oidcClientId: "hexalith-frontshell",
  commandApiBaseUrl: "https://api.example.com",
  tenantClaimName: "eventstore:tenant",
};

describe("loadRuntimeConfig", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    // Clear any diagnostic page from previous test using safe DOM methods
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ─── Scenario 1: Valid config ──────────────────────────────────
  it("returns validated RuntimeConfig when /config.json has all required fields", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(VALID_CONFIG),
    });

    const result = await loadRuntimeConfig();

    expect(result).toEqual(VALID_CONFIG);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/config.json",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  // ─── Scenario 2: Missing file (404) ───────────────────────────
  it("renders diagnostic page with 'not found' message and ConfigMap hint when /config.json returns 404", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await loadRuntimeConfig();

    expect(result).toBeNull();
    expect(document.body.textContent).toContain("Configuration Error");
    expect(document.body.textContent).toContain("Configuration file not found at /config.json");
    expect(document.body.textContent).toContain("Mount your ConfigMap");
  });

  // ─── Scenario 3: Malformed JSON ───────────────────────────────
  it("renders diagnostic page and returns null when /config.json contains invalid JSON", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new SyntaxError("Unexpected token { in JSON")),
    });

    const result = await loadRuntimeConfig();

    expect(result).toBeNull();
    expect(document.body.textContent).toContain("Configuration Error");
    expect(document.body.textContent).toContain("invalid JSON");
  });

  // ─── Scenario 4: Missing required fields ──────────────────────
  it("renders diagnostic page listing missing fields when config lacks required fields", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ oidcAuthority: "https://example.com" }),
    });

    const result = await loadRuntimeConfig();

    expect(result).toBeNull();
    expect(document.body.textContent).toContain("Configuration Error");
    expect(document.body.textContent).toContain("oidcClientId");
    expect(document.body.textContent).toContain("commandApiBaseUrl");
    expect(document.body.textContent).toContain("tenantClaimName");
  });

  // ─── Scenario 5: Fetch timeout ────────────────────────────────
  it("renders diagnostic page and returns null when fetch times out after 5 seconds", async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    );

    const resultPromise = loadRuntimeConfig();

    // Advance past the 5-second timeout
    await vi.advanceTimersByTimeAsync(5100);

    const result = await resultPromise;

    expect(result).toBeNull();
    expect(document.body.textContent).toContain("Configuration Error");
    expect(document.body.textContent).toContain("took too long to load");
  });

  // ─── Additional: Optional fields ──────────────────────────────
  it("returns config with optional fields when provided", async () => {
    const configWithOptionals = {
      ...VALID_CONFIG,
      oidcScope: "openid profile email custom",
      oidcRedirectUri: "https://app.example.com/callback",
      oidcPostLogoutRedirectUri: "https://app.example.com/logout",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(configWithOptionals),
    });

    const result = await loadRuntimeConfig();

    expect(result).toEqual(configWithOptionals);
    expect(result?.oidcScope).toBe("openid profile email custom");
    expect(result?.oidcRedirectUri).toBe("https://app.example.com/callback");
    expect(result?.oidcPostLogoutRedirectUri).toBe("https://app.example.com/logout");
  });

  // ─── Additional: Unknown fields ignored ────────────────────────
  it("ignores unknown fields in config and returns valid RuntimeConfig", async () => {
    const configWithExtras = {
      ...VALID_CONFIG,
      customFeatureFlag: true,
      monitoringEndpoint: "https://monitoring.example.com",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(configWithExtras),
    });

    const result = await loadRuntimeConfig();

    expect(result).not.toBeNull();
    expect(result?.oidcAuthority).toBe(VALID_CONFIG.oidcAuthority);
    expect(result?.oidcClientId).toBe(VALID_CONFIG.oidcClientId);
  });

  // ─── Additional: URL normalization ─────────────────────────────
  it("strips trailing slashes from URL fields", async () => {
    const configWithTrailingSlashes = {
      ...VALID_CONFIG,
      oidcAuthority: "https://keycloak.example.com/realms/hexalith///",
      commandApiBaseUrl: "https://api.example.com/",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(configWithTrailingSlashes),
    });

    const result = await loadRuntimeConfig();

    expect(result?.oidcAuthority).toBe("https://keycloak.example.com/realms/hexalith");
    expect(result?.commandApiBaseUrl).toBe("https://api.example.com");
  });

  // ─── Additional: HTTP warning on non-localhost ─────────────────
  it("logs console.warn when oidcAuthority uses HTTP on non-localhost", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Simulate non-localhost hostname
    const originalHostname = window.location.hostname;
    Object.defineProperty(window, "location", {
      value: { ...window.location, hostname: "app.example.com", origin: "https://app.example.com" },
      writable: true,
    });

    const configWithHttp = {
      ...VALID_CONFIG,
      oidcAuthority: "http://keycloak.example.com/realms/hexalith",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(configWithHttp),
    });

    await loadRuntimeConfig();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("oidcAuthority"),
    );

    // Restore
    Object.defineProperty(window, "location", {
      value: { ...window.location, hostname: originalHostname, origin: `http://${originalHostname}` },
      writable: true,
    });
    warnSpy.mockRestore();
  });

  // ─── Additional: Network error ─────────────────────────────────
  it("renders diagnostic page when fetch throws a network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await loadRuntimeConfig();

    expect(result).toBeNull();
    expect(document.body.textContent).toContain("Configuration Error");
    expect(document.body.textContent).toContain("Configuration file not found");
  });

  // ─── Diagnostic page content verification ──────────────────────
  it("diagnostic page includes example config.json format and Kubernetes ConfigMap hint", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await loadRuntimeConfig();

    expect(document.body.textContent).toContain("oidcAuthority");
    expect(document.body.textContent).toContain("oidcClientId");
    expect(document.body.textContent).toContain("commandApiBaseUrl");
    expect(document.body.textContent).toContain("tenantClaimName");
    expect(document.body.textContent).toContain("Mount your ConfigMap to /usr/share/nginx/html/config.json");
  });
});

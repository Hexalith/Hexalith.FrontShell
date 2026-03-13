import type { RuntimeConfig } from "./types";

const CONFIG_URL = "/config.json";
const FETCH_TIMEOUT_MS = 5000;

const REQUIRED_FIELDS: { key: keyof RuntimeConfig; purpose: string; example: string }[] = [
  { key: "oidcAuthority", purpose: "the OIDC provider URL", example: "https://<your-oidc-provider>/realms/<realm>" },
  { key: "oidcClientId", purpose: "the OIDC client ID for this SPA", example: "<your-client-id>" },
  { key: "commandApiBaseUrl", purpose: "the backend API base URL", example: "https://<your-api-server>" },
  { key: "tenantClaimName", purpose: "the JWT claim name containing tenant list", example: "<your-tenant-claim>" },
];

const EXAMPLE_CONFIG = JSON.stringify(
  {
    oidcAuthority: "https://<your-oidc-provider>/realms/<realm>",
    oidcClientId: "<your-client-id>",
    commandApiBaseUrl: "https://<your-api-server>",
    tenantClaimName: "<your-tenant-claim>",
  },
  null,
  2,
);

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function renderDiagnosticPage(title: string, details: string[]): void {
  // Clear any existing content
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }

  const container = document.createElement("div");
  container.style.cssText =
    "max-width: 600px; margin: 40px auto; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white;";

  // Warning icon and heading
  const heading = document.createElement("h1");
  heading.style.cssText = "color: #c0392b; font-size: 24px; margin-bottom: 16px;";
  heading.textContent = "\u26A0 Configuration Error";
  container.appendChild(heading);

  // Error title
  const titleEl = document.createElement("p");
  titleEl.style.cssText = "font-size: 16px; margin-bottom: 16px; color: #333;";
  titleEl.textContent = title;
  container.appendChild(titleEl);

  // Details list
  if (details.length > 0) {
    const detailsHeading = document.createElement("p");
    detailsHeading.style.cssText = "font-weight: bold; margin-bottom: 8px; color: #333;";
    detailsHeading.textContent = "Details:";
    container.appendChild(detailsHeading);

    const list = document.createElement("ul");
    list.style.cssText = "margin-bottom: 16px; padding-left: 20px; color: #555;";
    for (const detail of details) {
      const item = document.createElement("li");
      item.style.cssText = "margin-bottom: 4px;";
      item.textContent = detail;
      list.appendChild(item);
    }
    container.appendChild(list);
  }

  // Example config block
  const exampleHeading = document.createElement("p");
  exampleHeading.style.cssText = "font-weight: bold; margin-bottom: 8px; color: #333;";
  exampleHeading.textContent = "Expected config.json format:";
  container.appendChild(exampleHeading);

  const codeBlock = document.createElement("pre");
  codeBlock.style.cssText =
    "background: #f8f9fa; padding: 16px; border: 1px solid #dee2e6; border-radius: 4px; font-family: monospace; font-size: 14px; overflow-x: auto;";
  codeBlock.textContent = EXAMPLE_CONFIG;
  container.appendChild(codeBlock);

  // Deployment hint
  const hint = document.createElement("p");
  hint.style.cssText = "margin-top: 16px; color: #666; font-size: 14px;";
  hint.textContent = "Kubernetes: Mount your ConfigMap to /usr/share/nginx/html/config.json";
  container.appendChild(hint);

  document.body.appendChild(container);
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(CONFIG_URL, { signal: controller.signal });
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === "AbortError") {
      renderDiagnosticPage(
        "Configuration file took too long to load. Check network connectivity.",
        [],
      );
      return null;
    }

    renderDiagnosticPage(
      "Configuration file not found at /config.json",
      [
        error instanceof Error ? error.message : "Network error occurred",
      ],
    );
    return null;
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    if (response.status === 404) {
      renderDiagnosticPage(
        "Configuration file not found at /config.json",
        [
          "Expected file location: /config.json",
          "Mount your ConfigMap to /usr/share/nginx/html/config.json",
        ],
      );
    } else {
      renderDiagnosticPage(
        `config.json returned HTTP ${response.status}`,
        [
          `The server returned HTTP ${response.status} when fetching /config.json`,
          "Ensure the file exists at the expected location",
        ],
      );
    }
    return null;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error: unknown) {
    renderDiagnosticPage(
      "config.json contains invalid JSON",
      [error instanceof SyntaxError ? error.message : "JSON parse error"],
    );
    return null;
  }

  if (typeof data !== "object" || data === null) {
    renderDiagnosticPage(
      "config.json must contain a JSON object",
      ["Expected an object with configuration fields"],
    );
    return null;
  }

  const record = data as Record<string, unknown>;

  // Validate required fields
  const missingFields: string[] = [];
  for (const { key, purpose, example } of REQUIRED_FIELDS) {
    const value = record[key];
    if (typeof value !== "string" || value.trim() === "") {
      missingFields.push(`${key} \u2014 ${purpose}, e.g., "${example}"`);
    }
  }

  if (missingFields.length > 0) {
    renderDiagnosticPage(
      "config.json is missing required fields",
      missingFields,
    );
    return null;
  }

  // Normalize URL fields
  const oidcAuthority = normalizeUrl(record.oidcAuthority as string);
  const commandApiBaseUrl = normalizeUrl(record.commandApiBaseUrl as string);

  // Warn on HTTP for non-localhost
  const hostname = window.location.hostname;
  if (
    oidcAuthority.startsWith("http://") &&
    hostname !== "localhost" &&
    hostname !== "127.0.0.1"
  ) {
    console.warn(
      `oidcAuthority uses HTTP (${oidcAuthority}) on a non-localhost environment. Consider using HTTPS for security.`,
    );
  }

  const config: RuntimeConfig = {
    oidcAuthority,
    oidcClientId: record.oidcClientId as string,
    commandApiBaseUrl,
    tenantClaimName: record.tenantClaimName as string,
  };

  // Copy optional fields if present
  if (typeof record.oidcScope === "string") {
    config.oidcScope = record.oidcScope;
  }
  if (typeof record.oidcRedirectUri === "string") {
    config.oidcRedirectUri = record.oidcRedirectUri;
  }
  if (typeof record.oidcPostLogoutRedirectUri === "string") {
    config.oidcPostLogoutRedirectUri = record.oidcPostLogoutRedirectUri;
  }

  return config;
}

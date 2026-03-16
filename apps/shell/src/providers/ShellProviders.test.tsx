import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";

import {
  useAuth,
  useTenant,
  useConnectionHealth,
  useFormDirty,
  useTheme,
  useLocale,
} from "@hexalith/shell-api";

import { ShellProviders } from "./ShellProviders";

afterEach(cleanup);

const TEST_OIDC_CONFIG = {
  authority: "https://localhost:8443/realms/hexalith",
  client_id: "test-client",
  redirect_uri: "http://localhost:3000",
  scope: "openid profile email",
};

const TEST_BACKEND_URL = "https://localhost:5000";

// Helper to capture context values from within the provider tree
function ContextProbe({
  onContexts,
}: {
  onContexts: (contexts: {
    auth: boolean;
    tenant: boolean;
    connectionHealth: boolean;
    formDirty: boolean;
    theme: boolean;
    locale: boolean;
  }) => void;
}) {
  let auth = false;
  let tenant = false;
  let connectionHealth = false;
  let formDirty = false;
  let theme = false;
  let locale = false;

  try {
    useAuth();
    auth = true;
  } catch {
    /* not available */
  }
  try {
    useTenant();
    tenant = true;
  } catch {
    /* not available */
  }
  try {
    useConnectionHealth();
    connectionHealth = true;
  } catch {
    /* not available */
  }
  try {
    useFormDirty();
    formDirty = true;
  } catch {
    /* not available */
  }
  try {
    useTheme();
    theme = true;
  } catch {
    /* not available */
  }
  try {
    useLocale();
    locale = true;
  } catch {
    /* not available */
  }

  onContexts({ auth, tenant, connectionHealth, formDirty, theme, locale });
  return <div>probe</div>;
}

describe("ShellProviders", () => {
  // Provider hierarchy: Auth → Tenant → ConnectionHealth → FormDirty → Theme → Locale
  it("renders children inside all providers", () => {
    let contexts = {
      auth: false,
      tenant: false,
      connectionHealth: false,
      formDirty: false,
      theme: false,
      locale: false,
    };

    render(
      <ShellProviders oidcConfig={TEST_OIDC_CONFIG} backendUrl={TEST_BACKEND_URL}>
        <ContextProbe onContexts={(c) => (contexts = c)} />
      </ShellProviders>,
    );

    expect(contexts.auth).toBe(true);
    expect(contexts.tenant).toBe(true);
    expect(contexts.connectionHealth).toBe(true);
    expect(contexts.formDirty).toBe(true);
    expect(contexts.theme).toBe(true);
    expect(contexts.locale).toBe(true);
  });

  it("renders children content", () => {
    const { getByText } = render(
      <ShellProviders oidcConfig={TEST_OIDC_CONFIG} backendUrl={TEST_BACKEND_URL}>
        <div>Child Content</div>
      </ShellProviders>,
    );

    expect(getByText("Child Content")).toBeTruthy();
  });
});

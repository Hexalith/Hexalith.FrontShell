import React, { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  CqrsProvider,
  MockCommandBus,
  MockQueryBus,
  MockSignalRHub,
} from "@hexalith/cqrs-client";
import { MockShellProvider } from "@hexalith/shell-api";
import { ToastProvider } from "@hexalith/ui";

// Props type inlined to avoid circular import (the Vite alias swaps
// ./ShellProviders to this file, so importing from it would be self-referential)
interface ShellProvidersProps {
  oidcConfig?: unknown;
  backendUrl?: string;
  tenantClaimName?: string;
  signalRHub?: unknown;
  children: ReactNode;
}

// Inline E2E mock tenant data — DO NOT import from modules/hexalith-tenants
// to avoid hard shell→module dependency
const E2E_ALPHA_TENANTS = [
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567801",
    name: "Acme Corporation",
    code: "acme-corp",
    status: "Active",
    createdAt: "2025-06-15T08:30:00+00:00",
    updatedAt: "2026-02-10T14:22:00+00:00",
  },
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567802",
    name: "TechVentures Inc.",
    code: "techventures",
    status: "Active",
    createdAt: "2025-07-01T09:00:00+00:00",
    updatedAt: "2026-03-01T11:45:00+00:00",
  },
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567803",
    name: "Northern Logistics Group",
    code: "northern-logistics",
    status: "Inactive",
    createdAt: "2025-09-05T10:00:00+00:00",
    updatedAt: "2026-02-20T16:10:00+00:00",
  },
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567804",
    name: "Horizon Healthcare Partners",
    code: "horizon-health",
    status: "Disabled",
    createdAt: "2025-05-10T11:20:00+00:00",
    updatedAt: "2025-12-18T15:30:00+00:00",
  },
  {
    id: "b1c2d3e4-f5a6-7890-abcd-ef1234567805",
    name: "Summit Engineering Co.",
    code: "summit-eng",
    status: "Active",
    createdAt: "2025-11-08T14:00:00+00:00",
    updatedAt: "2026-02-15T10:20:00+00:00",
  },
];

const E2E_BETA_TENANTS = [
  {
    id: "c2d3e4f5-a6b7-8901-bcde-f12345678011",
    name: "BlueSky Retail Group",
    code: "bluesky-retail",
    status: "Active",
    createdAt: "2025-08-18T12:15:00+00:00",
    updatedAt: "2026-03-10T09:05:00+00:00",
  },
  {
    id: "c2d3e4f5-a6b7-8901-bcde-f12345678012",
    name: "Cedar Health Partners",
    code: "cedar-health",
    status: "Inactive",
    createdAt: "2025-10-03T07:45:00+00:00",
    updatedAt: "2026-01-22T13:40:00+00:00",
  },
  {
    id: "c2d3e4f5-a6b7-8901-bcde-f12345678013",
    name: "Lighthouse Education Trust",
    code: "lighthouse-edu",
    status: "Active",
    createdAt: "2025-12-12T10:30:00+00:00",
    updatedAt: "2026-03-05T17:20:00+00:00",
  },
];

const E2E_TENANT_DATA = {
  "tenant-alpha": E2E_ALPHA_TENANTS,
  "tenant-beta": E2E_BETA_TENANTS,
} as const;

const AVAILABLE_TENANTS = Object.keys(E2E_TENANT_DATA);

function buildTenantDetails(
  tenants: readonly {
    id: string;
    name: string;
    code: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }[],
) {
  return tenants.map((tenant) => ({
    ...tenant,
    description: `Enterprise tenant for ${tenant.name}. Onboarded during the platform expansion initiative.`,
    contactEmail: `admin@${tenant.code.replace(/-/g, "")}.com`,
    createdBy: "system@hexalith.io",
    notes: `Working notes for ${tenant.name}. Last reviewed during the quarterly tenant audit.`,
  }));
}

function createE2eQueryBus(): MockQueryBus {
  const queryBus = new MockQueryBus({ delay: 50 });

  for (const [tenantId, tenants] of Object.entries(E2E_TENANT_DATA)) {
    queryBus.setResponse(`${tenantId}:Tenants:GetTenantList::`, tenants);

    for (const detail of buildTenantDetails(tenants)) {
      queryBus.setResponse(
        `${tenantId}:Tenants:GetTenantDetail:${detail.id}:`,
        detail,
      );
    }
  }

  return queryBus;
}

const mockSignalRHub = new MockSignalRHub();
const queryBus = createE2eQueryBus();
const commandBus = new MockCommandBus({ delay: 100, defaultBehavior: "success" });

function getPreferredTheme(): "light" | "dark" {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

function E2eMockShellProvider({ children }: { children: ReactNode }) {
  const [activeTenant, setActiveTenant] = useState<string>(AVAILABLE_TENANTS[0] ?? "");
  const [theme, setTheme] = useState<"light" | "dark">(() => getPreferredTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = (matches: boolean) => {
      setTheme(matches ? "dark" : "light");
    };

    syncTheme(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncTheme(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const tenantContext = useMemo(
    () => ({
      activeTenant,
      availableTenants: AVAILABLE_TENANTS,
      switchTenant: (tenantId: string) => {
        if (AVAILABLE_TENANTS.includes(tenantId)) {
          setActiveTenant(tenantId);
        }
      },
    }),
    [activeTenant],
  );

  return (
    <MockShellProvider tenantContext={tenantContext} theme={theme}>
      {children}
    </MockShellProvider>
  );
}

/**
 * E2E-mode ShellProviders — replaces real OIDC with mock providers.
 * Swapped in via resolve.alias in vite.config.e2e.ts.
 */
export function ShellProviders({
  children,
}: ShellProvidersProps): React.JSX.Element {
  return (
    <E2eMockShellProvider>
      <CqrsProvider
        commandApiBaseUrl="http://localhost:mock"
        tokenGetter={async () => "e2e-token"}
        signalRHub={mockSignalRHub}
        queryBus={queryBus}
        commandBus={commandBus}
      >
        <ToastProvider>{children}</ToastProvider>
      </CqrsProvider>
    </E2eMockShellProvider>
  );
}

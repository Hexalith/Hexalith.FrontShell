import React from "react";
import type { ReactNode } from "react";

import {
  AuthProvider,
  ConnectionHealthProvider,
  FormDirtyProvider,
  TenantProvider,
  ThemeProvider,
  LocaleProvider,
} from "@hexalith/shell-api";

export interface ShellProvidersProps {
  oidcConfig: {
    authority: string;
    client_id: string;
    redirect_uri: string;
    scope: string;
    post_logout_redirect_uri?: string;
  };
  backendUrl: string;
  tenantClaimName?: string;
  children: ReactNode;
}

export function ShellProviders({
  oidcConfig,
  backendUrl,
  tenantClaimName,
  children,
}: ShellProvidersProps): React.JSX.Element {
  return (
    <AuthProvider {...oidcConfig} tenantClaimName={tenantClaimName}>
      <TenantProvider>
        <ConnectionHealthProvider backendUrl={backendUrl}>
          <FormDirtyProvider>
            <ThemeProvider>
              <LocaleProvider>{children}</LocaleProvider>
            </ThemeProvider>
          </FormDirtyProvider>
        </ConnectionHealthProvider>
      </TenantProvider>
    </AuthProvider>
  );
}

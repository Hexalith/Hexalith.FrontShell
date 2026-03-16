import React, { useCallback } from "react";
import type { ReactNode } from "react";
import { useAuth } from "react-oidc-context";

import { CqrsProvider } from "@hexalith/cqrs-client";
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

function InnerProviders({
  backendUrl,
  children,
}: {
  backendUrl: string;
  children: ReactNode;
}) {
  const auth = useAuth();
  const tokenGetter = useCallback(
    () => Promise.resolve(auth.user?.access_token ?? null),
    [auth.user?.access_token],
  );

  return (
    <CqrsProvider commandApiBaseUrl={backendUrl} tokenGetter={tokenGetter}>
      <ConnectionHealthProvider backendUrl={backendUrl}>
        <FormDirtyProvider>
          <ThemeProvider>
            <LocaleProvider>{children}</LocaleProvider>
          </ThemeProvider>
        </FormDirtyProvider>
      </ConnectionHealthProvider>
    </CqrsProvider>
  );
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
        <InnerProviders backendUrl={backendUrl}>{children}</InnerProviders>
      </TenantProvider>
    </AuthProvider>
  );
}

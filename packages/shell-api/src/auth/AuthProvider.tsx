import React, { createContext, useEffect } from "react";
import type { ReactNode } from "react";
import {
  AuthProvider as OidcAuthProvider,
  useAuth as useOidcAuth,
} from "react-oidc-context";

import type { AuthContextValue, AuthUser } from "../types";
import type { UserManagerSettings } from "oidc-client-ts";


export const AuthContext = createContext<AuthContextValue | null>(null);

const MISSING_SUB_CLAIM_MESSAGE =
  "OIDC token missing required 'sub' claim — backend will reject all requests. Check OIDC provider configuration.";

function normalizeTenantClaims(raw: unknown): string[] {
  if (raw == null) return [];
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw)) {
    return raw.filter((claim): claim is string => typeof claim === "string");
  }
  return [];
}

function mapUser(
  profile: Record<string, unknown>,
  tenantClaimName: string = "eventstore:tenant",
): AuthUser | null {
  const sub = profile.sub;
  if (typeof sub !== "string" || !sub) {
    return null;
  }

  return {
    sub,
    tenantClaims: normalizeTenantClaims(profile[tenantClaimName]),
    name: typeof profile.name === "string" ? profile.name : undefined,
    email: typeof profile.email === "string" ? profile.email : undefined,
  };
}

function AuthContextBridge({
  children,
  tenantClaimName,
}: {
  children: ReactNode;
  tenantClaimName?: string;
}) {
  const oidc = useOidcAuth();

  const mappedUser = oidc.user?.profile
    ? mapUser(oidc.user.profile as Record<string, unknown>, tenantClaimName)
    : null;

  const hasMissingSub =
    oidc.user?.profile != null &&
    (typeof oidc.user.profile.sub !== "string" || !oidc.user.profile.sub);

  useEffect(() => {
    if (hasMissingSub) {
      console.error(MISSING_SUB_CLAIM_MESSAGE);
    }
  }, [hasMissingSub]);

  useEffect(() => {
    if (
      oidc.isLoading ||
      oidc.isAuthenticated ||
      hasMissingSub ||
      oidc.error ||
      oidc.activeNavigator
    ) {
      return;
    }

    void oidc.signinRedirect();
  }, [
    hasMissingSub,
    oidc.activeNavigator,
    oidc.error,
    oidc.isAuthenticated,
    oidc.isLoading,
    oidc.signinRedirect,
  ]);

  const error = hasMissingSub
    ? new Error(
        MISSING_SUB_CLAIM_MESSAGE,
      )
    : oidc.error
      ? new Error(oidc.error.message)
      : null;

  const value: AuthContextValue = {
    user: mappedUser,
    isAuthenticated: mappedUser != null,
    isLoading: oidc.isLoading,
    error,
    signinRedirect: () => oidc.signinRedirect(),
    signoutRedirect: () => oidc.signoutRedirect(),
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export interface AuthProviderProps extends UserManagerSettings {
  children: ReactNode;
  tenantClaimName?: string;
}

export function AuthProvider({
  children,
  tenantClaimName,
  ...oidcSettings
}: AuthProviderProps): React.JSX.Element {
  return (
    <OidcAuthProvider
      {...oidcSettings}
      accessTokenExpiringNotificationTimeInSeconds={
        oidcSettings.accessTokenExpiringNotificationTimeInSeconds ?? 60
      }
      automaticSilentRenew={oidcSettings.automaticSilentRenew ?? true}
      validateSubOnSilentRenew={
        oidcSettings.validateSubOnSilentRenew ?? true
      }
      onSigninCallback={() => {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }}
    >
      <AuthContextBridge tenantClaimName={tenantClaimName}>
        {children}
      </AuthContextBridge>
    </OidcAuthProvider>
  );
}

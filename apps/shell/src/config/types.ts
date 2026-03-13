export interface RuntimeConfig {
  /** OIDC provider URL, e.g. "https://keycloak.example.com/realms/hexalith" */
  oidcAuthority: string;
  /** OIDC client ID for this SPA, e.g. "hexalith-frontshell" */
  oidcClientId: string;
  /** Backend API base URL, e.g. "https://api.example.com" */
  commandApiBaseUrl: string;
  /** JWT claim name containing tenant list, e.g. "eventstore:tenant" */
  tenantClaimName: string;
  /** OIDC scopes (default: "openid profile email") */
  oidcScope?: string;
  /** OIDC redirect URI after login (default: window.location.origin) */
  oidcRedirectUri?: string;
  /** OIDC redirect URI after logout (default: window.location.origin) */
  oidcPostLogoutRedirectUri?: string;
}

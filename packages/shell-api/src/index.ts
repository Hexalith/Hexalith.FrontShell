// Auth (Story 1.3)
export { AuthProvider } from "./auth/AuthProvider";
export type { AuthProviderProps } from "./auth/AuthProvider";
export { useAuth } from "./auth/useAuth";

// Tenant
export { TenantProvider } from "./tenant/TenantProvider";
export type { TenantProviderProps } from "./tenant/TenantProvider";
export { useTenant } from "./tenant/useTenant";

// Theme
export { ThemeProvider } from "./theme/ThemeProvider";
export type { ThemeProviderProps } from "./theme/ThemeProvider";
export { useTheme } from "./theme/useTheme";

// Connection Health (Story 1.6)
export {
  ConnectionHealthProvider,
  useConnectionHealth,
} from "./connection/ConnectionHealthContext";

// Form Dirty (Story 1.6)
export { FormDirtyProvider, useFormDirty } from "./form/FormDirtyContext";

// Locale
export { LocaleProvider } from "./locale/LocaleProvider";
export type { LocaleProviderProps } from "./locale/LocaleProvider";
export { useLocale } from "./locale/useLocale";

// Manifest types
export type {
  ModuleManifest,
  ModuleManifestV1,
  ModuleRoute,
  ModuleNavigation,
} from "./manifest/manifestTypes";

// Types
export type {
  AuthContextValue,
  AuthUser,
  ConnectionHealth,
  ConnectionHealthContextValue,
  FormDirtyContextValue,
  TenantContextValue,
  ThemeContextValue,
  LocaleContextValue,
  Theme,
} from "./types";

// Testing utilities
export { MockShellProvider } from "./testing/MockShellProvider";
export type { MockShellProviderProps } from "./testing/MockShellProvider";
export { createMockAuthContext } from "./testing/createMockAuthContext";
export { createMockTenantContext } from "./testing/createMockTenantContext";
export { createMockConnectionHealthContext } from "./testing/createMockConnectionHealthContext";
export { createMockFormDirtyContext } from "./testing/createMockFormDirtyContext";

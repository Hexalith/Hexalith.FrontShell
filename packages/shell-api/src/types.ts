/** Mapped user profile — token-free, safe for public API */
export interface AuthUser {
  sub: string;
  tenantClaims: string[];
  name?: string;
  email?: string;
}

/** Public auth context — returned by useAuth() */
export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  signoutRedirect: () => Promise<void>;
  signinRedirect: () => Promise<void>;
}

export type Theme = "light" | "dark";

export interface TenantContextValue {
  activeTenant: string | null;
  availableTenants: string[];
  switchTenant: (tenantId: string) => void;
}

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

// Connection Health (Story 1.6)
export type ConnectionHealth = "connected" | "reconnecting" | "disconnected";

export interface ConnectionHealthContextValue {
  health: ConnectionHealth;
  lastChecked: Date | null;
  checkNow: () => void;
}

// Form Dirty (Story 1.6)
export interface FormDirtyContextValue {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  dirtyFormId: string | null;
  setDirtyFormId: (id: string | null) => void;
}

export interface LocaleContextValue {
  locale: string;
  defaultCurrency: string;
  formatDate: (
    date: string | Date,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (
    value: number,
    currency: string,
    options?: Intl.NumberFormatOptions,
  ) => string;
}

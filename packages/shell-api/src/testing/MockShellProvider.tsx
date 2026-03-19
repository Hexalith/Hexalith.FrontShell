import React from "react";
import type { ReactNode } from "react";

import { createMockAuthContext } from "./createMockAuthContext";
import { createMockConnectionHealthContext } from "./createMockConnectionHealthContext";
import { createMockFormDirtyContext } from "./createMockFormDirtyContext";
import { createMockTenantContext } from "./createMockTenantContext";
import { AuthContext } from "../auth/AuthProvider";
import { ConnectionHealthContext } from "../connection/ConnectionHealthContext";
import { FormDirtyContext } from "../form/FormDirtyContext";
import { LocaleContext } from "../locale/LocaleProvider";
import { TenantContext } from "../tenant/TenantProvider";
import { ThemeContext } from "../theme/ThemeProvider";

import type {
  AuthContextValue,
  ConnectionHealthContextValue,
  FormDirtyContextValue,
  TenantContextValue,
  Theme,
  ThemeContextValue,
  LocaleContextValue,
} from "../types";

export interface MockShellProviderProps {
  authContext?: AuthContextValue;
  tenantContext?: TenantContextValue;
  connectionHealthContext?: ConnectionHealthContextValue;
  formDirtyContext?: FormDirtyContextValue;
  theme?: Theme;
  locale?: string;
  defaultCurrency?: string;
  children: ReactNode;
}

export function MockShellProvider({
  authContext,
  tenantContext,
  connectionHealthContext,
  formDirtyContext,
  theme: themeProp,
  locale: localeProp,
  defaultCurrency: currencyProp,
  children,
}: MockShellProviderProps): React.JSX.Element {
  const authValue = authContext ?? createMockAuthContext();
  const tenantValue = tenantContext ?? createMockTenantContext();
  const connectionHealthValue =
    connectionHealthContext ?? createMockConnectionHealthContext();
  const formDirtyValue = formDirtyContext ?? createMockFormDirtyContext();

  const resolvedTheme: Theme = themeProp ?? "light";
  const themeValue: ThemeContextValue = {
    theme: resolvedTheme,
    toggleTheme: () => {},
  };

  const resolvedLocale = localeProp ?? "en-US";
  const resolvedCurrency = currencyProp ?? "USD";
  const localeValue: LocaleContextValue = {
    locale: resolvedLocale,
    defaultCurrency: resolvedCurrency,
    formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat(resolvedLocale, options).format(dateObj);
    },
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(resolvedLocale, options).format(value),
    formatCurrency: (
      value: number,
      currency: string,
      options?: Intl.NumberFormatOptions,
    ) =>
      new Intl.NumberFormat(resolvedLocale, {
        style: "currency",
        currency,
        ...options,
      }).format(value),
  };

  // Replicate real provider nesting order: Auth → Tenant → ConnectionHealth → FormDirty → Theme → Locale
  return (
    <AuthContext.Provider value={authValue}>
      <TenantContext.Provider value={tenantValue}>
        <ConnectionHealthContext.Provider value={connectionHealthValue}>
          <FormDirtyContext.Provider value={formDirtyValue}>
            <ThemeContext.Provider value={themeValue}>
              <LocaleContext.Provider value={localeValue}>
                {children}
              </LocaleContext.Provider>
            </ThemeContext.Provider>
          </FormDirtyContext.Provider>
        </ConnectionHealthContext.Provider>
      </TenantContext.Provider>
    </AuthContext.Provider>
  );
}

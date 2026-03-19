import React, { createContext, useMemo, useCallback } from "react";
import type { ReactNode } from "react";

import type { LocaleContextValue } from "../types";

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export interface LocaleProviderProps {
  locale?: string;
  defaultCurrency?: string;
  children: ReactNode;
}

export function LocaleProvider({
  locale: localeProp,
  defaultCurrency = "USD",
  children,
}: LocaleProviderProps): React.JSX.Element {
  const locale = localeProp ?? navigator.language;

  const formatDate = useCallback(
    (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, options).format(dateObj);
    },
    [locale],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      return new Intl.NumberFormat(locale, options).format(value);
    },
    [locale],
  );

  const formatCurrency = useCallback(
    (
      value: number,
      currency: string,
      options?: Intl.NumberFormatOptions,
    ): string => {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        ...options,
      }).format(value);
    },
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, defaultCurrency, formatDate, formatNumber, formatCurrency }),
    [locale, defaultCurrency, formatDate, formatNumber, formatCurrency],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

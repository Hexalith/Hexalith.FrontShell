import React, {
  createContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { ReactNode } from "react";

import { useAuth } from "../auth/useAuth";

import type { TenantContextValue } from "../types";

export const TenantContext = createContext<TenantContextValue | null>(null);

export interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({
  children,
}: TenantProviderProps): React.JSX.Element {
  const { user } = useAuth();

  const availableTenants = useMemo(
    () => user?.tenantClaims ?? [],
    [user?.tenantClaims],
  );

  const [activeTenant, setActiveTenant] = useState<string | null>(
    availableTenants[0] ?? null,
  );
  const previousTenantsSerializedRef = useRef(JSON.stringify(availableTenants));

  // Eviction: when availableTenants changes, keep activeTenant if still in list;
  // else reset to [0] ?? null. Compare by JSON.stringify — not by reference.
  useEffect(() => {
    const currentTenantsSerialized = JSON.stringify(availableTenants);
    if (previousTenantsSerializedRef.current === currentTenantsSerialized) {
      return;
    }

    previousTenantsSerializedRef.current = currentTenantsSerialized;

    setActiveTenant((prev) => {
      if (prev !== null && availableTenants.includes(prev)) {
        return prev;
      }
      return availableTenants[0] ?? null;
    });
  }, [availableTenants]);

  const switchTenant = useCallback(
    (tenantId: string) => {
      if (availableTenants.length === 0 || !availableTenants.includes(tenantId)) {
        console.warn(
          `switchTenant: "${tenantId}" is not in availableTenants [${availableTenants.join(", ")}]`,
        );
        return;
      }
      setActiveTenant(tenantId);
    },
    [availableTenants],
  );

  const value = useMemo<TenantContextValue>(
    () => ({ activeTenant, availableTenants, switchTenant }),
    [activeTenant, availableTenants, switchTenant],
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

import React, { useEffect, useState } from "react";

import {
  useConnectionHealth,
  useFormDirty,
  useTenant,
} from "@hexalith/shell-api";
import type { ConnectionHealth } from "@hexalith/shell-api";

import { useActiveModule } from "../hooks/useActiveModule";
import { DisconnectionBanner } from "./DisconnectionBanner";
import styles from "./StatusBar.module.css";

const TRUNCATION_LIMIT = 20;

function truncateName(name: string): string {
  return name.length > TRUNCATION_LIMIT
    ? name.slice(0, TRUNCATION_LIMIT) + "..."
    : name;
}

const HEALTH_DOT_CLASS: Record<ConnectionHealth, string> = {
  connected: styles.healthDotConnected,
  reconnecting: styles.healthDotReconnecting,
  disconnected: styles.healthDotDisconnected,
};

const HEALTH_LABEL: Record<ConnectionHealth, string> = {
  connected: "Connected",
  reconnecting: "Reconnecting...",
  disconnected: "Disconnected",
};

export function StatusBar(): React.JSX.Element {
  const { activeTenant, availableTenants, switchTenant } = useTenant();
  const { health } = useConnectionHealth();
  const { isDirty, setDirty } = useFormDirty();
  const { activeModuleName } = useActiveModule();

  // Controlled component pattern for select — prevents visual flash on cancel
  const [displayedTenant, setDisplayedTenant] = useState(activeTenant ?? "");

  useEffect(() => {
    setDisplayedTenant(activeTenant ?? "");
  }, [activeTenant]);

  const hasNoTenants = availableTenants.length === 0;
  const hasSingleTenant = availableTenants.length === 1;

  function handleTenantChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const newTenant = e.target.value;

    if (isDirty) {
      const confirmed = window.confirm(
        "Switching tenants will discard unsaved changes. Continue?",
      );
      if (!confirmed) {
        // Revert displayed value
        setDisplayedTenant(activeTenant ?? "");
        return;
      }
      setDirty(false);
    }

    setDisplayedTenant(newTenant);
    switchTenant(newTenant);
  }

  const tenantDisplay = activeTenant
    ? truncateName(activeTenant)
    : "No tenant";

  return (
    <div className={styles.statusbarArea}>
      <DisconnectionBanner />
      <div
        className={styles.statusBar}
        role="status"
        aria-label="Application status bar"
      >
        {/* Segment 1 — Tenant */}
        <div className={`${styles.segment} ${styles.tenantSegment}`}>
          <span
            title={
              activeTenant && activeTenant.length > TRUNCATION_LIMIT
                ? activeTenant
                : undefined
            }
          >
            {tenantDisplay}
          </span>
          <select
            className={styles.tenantSelect}
            aria-label="Switch tenant"
            value={displayedTenant}
            onChange={handleTenantChange}
            disabled={hasNoTenants || hasSingleTenant}
          >
            {hasNoTenants ? (
              <option value="">No tenant</option>
            ) : (
              availableTenants.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Segment 2 — Connection Health */}
        <div
          className={`${styles.segment} ${styles.defaultSegment}`}
          aria-live="polite"
        >
          <span
            className={`${styles.healthDot} ${HEALTH_DOT_CLASS[health]}`}
          />
          <span>{HEALTH_LABEL[health]}</span>
        </div>

        {/* Segment 3 — Last Command (placeholder) */}
        <div className={`${styles.segment} ${styles.defaultSegment}`}>
          <span aria-label="No recent commands">&mdash;</span>
        </div>

        {/* Segment 4 — Active Module */}
        <div className={`${styles.segment} ${styles.defaultSegment}`}>
          <span>{activeModuleName}</span>
        </div>
      </div>
    </div>
  );
}

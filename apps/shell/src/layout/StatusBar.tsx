import React from "react";

import {
  useConnectionHealth,
  useFormDirty,
  useTenant,
  type ConnectionHealth,
} from "@hexalith/shell-api";
import { Select, type SelectOption } from "@hexalith/ui";

import { DisconnectionBanner } from "./DisconnectionBanner";
import styles from "./StatusBar.module.css";
import { useActiveModule } from "../hooks/useActiveModule";

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

  const hasNoTenants = availableTenants.length === 0;
  const hasSingleTenant = availableTenants.length === 1;

  const tenantOptions: SelectOption[] = hasNoTenants
    ? [{ value: "", label: "No tenant" }]
    : availableTenants.map((t) => ({ value: t, label: t }));

  function handleTenantChange(newTenant: string): void {
    if (isDirty) {
      const confirmed = window.confirm(
        "Switching tenants will discard unsaved changes. Continue?",
      );
      if (!confirmed) return;
      setDirty(false);
    }
    switchTenant(newTenant);
  }

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
          <Select
            label="Switch tenant"
            hideLabel
            variant="inline"
            options={tenantOptions}
            value={activeTenant ?? ""}
            onChange={handleTenantChange}
            disabled={hasNoTenants || hasSingleTenant}
            className={styles.tenantSelect}
          />
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

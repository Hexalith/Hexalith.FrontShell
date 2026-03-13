import React, { useEffect, useState } from "react";

import { useConnectionHealth } from "@hexalith/shell-api";

import styles from "./DisconnectionBanner.module.css";

const BANNER_DELAY_MS = 10_000;
const BANNER_MESSAGE =
  "Connection lost. Cannot reach the backend service. Changes may not be saved. Reconnecting...";

export function DisconnectionBanner(): React.JSX.Element | null {
  const { health } = useConnectionHealth();
  const [showBanner, setShowBanner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (health === "disconnected") {
      const timer = setTimeout(() => {
        setShowBanner(true);
        // Trigger fade-in on next frame
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      }, BANNER_DELAY_MS);

      return () => clearTimeout(timer);
    }

    // Connection restored — fade out then hide
    if (showBanner) {
      setIsVisible(false);
      const hideTimer = setTimeout(() => {
        setShowBanner(false);
      }, 200);
      return () => clearTimeout(hideTimer);
    }

    return undefined;
  }, [health, showBanner]);

  if (!showBanner) return null;

  return (
    <div
      className={`${styles.banner} ${!isVisible ? styles.bannerHidden : ""}`}
      aria-live="assertive"
      role="alert"
    >
      {BANNER_MESSAGE}
    </div>
  );
}

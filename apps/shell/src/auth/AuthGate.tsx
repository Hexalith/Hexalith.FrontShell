import React from "react";
import type { ReactNode } from "react";

import { useAuth } from "@hexalith/shell-api";

import styles from "./AuthGate.module.css";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps): React.JSX.Element {
  const { isLoading, isAuthenticated, error } = useAuth();

  // OIDC callback detection: URL contains code and state params
  // Show "Processing login..." instead of "Redirecting..." during callback
  const searchParams = new URLSearchParams(window.location.search);
  const isOidcCallback =
    searchParams.has("code") && searchParams.has("state");

  if (isLoading) {
    return (
      <div className={styles.screen}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.screen} ${styles.stack}`}>
        <p>{error.message || "An authentication error occurred"}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={styles.button}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isAuthenticated && isOidcCallback) {
    return (
      <div className={styles.screen}>
        Processing login...
      </div>
    );
  }

  if (!isAuthenticated) {
    // Visual indicator only — do NOT call signinRedirect() here.
    // AuthProvider's AuthContextBridge already triggers it automatically.
    return (
      <div className={styles.screen}>
        Redirecting to login...
      </div>
    );
  }

  return <>{children}</>;
}

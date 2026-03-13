import React from "react";

import { useAuth, useTheme } from "@hexalith/shell-api";

import styles from "./TopBar.module.css";

export function TopBar(): React.JSX.Element {
  const { user, signoutRedirect } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const displayName = user?.name ?? user?.email ?? "User";

  return (
    <div className={styles.topbar}>
      <span className={styles.title}>Hexalith</span>
      <div className={styles.actions}>
        <span className={styles.userName}>{displayName}</span>
        <button
          type="button"
          className={styles.button}
          onClick={toggleTheme}
        >
          {theme === "light" ? "Switch to Dark" : "Switch to Light"}
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => void signoutRedirect()}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

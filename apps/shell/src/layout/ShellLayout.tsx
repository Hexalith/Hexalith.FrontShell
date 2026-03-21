import React, { useState, useEffect } from "react";
import { Outlet } from "react-router";

import styles from "./ShellLayout.module.css";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { TopBar } from "./TopBar";

function getInitialCollapsed(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(max-width: 1279px)").matches;
}

export function ShellLayout(): React.JSX.Element {
  const [isCollapsed, setCollapsed] = useState(getInitialCollapsed);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 1279px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setCollapsed(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  return (
    <div
      className={styles.layout}
      data-collapsed={isCollapsed || undefined}
    >
      <a className="skip-nav" href="#main-content">
        Skip to main content
      </a>
      <header className={styles.header} aria-label="Shell header">
        <TopBar />
      </header>
      <aside className={styles.sidebar} aria-label="Main navigation">
        <Sidebar isCollapsed={isCollapsed} onCollapsedChange={setCollapsed} />
      </aside>
      <main
        className={styles.main}
        id="main-content"
        tabIndex={-1}
        aria-label="Content"
      >
        <Outlet />
      </main>
      <div className={styles.statusbar}>
        <StatusBar />
      </div>
    </div>
  );
}

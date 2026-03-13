import React from "react";
import { Outlet } from "react-router";

import styles from "./ShellLayout.module.css";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { TopBar } from "./TopBar";

export function ShellLayout(): React.JSX.Element {
  return (
    <div className={styles.layout}>
      <a className="skip-nav" href="#main-content">
        Skip to main content
      </a>
      <header className={styles.header} aria-label="Shell header">
        <TopBar />
      </header>
      <nav className={styles.sidebar} aria-label="Main navigation">
        <Sidebar />
      </nav>
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

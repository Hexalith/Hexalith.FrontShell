import React from "react";

import styles from "./PageContent.module.css";

export function WelcomePage(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        Welcome to Hexalith.FrontShell
      </h1>
      <p className={styles.body}>
        Your modular micro-frontend platform. Select a module from the sidebar
        to get started.
      </p>
    </div>
  );
}

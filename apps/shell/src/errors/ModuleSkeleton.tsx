import React from "react";

import { Skeleton } from "@hexalith/ui";

import styles from "./ModuleSkeleton.module.css";

/**
 * Content-aware loading skeleton displayed while a module chunk loads.
 * Mirrors the PageLayout structure (header area + content card) to
 * minimise layout shift when the real module mounts.
 */
export function ModuleSkeleton(): React.JSX.Element {
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.titleBar} />
      </div>
      <Skeleton variant="card" />
    </div>
  );
}

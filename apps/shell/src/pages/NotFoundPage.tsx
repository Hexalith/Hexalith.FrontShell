import React from "react";
import { Link } from "react-router";

import styles from "./PageContent.module.css";

export function NotFoundPage(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <h1 className={styles.subtitle}>
        Page not found
      </h1>
      <Link to="/" className={styles.link}>
        Back to Home
      </Link>
    </div>
  );
}

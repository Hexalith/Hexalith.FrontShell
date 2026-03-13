import React from "react";

import styles from "./PageContent.module.css";

export function TenantsPlaceholderPage(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Tenants</h1>
      <p className={styles.body}>
        Tenant management will arrive in a later story. For now, this placeholder
        route keeps the shell navigation functional.
      </p>
    </div>
  );
}
import type React from 'react';
import clsx from 'clsx';

import styles from './PageLayout.module.css';

export interface PageLayoutProps {
  /** Page header title text */
  title?: string;
  /** Page header subtitle/description */
  subtitle?: string;
  /** Slot for action buttons in page header */
  actions?: React.ReactNode;
  /** Main content area */
  children: React.ReactNode;
  /** Additional CSS class for module customization */
  className?: string;
}

export function PageLayout({
  title,
  subtitle,
  actions,
  children,
  className,
}: PageLayoutProps) {
  const hasHeader = title !== undefined || actions != null;

  return (
    <div className={clsx(styles.root, className)}>
      {hasHeader && (
        <header className={styles.pageHeader}>
          <div className={styles.headerContent}>
            {title && (
              <div>
                <h1 className={styles.title}>{title}</h1>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
              </div>
            )}
            {actions != null && (
              <div className={styles.actions}>{actions}</div>
            )}
          </div>
        </header>
      )}
      <main className={styles.pageContent}>{children}</main>
    </div>
  );
}

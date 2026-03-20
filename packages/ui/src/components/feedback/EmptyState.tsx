import React from 'react';
import clsx from 'clsx';

import styles from './EmptyState.module.css';
import { Button } from '../forms/Button';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  /** Required heading text */
  title: string;
  /** Optional supporting text */
  description?: string;
  /** Optional CTA button */
  action?: EmptyStateAction;
  /** Optional custom illustration */
  illustration?: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  illustration,
  className,
}: EmptyStateProps) {
  return (
    <div className={clsx(styles.root, className)}>
      {illustration && <div className={styles.illustration}>{illustration}</div>}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

EmptyState.displayName = 'EmptyState';

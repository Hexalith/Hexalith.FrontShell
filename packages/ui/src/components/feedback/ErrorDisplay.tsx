import React from 'react';
import clsx from 'clsx';

import styles from './ErrorDisplay.module.css';
import { Button } from '../forms/Button';

export interface ErrorDisplayProps {
  /** Error object or message string */
  error: Error | string;
  /** Custom title — defaults to "Something went wrong" */
  title?: string;
  /** Optional retry callback */
  onRetry?: () => void;
  /** Additional CSS class */
  className?: string;
}

const AlertCircleIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
    <path d="M16 10v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="16" cy="22" r="1.5" fill="currentColor" />
  </svg>
);

export function ErrorDisplay({
  error,
  title = 'Something went wrong',
  onRetry,
  className,
}: ErrorDisplayProps) {
  const message = typeof error === 'string' ? error : error.message;

  return (
    <div className={clsx(styles.root, className)} role="alert">
      <div className={styles.icon}>
        <AlertCircleIcon />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
      {process.env.NODE_ENV !== 'production' &&
        error instanceof Error &&
        error.stack && (
          <details className={styles.stackTrace}>
            <summary>Stack trace</summary>
            <pre>{error.stack}</pre>
          </details>
        )}
    </div>
  );
}

ErrorDisplay.displayName = 'ErrorDisplay';

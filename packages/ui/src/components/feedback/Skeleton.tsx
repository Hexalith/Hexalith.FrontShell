import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

import styles from './Skeleton.module.css';

export interface SkeletonProps {
  /** Skeleton layout variant matching the target content */
  variant: 'table' | 'form' | 'detail' | 'card';
  /** Number of rows for table variant — defaults to 5 */
  rows?: number;
  /** Number of fields for form variant — defaults to 4 */
  fields?: number;
  /** When true AND 300ms elapsed since mount, skeleton unmounts — defaults to false */
  isReady?: boolean;
  /** Additional CSS class */
  className?: string;
}

function TableSkeleton({ rows = 5 }: { rows: number }) {
  return (
    <div className={styles.table}>
      <div className={styles.tableHeader}>
        <div className={clsx(styles.bar, styles.wFull, styles.hHeader)} />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.tableRow}>
          <div className={clsx(styles.bar, styles.wQuarter, styles.hBody)} />
          <div className={clsx(styles.bar, styles.wThird, styles.hBody)} />
          <div className={clsx(styles.bar, styles.wFifth, styles.hBody)} />
          <div className={clsx(styles.bar, styles.wShort, styles.hBody)} />
        </div>
      ))}
    </div>
  );
}

function FormSkeleton({ fields = 4 }: { fields: number }) {
  return (
    <div className={styles.form}>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className={styles.formField}>
          <div className={clsx(styles.bar, styles.wLabel, styles.hBody)} />
          <div className={clsx(styles.bar, styles.wFull, styles.hInput)} />
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className={styles.detail}>
      {Array.from({ length: 2 }, (_, s) => (
        <div key={s} className={styles.detailSection}>
          <div className={clsx(styles.bar, styles.wSectionTitle, styles.hHeader)} />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className={styles.detailRow}>
              <div className={clsx(styles.bar, styles.wDetailLabel, styles.hBody)} />
              <div className={clsx(styles.bar, styles.wDetailValue, styles.hBody)} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={clsx(styles.bar, styles.wFull, styles.hImage)} />
      <div className={styles.cardContent}>
        <div className={clsx(styles.bar, styles.wTitle, styles.hTitle)} />
        <div className={clsx(styles.bar, styles.wFull, styles.hBody)} />
        <div className={clsx(styles.bar, styles.wMeta, styles.hBody)} />
      </div>
    </div>
  );
}

export function Skeleton({
  variant,
  rows = 5,
  fields = 4,
  isReady = false,
  className,
}: SkeletonProps) {
  const [hasMinDurationPassed, setHasMinDurationPassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasMinDurationPassed(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (isReady && hasMinDurationPassed) return null;

  return (
    <div
      className={clsx(styles.root, className)}
      data-variant={variant}
      aria-busy="true"
      aria-label="Loading content"
    >
      {variant === 'table' && <TableSkeleton rows={rows} />}
      {variant === 'form' && <FormSkeleton fields={fields} />}
      {variant === 'detail' && <DetailSkeleton />}
      {variant === 'card' && <CardSkeleton />}
    </div>
  );
}

Skeleton.displayName = 'Skeleton';

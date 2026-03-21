import type React from 'react';
import clsx from 'clsx';

import styles from './DetailView.module.css';
import { Skeleton } from '../../feedback/Skeleton';
import { Divider } from '../../layout/Divider';
import { Inline } from '../../layout/Inline';

export interface DetailField {
  /** Field label (left column) */
  label: string;
  /** Field value — can be string, number, or React element */
  value: React.ReactNode;
  /** Span full grid width — for long-form content */
  span?: 1 | 2;
}

export interface DetailSection {
  /** Section heading */
  title: string;
  /** Key-value field pairs */
  fields: DetailField[];
}

export interface DetailViewProps {
  /** Grouped field sections */
  sections: DetailSection[];
  /** Action buttons (top-right of component) */
  actions?: React.ReactNode;
  /** Loading state — shows Skeleton placeholders */
  loading?: boolean;
  /** Density — affects spacing */
  density?: 'comfortable' | 'compact';
  /** Additional CSS class */
  className?: string;
}

export function DetailView({
  sections,
  actions,
  loading = false,
  density = 'comfortable',
  className,
}: DetailViewProps) {
  if (loading) {
    return (
      <div
        className={clsx(styles.detailView, className)}
        data-density={density}
      >
        <Skeleton variant="detail" />
      </div>
    );
  }

  return (
    <div
      className={clsx(styles.detailView, className)}
      data-density={density}
    >
      {actions && (
        <div className={styles.header}>
          <div className={styles.headerSpacer} aria-hidden="true" />
          <Inline justify="end">{actions}</Inline>
        </div>
      )}
      {sections.map((section, sectionIndex) => (
        <div key={section.title}>
          {sectionIndex > 0 && <Divider />}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{section.title}</h3>
            {section.fields.length > 0 && (
              <div className={styles.fieldGrid}>
                {section.fields.map((field) =>
                  <div
                    key={field.label}
                    className={clsx(
                      styles.fieldRow,
                      field.span === 2 && styles.fieldRowWide,
                    )}
                  >
                    <span
                      className={styles.fieldLabel}
                      {...(field.span === 2 ? { 'data-span': '2' } : {})}
                    >
                      {field.label}
                    </span>
                    <div
                      className={styles.fieldValue}
                      {...(field.span === 2 ? { 'data-span': '2' } : {})}
                    >
                      {field.value}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

DetailView.displayName = 'DetailView';

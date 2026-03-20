import type React from 'react';
import clsx from 'clsx';

import styles from './Inline.module.css';

import type { SpacingScale } from './types';

export interface InlineProps {
  /** Spacing token scale — defaults to '4' (1rem) */
  gap?: SpacingScale;
  /** Vertical alignment — defaults to 'center' */
  align?: 'start' | 'center' | 'end' | 'baseline';
  /** Horizontal distribution — defaults to 'start' */
  justify?: 'start' | 'center' | 'end' | 'between';
  /** Allow wrapping — defaults to false */
  wrap?: boolean;
  /** Inline content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const alignMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  baseline: 'baseline',
} as const;

const justifyMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
} as const;

export function Inline({
  gap = '4',
  align = 'center',
  justify = 'start',
  wrap = false,
  children,
  className,
}: InlineProps) {
  return (
    <div
      className={clsx(styles.root, className)}
      style={
        {
          '--inline-gap': `var(--spacing-${gap})`,
          '--inline-align': alignMap[align],
          '--inline-justify': justifyMap[justify],
          '--inline-wrap': wrap ? 'wrap' : 'nowrap',
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

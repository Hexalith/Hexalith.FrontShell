import type React from 'react';
import clsx from 'clsx';

import styles from './Stack.module.css';

import type { SpacingScale } from './types';

export interface StackProps {
  /** Spacing token scale — defaults to '4' (1rem) */
  gap?: SpacingScale;
  /** Cross-axis alignment — defaults to 'stretch' */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Stack content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const alignMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
} as const;

export function Stack({
  gap = '4',
  align = 'stretch',
  children,
  className,
}: StackProps) {
  return (
    <div
      className={clsx(styles.root, className)}
      style={
        {
          '--stack-gap': `var(--spacing-${gap})`,
          '--stack-align': alignMap[align],
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

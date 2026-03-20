import type React from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import clsx from 'clsx';

import styles from './Tooltip.module.css';

export interface TooltipProps {
  /** Tooltip content */
  content: React.ReactNode;
  /** Trigger element (must accept ref) */
  children: React.ReactElement;
  /** Tooltip placement — defaults to 'top' */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment on the side — defaults to 'center' */
  align?: 'start' | 'center' | 'end';
  /** Show delay in ms — defaults to 300 */
  delayDuration?: number;
  /** Additional CSS class on tooltip content */
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 300,
  className,
}: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            className={clsx(styles.content, className)}
            side={side}
            align={align}
            sideOffset={4}
            style={
              { '--z-index': 'var(--z-popover)' } as React.CSSProperties
            }
          >
            {content}
            <RadixTooltip.Arrow className={styles.arrow} />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

Tooltip.displayName = 'Tooltip';

import type React from 'react';
import * as RadixPopover from '@radix-ui/react-popover';
import clsx from 'clsx';

import styles from './Popover.module.css';

export interface PopoverProps {
  /** Trigger element — must accept ref */
  trigger: React.ReactElement;
  /** Popover content */
  children: React.ReactNode;
  /** Alignment relative to trigger */
  align?: 'start' | 'center' | 'end';
  /** Side to open on */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Controlled open state */
  open?: boolean;
  /** Controlled callback */
  onOpenChange?: (open: boolean) => void;
  /** Offset from trigger */
  sideOffset?: number;
  className?: string;
}

export function Popover({
  trigger,
  children,
  align = 'center',
  side = 'bottom',
  open,
  onOpenChange,
  sideOffset = 4,
  className,
}: PopoverProps) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          className={clsx(styles.content, className)}
          align={align}
          side={side}
          sideOffset={sideOffset}
        >
          {children}
          <RadixPopover.Arrow className={styles.arrow} />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

Popover.displayName = 'Popover';

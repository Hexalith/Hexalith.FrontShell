import type React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import clsx from 'clsx';

import styles from './Tabs.module.css';

export interface TabItem {
  /** Unique tab identifier (used as Radix value) */
  id: string;
  /** Tab trigger text */
  label: string;
  /** Tab panel content */
  content: React.ReactNode;
  /** Disable this tab — defaults to false */
  disabled?: boolean;
}

export interface TabsProps {
  /** Tab definitions */
  items: TabItem[];
  /** Default active tab id (uncontrolled) */
  defaultValue?: string;
  /** Controlled active tab id */
  value?: string;
  /** Active tab change callback */
  onValueChange?: (value: string) => void;
  /** Tab layout — defaults to 'horizontal' */
  orientation?: 'horizontal' | 'vertical';
  /** Additional CSS class */
  className?: string;
}

export function Tabs({
  items,
  defaultValue,
  value,
  onValueChange,
  orientation = 'horizontal',
  className,
}: TabsProps) {
  return (
    <RadixTabs.Root
      className={clsx(styles.root, className)}
      defaultValue={defaultValue ?? items[0]?.id}
      value={value}
      onValueChange={onValueChange}
      orientation={orientation}
      data-orientation={orientation}
    >
      <RadixTabs.List className={styles.list} data-orientation={orientation}>
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.id}
            className={styles.trigger}
            value={item.id}
            disabled={item.disabled}
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>

      {items.map((item) => (
        <RadixTabs.Content
          key={item.id}
          className={styles.content}
          value={item.id}
        >
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}

Tabs.displayName = 'Tabs';

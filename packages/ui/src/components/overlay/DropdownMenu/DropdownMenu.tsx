import type React from 'react';
import * as RadixDropdownMenu from '@radix-ui/react-dropdown-menu';
import clsx from 'clsx';

import styles from './DropdownMenu.module.css';

export interface DropdownMenuItem {
  /** Menu item label */
  label: string;
  /** Called when item is selected — optional when item has submenu */
  onSelect?: () => void;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Destructive action styling (red text) */
  destructive?: boolean;
  /** Nested submenu items — renders as Radix DropdownMenu.Sub (1 level max for MVP) */
  submenu?: Array<DropdownMenuItem | DropdownMenuSeparator>;
}

export interface DropdownMenuSeparator {
  type: 'separator';
}

export interface DropdownMenuGroup {
  /** Optional group label */
  label?: string;
  /** Items within the group */
  items: Array<DropdownMenuItem | DropdownMenuSeparator>;
}

export type DropdownMenuItemType =
  | DropdownMenuItem
  | DropdownMenuSeparator
  | DropdownMenuGroup;

export interface DropdownMenuProps {
  /** Trigger element — must accept ref */
  trigger: React.ReactElement;
  /** Menu items — flat items, separators, or groups */
  items: Array<DropdownMenuItemType>;
  /** Alignment relative to trigger */
  align?: 'start' | 'center' | 'end';
  /** Side to open on */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Controlled open state */
  open?: boolean;
  /** Controlled callback */
  onOpenChange?: (open: boolean) => void;
  /** Offset from trigger — default 4 */
  sideOffset?: number;
  className?: string;
}

function isSeparator(
  item: DropdownMenuItemType,
): item is DropdownMenuSeparator {
  return 'type' in item && item.type === 'separator';
}

function isGroup(item: DropdownMenuItemType): item is DropdownMenuGroup {
  return 'items' in item;
}

function renderMenuItem(
  item: DropdownMenuItem | DropdownMenuSeparator,
  index: number,
) {
  if (isSeparator(item)) {
    return (
      <RadixDropdownMenu.Separator
        key={`sep-${index}`}
        className={styles.separator}
      />
    );
  }

  if (item.submenu) {
    return (
      <RadixDropdownMenu.Sub key={item.label}>
        <RadixDropdownMenu.SubTrigger
          className={styles.item}
          disabled={item.disabled}
        >
          {item.label}
          <span className={styles.chevron} aria-hidden="true">
            &#x203A;
          </span>
        </RadixDropdownMenu.SubTrigger>
        <RadixDropdownMenu.Portal>
          <RadixDropdownMenu.SubContent className={styles.content}>
            {item.submenu.map((subItem, subIndex) =>
              renderMenuItem(subItem, subIndex),
            )}
          </RadixDropdownMenu.SubContent>
        </RadixDropdownMenu.Portal>
      </RadixDropdownMenu.Sub>
    );
  }

  return (
    <RadixDropdownMenu.Item
      key={item.label}
      className={styles.item}
      onSelect={item.onSelect}
      disabled={item.disabled}
      data-destructive={item.destructive ? '' : undefined}
    >
      {item.label}
    </RadixDropdownMenu.Item>
  );
}

export function DropdownMenu({
  trigger,
  items,
  align = 'start',
  side = 'bottom',
  open,
  onOpenChange,
  sideOffset = 4,
  className,
}: DropdownMenuProps) {
  return (
    <RadixDropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <RadixDropdownMenu.Trigger asChild>{trigger}</RadixDropdownMenu.Trigger>
      <RadixDropdownMenu.Portal>
        <RadixDropdownMenu.Content
          className={clsx(styles.content, className)}
          align={align}
          side={side}
          sideOffset={sideOffset}
        >
          {items.map((item, index) => {
            if (isGroup(item)) {
              return (
                <RadixDropdownMenu.Group key={item.label ?? `group-${index}`}>
                  {item.label && (
                    <RadixDropdownMenu.Label className={styles.groupLabel}>
                      {item.label}
                    </RadixDropdownMenu.Label>
                  )}
                  {item.items.map((groupItem, groupIndex) =>
                    renderMenuItem(groupItem, groupIndex),
                  )}
                </RadixDropdownMenu.Group>
              );
            }
            return renderMenuItem(item, index);
          })}
        </RadixDropdownMenu.Content>
      </RadixDropdownMenu.Portal>
    </RadixDropdownMenu.Root>
  );
}

DropdownMenu.displayName = 'DropdownMenu';

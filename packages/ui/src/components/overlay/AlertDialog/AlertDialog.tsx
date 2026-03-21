import * as RadixAlertDialog from '@radix-ui/react-alert-dialog';
import clsx from 'clsx';

import styles from './AlertDialog.module.css';
import { Button } from '../../forms/Button';

export interface AlertDialogProps {
  /** Whether dialog is open — controlled */
  open: boolean;
  /** Called when user confirms the destructive action */
  onAction: () => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Dialog title */
  title: string;
  /** Required explanation of the destructive action */
  description: string;
  /** Label for destructive action button */
  actionLabel?: string;
  /** Label for cancel button */
  cancelLabel?: string;
  className?: string;
}

export function AlertDialog({
  open,
  onAction,
  onCancel,
  title,
  description,
  actionLabel = 'Delete',
  cancelLabel = 'Cancel',
  className,
}: AlertDialogProps) {
  return (
    <RadixAlertDialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
    >
      <RadixAlertDialog.Portal forceMount>
        <RadixAlertDialog.Overlay forceMount className={styles.overlay} />
        <RadixAlertDialog.Content
          forceMount
          className={clsx(styles.content, className)}
        >
          <RadixAlertDialog.Title className={styles.title}>
            {title}
          </RadixAlertDialog.Title>
          <RadixAlertDialog.Description className={styles.description}>
            {description}
          </RadixAlertDialog.Description>
          <div className={styles.actions}>
            <RadixAlertDialog.Cancel asChild>
              <Button>{cancelLabel}</Button>
            </RadixAlertDialog.Cancel>
            <RadixAlertDialog.Action asChild>
              <button
                type="button"
                className={styles.actionButton}
                onClick={onAction}
              >
                {actionLabel}
              </button>
            </RadixAlertDialog.Action>
          </div>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  );
}

AlertDialog.displayName = 'AlertDialog';

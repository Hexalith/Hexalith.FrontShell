import type React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import clsx from 'clsx';

import styles from './Modal.module.css';

export interface ModalProps {
  /** Whether modal is open — controlled */
  open: boolean;
  /** Called when user closes (Escape, backdrop click, close button) */
  onClose: () => void;
  /** Dialog title — rendered as accessible heading */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Modal body content */
  children: React.ReactNode;
  /** Size preset — affects max-width */
  size?: 'small' | 'medium' | 'large';
  /** Accessible label for close button */
  closeLabel?: string;
  className?: string;
}

const CloseIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M4 4L12 12M12 4L4 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'medium',
  closeLabel = 'Close',
  className,
}: ModalProps) {
  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <RadixDialog.Portal forceMount>
        <RadixDialog.Overlay forceMount className={styles.overlay} />
        <RadixDialog.Content
          forceMount
          className={clsx(styles.content, className)}
          data-size={size}
        >
          <RadixDialog.Title className={styles.title}>
            {title}
          </RadixDialog.Title>
          {description ? (
            <RadixDialog.Description className={styles.description}>
              {description}
            </RadixDialog.Description>
          ) : (
            <RadixDialog.Description className={styles.srOnly} />
          )}
          {children}
          <RadixDialog.Close asChild>
            <button
              type="button"
              className={styles.closeButton}
              aria-label={closeLabel}
            >
              <CloseIcon />
            </button>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

Modal.displayName = 'Modal';

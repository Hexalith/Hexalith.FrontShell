import React, { createContext, useCallback, useContext, useState } from 'react';
import * as RadixToast from '@radix-ui/react-toast';

import styles from './Toast.module.css';

export interface ToastOptions {
  variant: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  /** Override auto-dismiss duration in ms. Ignored for 'error' variant. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;
let nextId = 0;

const SuccessIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M5 8l2 2 4-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ErrorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 1.5L14.5 13H1.5L8 1.5z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M8 6v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="11" r="0.75" fill="currentColor" />
  </svg>
);

const WarningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="11" r="0.75" fill="currentColor" />
  </svg>
);

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="5" r="0.75" fill="currentColor" />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M3 3l6 6M9 3l-6 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const variantIcons: Record<ToastOptions['variant'], React.FC> = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
};

export interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((options: ToastOptions): string => {
    const id = String(nextId++);
    setToasts((prev) => {
      const next = [...prev, { ...options, id }];
      if (next.length > MAX_VISIBLE) {
        const nonErrorIndex = next.findIndex((t) => t.variant !== 'error');
        if (nonErrorIndex !== -1) {
          next.splice(nonErrorIndex, 1);
        } else {
          next.splice(0, 1);
        }
      }
      return next;
    });
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <RadixToast.Provider swipeDirection="right">
        {toasts.map((t) => {
          const Icon = variantIcons[t.variant];
          return (
            <RadixToast.Root
              key={t.id}
              className={styles.root}
              data-variant={t.variant}
              duration={
                t.variant === 'error'
                  ? 2_147_483_647
                  : (t.duration ?? 5000)
              }
              type={t.variant === 'error' ? 'foreground' : 'background'}
              onOpenChange={(open) => {
                if (!open) removeToast(t.id);
              }}
            >
              <div className={styles.icon}>
                <Icon />
              </div>
              <div className={styles.content}>
                <RadixToast.Title className={styles.title}>
                  {t.title}
                </RadixToast.Title>
                {t.description && (
                  <RadixToast.Description className={styles.description}>
                    {t.description}
                  </RadixToast.Description>
                )}
              </div>
              <RadixToast.Close className={styles.closeButton} aria-label="Dismiss notification">
                <CloseIcon />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}
        <RadixToast.Viewport className={styles.viewport} />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

ToastProvider.displayName = 'ToastProvider';

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return context;
}

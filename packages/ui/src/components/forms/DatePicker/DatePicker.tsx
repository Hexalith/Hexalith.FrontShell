import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';
import { DayPicker } from 'react-day-picker';

import styles from './DatePicker.module.css';

export interface DatePickerProps {
  /** Label text — REQUIRED for accessibility */
  label: string;
  /** Selected date */
  value?: Date;
  /** Change handler */
  onChange?: (date: Date | undefined) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Error message — presence triggers error state */
  error?: string;
  /** Shows required indicator — defaults to false */
  required?: boolean;
  /** Disabled state — defaults to false */
  disabled?: boolean;
  /** Placeholder text — defaults to 'Select date...' */
  placeholder?: string;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** HTML name attribute */
  name?: string;
  /** HTML id — auto-generated via useId() if omitted */
  id?: string;
  /** Additional CSS class */
  className?: string;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function CalendarIcon() {
  return (
    <svg
      className={styles.calendarIcon}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 1v2M11 1v2M1 6h14M3 3h10a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      label,
      value,
      onChange,
      onBlur,
      error,
      required = false,
      disabled = false,
      placeholder = 'Select date...',
      minDate,
      maxDate,
      name,
      id: idProp,
      className,
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const id = idProp ?? generatedId;
    const errorId = `${id}-error`;
    const [open, setOpen] = React.useState(false);

    const handleSelect = (date: Date | undefined) => {
      onChange?.(date);
      setOpen(false);
    };

    const disabledDays = React.useMemo(() => {
      const matchers: Array<{ before: Date } | { after: Date }> = [];
      if (minDate) matchers.push({ before: minDate });
      if (maxDate) matchers.push({ after: maxDate });
      return matchers;
    }, [minDate, maxDate]);

    return (
      <div className={clsx(styles.root, disabled && styles.disabled, className)}>
        <label className={styles.label} htmlFor={id}>
          {label}
          {required && (
            <span className={styles.requiredIndicator} aria-hidden="true">
              *
            </span>
          )}
        </label>
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              ref={ref}
              className={clsx(styles.trigger, error && styles.triggerError)}
              id={id}
              name={name}
              type="button"
              disabled={disabled}
              onBlur={onBlur}
              {...(required ? { 'aria-required': 'true' } : {})}
              {...(error
                ? {
                    'aria-invalid': 'true',
                    'aria-describedby': errorId,
                  }
                : {})}
            >
              <span className={value ? styles.triggerValue : styles.triggerPlaceholder}>
                {value ? formatDate(value) : placeholder}
              </span>
              <CalendarIcon />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              sideOffset={4}
              align="start"
              className={styles.content}
            >
              <DayPicker
                mode="single"
                selected={value}
                onSelect={handleSelect}
                disabled={disabledDays.length > 0 ? disabledDays : undefined}
                className={styles.calendar}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        {error && (
          <p id={errorId} className={styles.errorMessage}>
            {error}
          </p>
        )}
      </div>
    );
  },
);

DatePicker.displayName = 'DatePicker';

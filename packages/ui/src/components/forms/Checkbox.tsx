import React from 'react';
import clsx from 'clsx';

import styles from './Checkbox.module.css';

export interface CheckboxProps {
  /** Label text — REQUIRED for accessibility */
  label: string;
  /** Controlled checked state */
  checked?: boolean;
  /** Change handler — returns boolean value */
  onChange?: (checked: boolean) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Error message — presence triggers error state */
  error?: string;
  /** Shows required indicator — defaults to false */
  required?: boolean;
  /** Disabled state — defaults to false */
  disabled?: boolean;
  /** HTML name attribute */
  name?: string;
  /** HTML id — auto-generated via useId() if omitted */
  id?: string;
  /** Additional CSS class */
  className?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      checked,
      onChange,
      onBlur,
      error,
      required = false,
      disabled = false,
      name,
      id: idProp,
      className,
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const id = idProp ?? generatedId;
    const errorId = `${id}-error`;

    return (
      <div className={clsx(styles.root, disabled && styles.disabled, className)}>
        <div className={styles.control}>
          <input
            ref={ref}
            className={styles.input}
            type="checkbox"
            id={id}
            name={name}
            checked={checked}
            onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
            onBlur={onBlur}
            required={required}
            disabled={disabled}
            {...(required ? { 'aria-required': 'true' } : {})}
            {...(error
              ? {
                  'aria-invalid': 'true',
                  'aria-describedby': errorId,
                }
              : {})}
          />
          <span className={clsx(styles.box, error && styles.boxError)} aria-hidden="true" />
          <label className={styles.label} htmlFor={id}>
            {label}
            {required && (
              <span className={styles.requiredIndicator} aria-hidden="true">
                *
              </span>
            )}
          </label>
        </div>
        {error && (
          <p id={errorId} className={styles.errorMessage}>
            {error}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';

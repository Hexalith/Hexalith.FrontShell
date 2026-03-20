import React from 'react';
import clsx from 'clsx';

import styles from './Input.module.css';

export interface InputProps {
  /** Label text — REQUIRED for accessibility */
  label: string;
  /** HTML name attribute — needed for form submission */
  name?: string;
  /** Input type — defaults to 'text' */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  /** Controlled value */
  value?: string;
  /**
   * Change handler — returns string value directly.
   * Note: for type="number", browser returns empty string for non-numeric input.
   */
  onChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Shows required indicator — defaults to false */
  required?: boolean;
  /** Disabled state — defaults to false */
  disabled?: boolean;
  /** Error message — presence triggers error state */
  error?: string;
  /** HTML id — auto-generated via useId() if omitted */
  id?: string;
  /** Additional CSS class */
  className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      name,
      type = 'text',
      value,
      onChange,
      placeholder,
      required = false,
      disabled = false,
      error,
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
        <label className={styles.label} htmlFor={id}>
          {label}
          {required && (
            <span className={styles.requiredIndicator} aria-hidden="true">
              *
            </span>
          )}
        </label>
        <input
          ref={ref}
          className={clsx(styles.input, error && styles.inputError)}
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          placeholder={placeholder}
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
        {error && (
          <p id={errorId} className={styles.errorMessage}>
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

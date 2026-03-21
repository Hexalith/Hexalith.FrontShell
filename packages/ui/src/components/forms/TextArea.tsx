import React from 'react';
import clsx from 'clsx';

import styles from './TextArea.module.css';

export interface TextAreaProps {
  /** Label text — REQUIRED for accessibility */
  label: string;
  /** Controlled value */
  value?: string;
  /** Change handler — returns string value directly */
  onChange?: (value: string) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Error message — presence triggers error state */
  error?: string;
  /** Shows required indicator — defaults to false */
  required?: boolean;
  /** Disabled state — defaults to false */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** HTML name attribute */
  name?: string;
  /** HTML id — auto-generated via useId() if omitted */
  id?: string;
  /** Additional CSS class */
  className?: string;
  /** Visible rows — defaults to 3 */
  rows?: number;
  /** Character limit */
  maxLength?: number;
  /** Resize behavior — defaults to 'vertical' */
  resize?: 'none' | 'vertical' | 'both';
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      value,
      onChange,
      onBlur,
      error,
      required = false,
      disabled = false,
      placeholder,
      name,
      id: idProp,
      className,
      rows = 3,
      maxLength,
      resize = 'vertical',
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
        <textarea
          ref={ref}
          className={clsx(styles.textarea, error && styles.textareaError)}
          data-resize={resize}
          id={id}
          name={name}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
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

TextArea.displayName = 'TextArea';

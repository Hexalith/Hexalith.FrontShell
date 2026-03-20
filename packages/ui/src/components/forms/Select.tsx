import React, { useState } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import clsx from 'clsx';

import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectProps {
  /** Label text — REQUIRED for accessibility */
  label: string;
  /** HTML name attribute — needed for form submission */
  name?: string;
  /** Flat or grouped options */
  options: Array<SelectOption | SelectOptionGroup>;
  /** Controlled value */
  value?: string;
  /** Change handler — returns selected value */
  onChange?: (value: string) => void;
  /** Placeholder text — defaults to 'Select...' */
  placeholder?: string;
  /** Disabled state — defaults to false */
  disabled?: boolean;
  /** Error message — presence triggers error state */
  error?: string;
  /** Enable search/filter — defaults to false */
  isSearchable?: boolean;
  /** Shows required indicator — defaults to false */
  required?: boolean;
  /** Additional CSS class */
  className?: string;
}

function isGroup(
  opt: SelectOption | SelectOptionGroup,
): opt is SelectOptionGroup {
  return 'options' in opt;
}

function flattenOptions(
  options: Array<SelectOption | SelectOptionGroup>,
): SelectOption[] {
  return options.flatMap((o) => (isGroup(o) ? o.options : [o]));
}

function filterOptions(
  options: Array<SelectOption | SelectOptionGroup>,
  filter: string,
): Array<SelectOption | SelectOptionGroup> {
  const lowerFilter = filter.toLowerCase();
  return options
    .map((o) => {
      if (isGroup(o)) {
        const filtered = o.options.filter((opt) =>
          opt.label.toLowerCase().includes(lowerFilter),
        );
        return filtered.length > 0 ? { ...o, options: filtered } : null;
      }
      return o.label.toLowerCase().includes(lowerFilter) ? o : null;
    })
    .filter((o): o is SelectOption | SelectOptionGroup => o !== null);
}

const ChevronIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3 4.5L6 7.5L9 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      label,
      name,
      options,
      value,
      onChange,
      placeholder = 'Select...',
      disabled = false,
      error,
      isSearchable = false,
      required = false,
      className,
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const triggerId = generatedId;
    const errorId = `${generatedId}-error`;
    const [filter, setFilter] = useState('');

    if (process.env.NODE_ENV !== 'production' && options.length > 0) {
      const flat = flattenOptions(options);
      const first = flat[0];
      if (first && (!('value' in first) || !('label' in first))) {
        console.warn(
          `Select: options must have 'value' and 'label' properties. Received: ${JSON.stringify(first)}`,
        );
      }
      const values = flat.map((o) => o.value);
      if (new Set(values).size !== values.length) {
        console.warn(
          'Select: options contain duplicate `value` entries. Radix Select requires unique values.',
        );
      }
    }

    const filteredOptions =
      isSearchable && filter ? filterOptions(options, filter) : options;

    const handleOpenChange = (open: boolean) => {
      if (!open) {
        setFilter('');
      }
    };

    const renderOptions = (opts: Array<SelectOption | SelectOptionGroup>) =>
      opts.map((opt) => {
        if (isGroup(opt)) {
          return (
            <RadixSelect.Group key={opt.label}>
              <RadixSelect.Label className={styles.groupLabel}>
                {opt.label}
              </RadixSelect.Label>
              {opt.options.map((item) => (
                <RadixSelect.Item
                  key={item.value}
                  value={item.value}
                  disabled={item.disabled}
                  className={styles.item}
                >
                  <RadixSelect.ItemText>{item.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Group>
          );
        }
        return (
          <RadixSelect.Item
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            className={styles.item}
          >
            <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
          </RadixSelect.Item>
        );
      });

    return (
      <div
        className={clsx(styles.root, disabled && styles.disabled, className)}
      >
        <label className={styles.label} htmlFor={triggerId}>
          {label}
          {required && (
            <span className={styles.requiredIndicator} aria-hidden="true">
              *
            </span>
          )}
        </label>
        <RadixSelect.Root
          value={value}
          onValueChange={onChange}
          name={name}
          disabled={disabled}
          onOpenChange={handleOpenChange}
        >
          <RadixSelect.Trigger
            ref={ref}
            id={triggerId}
            className={styles.trigger}
          >
            <RadixSelect.Value placeholder={placeholder} />
            <RadixSelect.Icon className={styles.icon}>
              <ChevronIcon />
            </RadixSelect.Icon>
          </RadixSelect.Trigger>
          <RadixSelect.Portal>
            <RadixSelect.Content
              className={styles.content}
              position="popper"
              sideOffset={4}
            >
              {isSearchable && (
                <div className={styles.searchContainer}>
                  <input
                    className={styles.searchInput}
                    placeholder="Search..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    data-testid="select-search-input"
                  />
                </div>
              )}
              <RadixSelect.Viewport className={styles.viewport}>
                {renderOptions(filteredOptions)}
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>
        {error && (
          <p id={errorId} className={styles.errorMessage}>
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

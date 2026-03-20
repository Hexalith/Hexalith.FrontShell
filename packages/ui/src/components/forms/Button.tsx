import React from 'react';
import clsx from 'clsx';

import styles from './Button.module.css';

export interface ButtonProps {
  /** Visual variant — defaults to 'secondary' */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Size variant — defaults to 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state — defaults to false */
  disabled?: boolean;
  /** HTML type — defaults to 'button' */
  type?: 'button' | 'submit' | 'reset';
  /** Click handler */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** Button content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      disabled = false,
      type = 'button',
      onClick,
      children,
      className,
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={clsx(styles.root, className)}
        data-variant={variant}
        data-size={size}
        disabled={disabled}
        type={type}
        onClick={onClick}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

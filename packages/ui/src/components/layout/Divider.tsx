import clsx from 'clsx';

import styles from './Divider.module.css';

export interface DividerProps {
  /** Additional CSS class */
  className?: string;
}

export function Divider({ className }: DividerProps) {
  return <hr className={clsx(styles.root, className)} />;
}

import React from 'react';
import styles from './Checkbox.module.css';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, id, label, ...props }, ref) => {
    const defaultId = React.useId();
    const checkboxId = id || defaultId;

    return (
      <div className={`${styles.checkboxContainer} ${className || ''}`}>
        <input
          type="checkbox"
          id={checkboxId}
          ref={ref}
          className={styles.checkbox}
          {...props}
        />
        <label htmlFor={checkboxId} className={styles.label}>
          {label}
        </label>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

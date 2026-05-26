import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  rightLabel?: React.ReactNode;
  onIconRightClick?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, iconLeft, iconRight, rightLabel, onIconRightClick, ...props }, ref) => {
    return (
      <div className={styles.container}>
        {(label || rightLabel) && (
          <div className={styles.label}>
            {label && <span>{label}</span>}
            {rightLabel && <span>{rightLabel}</span>}
          </div>
        )}
        <div className={styles.inputWrapper}>
          {iconLeft && <span className={styles.iconLeft}>{iconLeft}</span>}
          <input
            ref={ref}
            className={`${styles.input} ${iconLeft ? styles.hasIconLeft : ''} ${iconRight ? styles.hasIconRight : ''} ${className || ''}`}
            {...props}
          />
          {iconRight && (
            <span 
              className={styles.iconRight} 
              onClick={onIconRightClick}
            >
              {iconRight}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconColor?: 'blue' | 'green';
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ title, description, icon, iconColor = 'blue', className, style }) => {
  return (
    <div className={`${styles.card} ${className || ''}`} style={style}>
      <div className={styles.cardHeader}>
        <div className={`${styles.iconContainer} ${iconColor === 'green' ? styles.green : ''}`}>
          {icon}
        </div>
        <h3 className={styles.title}>{title}</h3>
      </div>
      <p className={styles.content}>{description}</p>
    </div>
  );
};

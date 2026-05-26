import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, subtext }) => {
  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, backgroundColor: 'white' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
          {value}
        </div>
        {subtext && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
};

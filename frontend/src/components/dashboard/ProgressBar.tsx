import React from 'react';

interface ProgressBarProps {
  label: string;
  icon: React.ReactNode;
  progress: number; // 0 to 100
  details: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ label, icon, progress, details }) => {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <span style={{ color: 'var(--primary)' }}>{icon}</span>
          {label}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {details}
        </div>
      </div>
      <div style={{ width: '100%', height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
        <div 
          style={{ 
            height: '100%', 
            backgroundColor: 'var(--primary)', 
            width: `${progress}%`,
            borderRadius: '4px'
          }} 
        />
      </div>
    </div>
  );
};

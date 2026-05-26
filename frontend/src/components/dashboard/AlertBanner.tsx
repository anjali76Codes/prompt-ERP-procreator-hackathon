import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface AlertBannerProps {
  title: string;
  description: string;
  onDismiss?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ title, description, onDismiss }) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const handleDismiss = () => {
    onDismiss?.();
    setDismissed(true);
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '0.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertTriangle size={20} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{title}</div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss alert"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {description}
        </div>
      </div>
    </div>
  );
};

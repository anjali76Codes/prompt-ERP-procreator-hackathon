import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';

interface PlaceholderProps {
  title?: string;
  description?: string;
}

/**
 * Placeholder for routes that exist in the navigation but are not yet implemented.
 * Used to prevent broken sidebar links while modules are being built out.
 */
export const Placeholder: React.FC<PlaceholderProps> = ({
  title,
  description = 'This module is part of the ERP roadmap. The screen is being designed and will be available in a future release.',
}) => {
  const { pathname } = useLocation();
  const inferred = pathname.replace(/^\//, '').split('/').filter(Boolean).map(seg =>
    seg.charAt(0).toUpperCase() + seg.slice(1)
  ).join(' › ') || 'Module';

  return (
    <AppLayout>
      <div className="breadcrumbs" style={{ marginBottom: '1rem' }}>
        <Link to="/dashboard" style={{ color: 'inherit' }}>Dashboard</Link>
        <span>›</span>
        <span className="current">{title ?? inferred}</span>
      </div>

      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1rem',
          padding: '4rem 2rem',
          maxWidth: 640,
          margin: '4rem auto 0',
        }}
      >
        <div
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#EFF6FF', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Construction size={28} />
        </div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0F172A' }}>
          {title ?? inferred}
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', maxWidth: 440, lineHeight: 1.55 }}>
          {description}
        </p>
        <Link to="/dashboard" className="btn btn-secondary" style={{ marginTop: '0.5rem', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    </AppLayout>
  );
};

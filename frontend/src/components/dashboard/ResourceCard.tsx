import React from 'react';

interface ResourceCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconColor: string;
  isFolder?: boolean;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ title, subtitle, icon, iconColor, isFolder }) => {
  return (
    <div style={{ 
      border: isFolder ? '1px dashed var(--border-color)' : '1px solid var(--border-color)', 
      borderRadius: 'var(--radius-md)', 
      padding: '1rem', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '0.75rem',
      backgroundColor: isFolder ? '#F9FAFB' : 'white',
      flex: '1 1 0',
      minWidth: '120px'
    }}>
      <div style={{ color: iconColor }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
};

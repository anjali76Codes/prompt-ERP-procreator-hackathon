import React from 'react';

interface DeadlineItem {
  title: string;
  course: string;
  date: string;
  instructor: string;
  isUrgent?: boolean;
}

interface DeadlineListProps {
  items: DeadlineItem[];
}

export const DeadlineList: React.FC<DeadlineListProps> = ({ items }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {items.map((item, index) => (
        <div key={index} style={{ 
          border: '1px solid var(--border-color)', 
          borderRadius: 'var(--radius-md)', 
          padding: '1rem',
          borderLeft: item.isUrgent ? '4px solid #DC2626' : '1px solid var(--border-color)',
          backgroundColor: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.title}</div>
            <div style={{ fontSize: '0.75rem', color: item.isUrgent ? '#DC2626' : 'var(--text-muted)', textAlign: 'right' }}>
              {item.date.split(',').map((part, i) => (
                <React.Fragment key={i}>
                  {part}
                  {i === 0 && <br />}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {item.course} • {item.instructor}
          </div>
        </div>
      ))}
    </div>
  );
};

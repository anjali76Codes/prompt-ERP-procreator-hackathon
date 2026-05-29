import React from 'react';

interface ScheduleItem {
  time: string;
  course: string;
  code: string;
  type: string;
  instructor: string;
  location: string;
  status: 'ONGOING' | 'UPCOMING' | 'COMPLETED';
}

interface ScheduleTableProps {
  items: ScheduleItem[];
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({ items }) => {
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Time Slot</th>
            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Course & Code</th>
            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Instructor</th>
            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Location</th>
            <th style={{ padding: '1rem 0', fontWeight: 600, textAlign: 'right' }}>Action / Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} style={{ borderBottom: index < items.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
              <td style={{ padding: '1rem 0', fontSize: '0.875rem' }}>{item.time}</td>
              <td style={{ padding: '1rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {item.status === 'ONGOING' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A' }}></div>}
                  {item.status !== 'ONGOING' && <div style={{ width: '6px', height: '6px' }}></div>}
                  <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.875rem' }}>{item.course}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '1rem' }}>{item.code} • {item.type}</div>
              </td>
              <td style={{ padding: '1rem 0', fontSize: '0.875rem' }}>{item.instructor}</td>
              <td style={{ padding: '1rem 0', fontSize: '0.875rem' }}>{item.location}</td>
              <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                {item.status === 'ONGOING' ? (
                  <span style={{ backgroundColor: '#16A34A', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.65rem', fontWeight: 700 }}>
                    ONGOING
                  </span>
                ) : item.status === 'UPCOMING' ? (
                  <span style={{ backgroundColor: '#F3F4F6', color: 'var(--text-muted)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.65rem', fontWeight: 700 }}>
                    UPCOMING
                  </span>
                ) : (
                  <span style={{ backgroundColor: '#E2E8F0', color: '#475569', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.65rem', fontWeight: 700 }}>
                    COMPLETED
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

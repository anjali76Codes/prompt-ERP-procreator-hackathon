import React, { useEffect, useState } from 'react';
import { Calendar, Loader2, MapPin, Clock } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { fetchStudentOverview, type StudentOverview, type StudentTodayLecture } from '../lib/studentOverview/api';
import { ApiError } from '../lib/api';

const fmtTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

const statusStyle = (status: StudentTodayLecture['status']): { label: string; bg: string; color: string } => {
  if (status === 'completed') return { label: 'COMPLETED', bg: '#DCFCE7', color: '#15803D' };
  if (status === 'cancelled') return { label: 'CANCELLED', bg: '#FEE2E2', color: '#B91C1C' };
  return                              { label: 'SCHEDULED', bg: '#DBEAFE', color: '#1D4ED8' };
};

export const StudentSchedule: React.FC = () => {
  const [data, setData] = useState<StudentOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await fetchStudentOverview());
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setLoadError(null);
        } else {
          setLoadError(e instanceof ApiError ? e.message : 'Failed to load schedule');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const lectures = data?.todayLectures ?? [];
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<Calendar size={18} />}
      pageTitle="My Schedule"
      pageBreadcrumb="Academic"
    >
      {loadError && (
        <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
          {loadError}
        </div>
      )}

      {/* Hero */}
      <div style={{
        marginBottom: '1.25rem',
        background: 'linear-gradient(120deg, var(--primary) 0%, var(--primary-container) 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        color: 'white',
        display: 'flex', alignItems: 'center', gap: '1.25rem',
        boxShadow: '0 10px 30px -10px rgba(0, 74, 198, 0.4)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Calendar size={26} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.6px', color: '#BFDBFE', textTransform: 'uppercase' }}>
            Today
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, lineHeight: 1.15, marginTop: 4 }}>
            {todayLabel}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#DBEAFE', marginTop: 2 }}>
            {loading
              ? 'Loading…'
              : lectures.length === 0
                ? 'No lectures scheduled today.'
                : `${lectures.length} lecture${lectures.length === 1 ? '' : 's'} on your timetable`}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Today's Lectures</h3></div>

        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : lectures.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
            <Calendar size={32} color="#CBD5E1" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155' }}>
              Nothing scheduled for today
            </div>
            <div style={{ fontSize: '0.82rem', marginTop: 4 }}>
              Lectures appear here once your faculty publishes the timetable.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {lectures.map(l => {
              const pill = statusStyle(l.status);
              return (
                <div key={l.lectureId} style={{
                  display: 'grid',
                  gridTemplateColumns: '1.3fr 2.5fr 2fr 1fr',
                  alignItems: 'center', gap: '1rem',
                  padding: '0.95rem 1rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: '0.6rem',
                  background: l.status === 'cancelled' ? '#FEF2F2' : 'white',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={14} color="#64748B" />
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                        {fmtTime(l.startsAt)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        to {fmtTime(l.endsAt)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.4px' }}>
                      {l.subjectCode}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                      {l.subjectName}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#475569', fontSize: '0.85rem' }}>
                    <MapPin size={13} color="#94A3B8" />
                    {l.room || '—'}
                  </div>
                  <div>
                    <span style={{
                      display: 'inline-flex',
                      background: pill.bg, color: pill.color,
                      fontSize: '0.66rem', fontWeight: 800,
                      padding: '0.2rem 0.55rem', borderRadius: '0.3rem',
                      letterSpacing: '0.4px',
                    }}>
                      {pill.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

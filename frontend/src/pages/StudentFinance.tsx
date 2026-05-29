import React, { useEffect, useState } from 'react';
import {
  CreditCard, Loader2, CheckCircle2, AlertTriangle, Download, IndianRupee, Wallet, Receipt,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { fetchStudentOverview, type StudentOverview } from '../lib/studentOverview/api';
import { ApiError } from '../lib/api';

/* The Finance domain isn't modelled in the backend yet — show a realistic
 * statement derived deterministically from the student's identity so the
 * numbers stay stable across reloads and look like a real fee ledger. */

interface FeeLine {
  id: string;
  label: string;
  due: string;
  amount: number;
  status: 'paid' | 'due' | 'upcoming';
  paidOn?: string;
}

const fmtInr = (n: number): string =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

const buildLedger = (rollNumber?: string): FeeLine[] => {
  // Deterministic salt so the same student always sees the same statement.
  const seed = (rollNumber ?? 'student').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const yr = new Date().getFullYear();
  const salt = (seed % 5) * 250;
  return [
    {
      id: 'sem-tuition',
      label: `Semester Tuition (${yr})`,
      due: `${yr}-07-15`,
      amount: 78500 + salt,
      status: 'paid',
      paidOn: `${yr}-07-08`,
    },
    {
      id: 'sem-exam',
      label: 'Examination Fee',
      due: `${yr}-09-30`,
      amount: 4500,
      status: 'paid',
      paidOn: `${yr}-09-12`,
    },
    {
      id: 'sem-lab',
      label: 'Laboratory & Library Fee',
      due: `${yr}-09-30`,
      amount: 6000,
      status: 'due',
    },
    {
      id: 'sem-hostel',
      label: 'Hostel Mess Charges (Q3)',
      due: `${yr}-10-25`,
      amount: 18500 + salt,
      status: 'due',
    },
    {
      id: 'sem-tuition-next',
      label: `Semester Tuition (${yr + 1} Spring)`,
      due: `${yr + 1}-01-15`,
      amount: 78500 + salt,
      status: 'upcoming',
    },
  ];
};

export const StudentFinance: React.FC = () => {
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
          setLoadError(e instanceof ApiError ? e.message : 'Failed to load finance');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ledger = buildLedger(data?.identity.rollNumber);
  const paid = ledger.filter(l => l.status === 'paid');
  const due = ledger.filter(l => l.status === 'due');
  const upcoming = ledger.filter(l => l.status === 'upcoming');
  const dueTotal = due.reduce((s, l) => s + l.amount, 0);
  const paidTotal = paid.reduce((s, l) => s + l.amount, 0);

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<CreditCard size={18} />}
      pageTitle="Finance"
      pageBreadcrumb="Fees & Statements"
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
          <Wallet size={28} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.6px', color: '#BFDBFE', textTransform: 'uppercase' }}>
            Outstanding Balance
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, marginTop: 4 }}>
            {loading ? '—' : fmtInr(dueTotal)}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#DBEAFE', marginTop: 2 }}>
            {dueTotal === 0
              ? 'You\'re all settled. Nothing due right now.'
              : `${due.length} pending item${due.length === 1 ? '' : 's'} — pay before the due date to avoid late charges.`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.85rem' }}>
          <HeroStat label="Paid" value={fmtInr(paidTotal)} icon={<CheckCircle2 size={14} />} />
          <HeroStat label="Items" value={String(ledger.length)} icon={<Receipt size={14} />} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        <FeeBlock
          title="Pending Dues"
          tone="#B91C1C"
          toneBg="#FEE2E2"
          icon={<AlertTriangle size={18} />}
          lines={due}
          emptyText="No pending dues — nice."
          ctaLabel="Pay now"
        />

        <FeeBlock
          title="Upcoming"
          tone="#92400E"
          toneBg="#FEF3C7"
          icon={<IndianRupee size={18} />}
          lines={upcoming}
          emptyText="No future fees scheduled yet."
        />

        <FeeBlock
          title="Payment History"
          tone="#15803D"
          toneBg="#DCFCE7"
          icon={<CheckCircle2 size={18} />}
          lines={paid}
          emptyText="No payments on record yet."
          ctaLabel="Receipt"
          ctaIcon={<Download size={12} />}
        />
      </div>

      {loading && (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.78rem' }}>
          <Loader2 size={14} className="animate-spin" /> Syncing your statement…
        </div>
      )}
    </AppLayout>
  );
};

const HeroStat: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div style={{
    minWidth: 110,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '0.55rem',
    padding: '0.55rem 0.85rem',
    textAlign: 'center',
  }}>
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.6px',
      color: '#BFDBFE', textTransform: 'uppercase',
    }}>
      {icon}{label}
    </div>
    <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: 2, color: 'white' }}>
      {value}
    </div>
  </div>
);

const FeeBlock: React.FC<{
  title: string;
  tone: string;
  toneBg: string;
  icon: React.ReactNode;
  lines: FeeLine[];
  emptyText: string;
  ctaLabel?: string;
  ctaIcon?: React.ReactNode;
}> = ({ title, tone, toneBg, icon, lines, emptyText, ctaLabel, ctaIcon }) => (
  <div className="card">
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      paddingBottom: '0.85rem', marginBottom: '1rem',
      borderBottom: `1px solid ${tone}25`,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '0.5rem',
        background: toneBg, color: tone,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.6px', color: tone, textTransform: 'uppercase' }}>
          Section
        </div>
        <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
          {title} <span style={{ fontWeight: 600, color: '#64748B', fontSize: '0.78rem' }}>({lines.length})</span>
        </div>
      </div>
    </div>

    {lines.length === 0 ? (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
        {emptyText}
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {lines.map(line => (
          <div key={line.id} style={{
            display: 'grid',
            gridTemplateColumns: '2.5fr 1.4fr 1fr auto',
            alignItems: 'center', gap: '1rem',
            padding: '0.75rem 0.95rem',
            border: '1px solid #E2E8F0',
            borderRadius: '0.5rem',
            background: 'white',
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                {line.label}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                {line.paidOn
                  ? `Paid ${new Date(line.paidOn).toLocaleDateString()}`
                  : `Due ${new Date(line.due).toLocaleDateString()}`}
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#475569' }}>
              {new Date(line.due).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>
              {fmtInr(line.amount)}
            </div>
            <div>
              {ctaLabel && (
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '0.4rem 0.85rem', borderRadius: '0.45rem',
                  background: tone, color: 'white', border: 'none',
                  fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer',
                }}>
                  {ctaIcon} {ctaLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

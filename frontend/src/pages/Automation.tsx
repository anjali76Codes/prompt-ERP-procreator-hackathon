import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Plus, Search } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { AutomationCard } from '../components/automation/recorder/AutomationCard';
import { useAuth } from '../lib/auth/AuthContext';
import { useRecorder } from '../lib/automation/recorder/RecorderContext';
import * as api from '../lib/automation/recorder/api';
import type { Automation as AutomationT } from '../lib/automation/recorder/types';
import { ApiError } from '../lib/api';
import { toast } from 'react-toastify';
import s from '../components/automation/recorder/automation.module.css';

type Filter = 'all' | 'mine' | 'shared';

export const Automation: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const recorder = useRecorder();

  const [automations, setAutomations] = useState<AutomationT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const userId = user?._id ?? '';

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try { setAutomations(await api.listAutomations()); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to load automations'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return automations.filter(a => {
      if (filter === 'mine') {
        const ownerId = typeof a.owner === 'string' ? a.owner : a.owner._id;
        if (ownerId !== userId) return false;
      }
      if (filter === 'shared') {
        if (!a.shared) return false;
      }
      if (q && !(a.name.toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [automations, filter, query, userId]);

  /* --------- actions --------- */

  const handleCreateNew = async () => {
    const name = window.prompt('Name your automation:', 'Mark TE-A attendance');
    if (!name) return;
    try {
      const a = await api.createAutomation({ name });
      toast.success(`Recording started — "${name}"`);
      // Start recording immediately on the freshly created automation —
      // the overlay is mounted at app root so the teacher can navigate
      // anywhere in the ERP while it runs.
      recorder.startRecording(a);
      navigate('/attendance');
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Failed to create automation';
      setError(message);
      toast.error(message);
    }
  };

  const handleRun = async (a: AutomationT) => {
    // Row-bound variables (filled per loop iteration from the row's data
    // attributes) should NOT be prompted from the user — they're populated
    // at run time. Strip them out before asking.
    const rowBound = new Set<string>();
    for (const step of a.steps) {
      for (const b of step.rowBindings ?? []) rowBound.add(b.name);
    }
    const askable = a.variables.filter(v => !rowBound.has(v.name));
    if (askable.length === 0) {
      await recorder.startPlayback(a, {});
      return;
    }
    // Quick variable prompt — full form lives on the detail page.
    const collected: Record<string, string> = {};
    for (const v of askable) {
      const val = window.prompt(`${v.label ?? v.name}:`, v.defaultValue ?? '');
      if (val === null) return;
      collected[v.name] = val;
    }
    await recorder.startPlayback(a, collected);
  };

  const handleEdit = (a: AutomationT) => navigate(`/automation/${a._id}`);

  const handleDelete = async (a: AutomationT) => {
    if (!window.confirm(`Delete automation "${a.name}"?`)) return;
    try {
      await api.deleteAutomation(a._id);
      toast.success(`Deleted "${a.name}"`);
      await refresh();
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Delete failed';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<Cpu size={18} />}
      pageTitle="Automation"
      pageBreadcrumb="Record · Edit · Run"
      pageActions={
        <button className="btn btn-primary btn-sm" onClick={handleCreateNew}>
          <Plus size={14} /> New Automation
        </button>
      }
    >
      {error && <div className="status-pill danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className={s.toolbar}>
        <div className={s.toolbarSearch}>
          <Search size={14} color="#64748B" />
          <input
            type="text"
            placeholder="Search automations…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {(['all', 'mine', 'shared'] as Filter[]).map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
          {visible.length} of {automations.length}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>Loading automations…</div>
      ) : visible.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyStateIcon}>
            <Cpu size={28} color="var(--primary, #0047FF)" />
          </div>
          <div className={s.emptyStateTitle}>
            {automations.length === 0 ? 'No automations yet' : 'No matches'}
          </div>
          <div className={s.emptyStateBody}>
            Record repetitive tasks once, replay them on demand. Pair with a row-loop to fan out across many students.
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleCreateNew}>
            <Plus size={14} /> Create your first automation
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem',
        }}>
          {visible.map(a => (
            <AutomationCard
              key={a._id}
              automation={a}
              currentUserId={userId}
              onRun={handleRun}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
};

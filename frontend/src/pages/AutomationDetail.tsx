import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Cpu, Play, Save, Trash2, Plus, RefreshCcw, ArrowLeft, CheckCircle2, AlertCircle,
  Circle, Variable, History, Share2, ListChecks, Settings2, Activity, GitBranch,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { AppLayout } from '../components/layout/AppLayout';
import { useRecorder } from '../lib/automation/recorder/RecorderContext';
import * as api from '../lib/automation/recorder/api';
import type {
  Automation, AutomationRun, AutomationVariable, IfCondition, RecordedStep,
} from '../lib/automation/recorder/types';
import { ApiError } from '../lib/api';

const inputStyle: React.CSSProperties = {
  border: '1px solid #E2E8F0', borderRadius: '0.4rem',
  padding: '0.4rem 0.6rem', fontSize: '0.8rem', outline: 'none',
  background: 'white', fontFamily: 'inherit', width: '100%',
};
const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.25rem',
  fontSize: '0.65rem', fontWeight: 700, color: '#475569',
  textTransform: 'uppercase', letterSpacing: '0.4px',
};

/** Compact stat block used in the AutomationDetail hero banner. */
const HeroStat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div style={{
    minWidth: 72,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '0.55rem',
    padding: '0.55rem 0.85rem',
    textAlign: 'center',
  }}>
    <div style={{
      fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.6px',
      color: '#BFDBFE', textTransform: 'uppercase',
    }}>
      {label}
    </div>
    <div style={{
      fontSize: '1.1rem', fontWeight: 800, marginTop: 2,
      color: tone ?? 'white',
    }}>
      {value}
    </div>
  </div>
);

/**
 * Colored section header used across the page so each card reads as its
 * own block (Details / Steps / Variables / Recent Runs) rather than a
 * flat stack of white boxes.
 */
const SectionHead: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accent: string;
  accentBg: string;
  right?: React.ReactNode;
}> = ({ icon, title, subtitle, accent, accentBg, right }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    paddingBottom: '0.9rem', marginBottom: '1rem',
    borderBottom: `1px solid ${accent}25`,
  }}>
    <div style={{
      width: 36, height: 36, borderRadius: '0.5rem',
      background: accentBg, color: accent,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.7px',
        color: accent, textTransform: 'uppercase',
      }}>
        Section
      </div>
      <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.25 }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
    {right && <div style={{ flexShrink: 0 }}>{right}</div>}
  </div>
);

const STEP_TYPE_LABEL: Record<RecordedStep['type'], string> = {
  click: 'Click', input: 'Type', change: 'Select',
  submit: 'Submit', navigate: 'Navigate', wait: 'Wait',
  keypress: 'Press Key', assert: 'Assert',
  'loop-start': 'Loop · For each row',
  'loop-end': 'End loop',
  'if-start': 'If · Condition',
  'else':     'Else',
  'if-end':   'End if',
};

/* Quick-pick row presets — extend as more pages get data-automation-row markup. */
const ROW_PRESETS: Array<{ label: string; rowSelector: string; bindings: { name: string; source: 'attr' | 'text' | 'index'; attr?: string; selector?: string }[] }> = [
  {
    label: 'AttendanceStudents — visible rows',
    rowSelector: '[data-automation-row]',
    bindings: [
      { name: 'studentId',  source: 'attr', attr: 'data-row-student-id' },
      { name: 'name',       source: 'attr', attr: 'data-row-name' },
      { name: 'rollNumber', source: 'attr', attr: 'data-row-roll' },
      { name: 'pct',        source: 'attr', attr: 'data-row-pct' },
      { name: 'email',      source: 'attr', attr: 'data-row-email' },
      { name: 'index',      source: 'index' },
    ],
  },
];

const uid = (): string =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;

export const AutomationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recorder = useRecorder();

  const [automation, setAutomation] = useState<Automation | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<RecordedStep[]>([]);
  const [variables, setVariables] = useState<AutomationVariable[]>([]);
  const [shared, setShared] = useState(false);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [showRunForm, setShowRunForm] = useState(false);

  const refresh = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [a, r] = await Promise.all([api.getAutomation(id), api.listRuns(id, 10)]);
      setAutomation(a);
      setName(a.name);
      setDescription(a.description ?? '');
      setSteps(a.steps);
      setVariables(a.variables);
      setShared(a.shared);
      setRuns(r);
      // Pre-fill variable values from defaults.
      const initial: Record<string, string> = {};
      for (const v of a.variables) initial[v.name] = v.defaultValue ?? '';
      setVarValues(initial);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load automation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [id]);

  // Sync steps from the recorder once recording finishes (in case the user
  // came back to this page after re-recording or live recording).
  useEffect(() => {
    if (recorder.recorderState === 'idle' && recorder.current?._id === id && recorder.steps.length > 0) {
      setSteps(recorder.steps);
    }
  }, [recorder.recorderState, recorder.current, recorder.steps, id]);

  /** Variables auto-bound from rows (via loop-start.rowBindings) — never
      prompt the user for these; they fill from row data each iteration. */
  const rowBoundVars = useMemo(() => {
    const set = new Set<string>();
    for (const step of steps) {
      for (const b of step.rowBindings ?? []) set.add(b.name);
    }
    return set;
  }, [steps]);

  const askableVariables = useMemo(
    () => variables.filter(v => !rowBoundVars.has(v.name)),
    [variables, rowBoundVars],
  );

  const dirty = useMemo(() => {
    if (!automation) return false;
    return JSON.stringify({ name, description, steps, variables, shared })
      !== JSON.stringify({
        name: automation.name,
        description: automation.description ?? '',
        steps: automation.steps,
        variables: automation.variables,
        shared: automation.shared,
      });
  }, [automation, name, description, steps, variables, shared]);

  /* ---------------- step editing ---------------- */

  const updateStep = (idx: number, patch: Partial<RecordedStep>) =>
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

  const deleteStep = (idx: number) =>
    setSteps(prev => prev.filter((_, i) => i !== idx));

  /**
   * Wrap step range [fromIdx..toIdx] inclusive in an if/else block.
   *
   * Sensible default for the attendance use-case: "if {{pct}} < 75 then …".
   * The user can edit the condition operands inline after wrapping. We do
   * NOT generate an `else` branch automatically — most workflows want the
   * "if true, take a remedial action; otherwise skip" shape.
   */
  const wrapInIf = (fromIdx: number, toIdx: number, withElse: boolean) => {
    const ifId = uid();
    const start: RecordedStep = {
      id: uid(),
      type: 'if-start',
      selectors: [],
      label: 'If pct < 75',
      condition: {
        source: 'variable',
        variable: 'pct',
        operator: '<',
        value: '75',
      },
      ifId,
    };
    const elseStep: RecordedStep = {
      id: uid(),
      type: 'else',
      selectors: [],
      label: 'Else',
      ifId,
    };
    const end: RecordedStep = {
      id: uid(),
      type: 'if-end',
      selectors: [],
      label: 'End if',
      ifId,
    };
    setSteps(prev => {
      const next: RecordedStep[] = [];
      prev.forEach((s, i) => {
        if (i === fromIdx) next.push(start);
        next.push(s);
        if (i === toIdx) {
          if (withElse) next.push(elseStep);
          next.push(end);
        }
      });
      return next;
    });
  };

  /** Wrap step range [fromIdx..toIdx] inclusive in a loop block. */
  const wrapInLoop = (fromIdx: number, toIdx: number, preset: typeof ROW_PRESETS[number]) => {
    const loopId = uid();
    const start: RecordedStep = {
      id: uid(),
      type: 'loop-start',
      selectors: [],
      label: `For each row in ${preset.label}`,
      rowSelector: preset.rowSelector,
      rowBindings: preset.bindings,
      loopId,
    };
    const end: RecordedStep = {
      id: uid(),
      type: 'loop-end',
      selectors: [],
      label: 'End loop',
      loopId,
    };
    setSteps(prev => {
      const next: RecordedStep[] = [];
      prev.forEach((s, i) => {
        if (i === fromIdx) next.push(start);
        next.push(s);
        if (i === toIdx) next.push(end);
      });
      return next;
    });
    // Auto-register the per-row variables so they show up in the variables panel.
    setVariables(prev => {
      const existing = new Set(prev.map(v => v.name));
      const additions: AutomationVariable[] = preset.bindings
        .filter(b => !existing.has(b.name))
        .map(b => ({ name: b.name, label: b.name, type: 'string', defaultValue: '' }));
      return [...prev, ...additions];
    });
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    setSteps(prev => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return next;
    });
  };

  const promoteToVariable = (idx: number) => {
    const step = steps[idx];
    if (!step) return;
    const suggested = step.value ?? step.visibleText ?? '';
    const varName = window.prompt(
      `Convert "${suggested}" into a reusable variable.\nVariable name (letters, digits, underscore):`,
      'myVar',
    );
    if (!varName || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
      if (varName) window.alert('Invalid variable name');
      return;
    }
    if (!variables.find(v => v.name === varName)) {
      setVariables(prev => [...prev, {
        name: varName,
        label: varName,
        type: 'string',
        defaultValue: suggested,
      }]);
    }
    // Replace the step value with the placeholder.
    updateStep(idx, { value: `{{${varName}}}` });
  };

  const reRecordStep = async (idx: number) => {
    if (!automation) return;
    if (!window.confirm(`Re-record step ${idx + 1}? Steps 1–${idx} will play first, then the recorder will turn on for you to perform the replacement action.`)) return;
    // Persist any pending edits before kicking off the play-then-record flow,
    // so the player runs against the latest steps.
    await save({ silent: true });
    const fresh = await api.getAutomation(automation._id);
    await recorder.reRecordStep(fresh, idx, varValues);
  };

  /* ---------------- variables ---------------- */

  const addVariable = () => {
    setVariables(prev => [...prev, { name: `var${prev.length + 1}`, label: '', type: 'string', defaultValue: '' }]);
  };
  const updateVariable = (idx: number, patch: Partial<AutomationVariable>) =>
    setVariables(prev => prev.map((v, i) => i === idx ? { ...v, ...patch } : v));
  const deleteVariable = (idx: number) =>
    setVariables(prev => prev.filter((_, i) => i !== idx));

  /* ---------------- save / run / delete ---------------- */

  const save = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!automation) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateAutomation(automation._id, {
        name, description, steps, variables, shared,
        status: steps.length > 0 ? 'ready' : 'draft',
      });
      setAutomation(updated);
      if (!silent) {
        window.dispatchEvent(new CustomEvent('automation-saved'));
        toast.success('Automation saved');
      }
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Save failed';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const run = async () => {
    if (!automation) return;
    if (askableVariables.length > 0 && !showRunForm) {
      setShowRunForm(true);
      return;
    }
    await save({ silent: true });
    const fresh = await api.getAutomation(automation._id);
    await recorder.startPlayback(fresh, varValues);
    setShowRunForm(false);
    void refresh();
  };

  const handleDelete = async () => {
    if (!automation) return;
    if (!window.confirm(`Delete "${automation.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteAutomation(automation._id);
      toast.success(`Deleted "${automation.name}"`);
      navigate('/automation');
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Delete failed';
      setError(message);
      toast.error(message);
    }
  };

  /* ---------------- render ---------------- */

  if (loading || !automation) {
    return (
      <AppLayout pageIcon={<Cpu size={18} />} pageTitle="Automation">
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>Loading…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<Cpu size={18} />}
      pageTitle={automation.name}
      pageBreadcrumb={
        <>
          <button onClick={() => navigate('/automation')}>
            <ArrowLeft size={12} style={{ marginRight: 4 }} /> Automation
          </button>
          <span> · </span>
          <span className="current">{automation.name}</span>
        </>
      }
      pageActions={
        <>
          {dirty && <span className="status-pill warn" style={{ fontSize: '0.625rem' }}>unsaved</span>}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => save()}
            disabled={!dirty || saving}
          >
            <Save size={12} /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={run}
            disabled={steps.length === 0}
          >
            <Play size={12} /> Run
          </button>
        </>
      }
    >
      {error && <div className="status-pill danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* HERO summary banner — at-a-glance status, step count, share state, last run. */}
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
          width: 48, height: 48, borderRadius: '0.65rem',
          background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Cpu size={22} color="#BFDBFE" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.7px',
            color: '#BFDBFE', textTransform: 'uppercase', marginBottom: 4,
          }}>
            Automation
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.2 }}>
            {automation.name}
          </div>
          {description && (
            <div style={{ fontSize: '0.82rem', color: '#CBD5E1', marginTop: 4, lineHeight: 1.4 }}>
              {description}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.85rem', flexShrink: 0 }}>
          <HeroStat label="Steps" value={String(steps.length)} />
          <HeroStat label="Variables" value={String(variables.length)} />
          <HeroStat label="Runs" value={String(runs.length)} />
          <HeroStat
            label="Sharing"
            value={shared ? 'Shared' : 'Private'}
            tone={shared ? '#34D399' : '#FBBF24'}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', alignItems: 'flex-start' }}>
        {/* LEFT — meta + steps */}
        <div className="stack-md">
          <div className="card">
            <SectionHead
              icon={<Settings2 size={18} />}
              title="Details"
              subtitle="Name, description, and visibility for this automation"
              accent="#2563EB"
              accentBg="#EFF6FF"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label style={labelStyle}>
                Name
                <input type="text" style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
              </label>
              <label style={labelStyle}>
                Sharing
                <select style={inputStyle} value={shared ? 'shared' : 'private'} onChange={e => setShared(e.target.value === 'shared')}>
                  <option value="private">Private</option>
                  <option value="shared">Shared with all teachers</option>
                </select>
              </label>
              <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
                Description
                <textarea
                  style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="What does this automation do?"
                />
              </label>
            </div>
          </div>

          <div className="card">
            <SectionHead
              icon={<ListChecks size={18} />}
              title="Steps"
              subtitle="Captured actions replayed in order — drag, edit, or re-record any step"
              accent="#7C3AED"
              accentBg="#F3E8FF"
              right={
                <span style={{
                  background: '#F1F5F9', color: '#475569',
                  fontSize: '0.7rem', fontWeight: 800,
                  padding: '0.2rem 0.6rem', borderRadius: '999px',
                }}>
                  {steps.length} total
                </span>
              }
            />

            {steps.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                No steps yet. Click <strong>Re-record</strong> below to capture some, or use <strong>New Automation</strong> on the dashboard to start fresh.
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => recorder.startRecording(automation)}
                  >
                    <Circle size={12} color="#EF4444" /> Start Recording
                  </button>
                </div>
              </div>
            ) : (
              <div className="stack-sm">
                {steps.map((s, idx) => (
                  <StepRow
                    key={s.id}
                    index={idx}
                    step={s}
                    isLast={idx === steps.length - 1}
                    onChange={patch => updateStep(idx, patch)}
                    onDelete={() => deleteStep(idx)}
                    onMove={dir => moveStep(idx, dir)}
                    onPromote={() => promoteToVariable(idx)}
                    onReRecord={() => void reRecordStep(idx)}
                  />
                ))}
              </div>
            )}

            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => recorder.startRecording(automation)}
                disabled={recorder.recorderState !== 'idle'}
              >
                <Circle size={12} color="#EF4444" /> Re-record (append)
              </button>
              {steps.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const fromStr = window.prompt(`Wrap a range in a row-loop.\nFirst step number to include (1–${steps.length}):`, '1');
                    if (!fromStr) return;
                    const toStr = window.prompt(`Last step number to include (1–${steps.length}):`, String(steps.length));
                    if (!toStr) return;
                    const fromIdx = parseInt(fromStr, 10) - 1;
                    const toIdx = parseInt(toStr, 10) - 1;
                    if (Number.isNaN(fromIdx) || Number.isNaN(toIdx) || fromIdx < 0 || toIdx >= steps.length || fromIdx > toIdx) {
                      window.alert('Invalid range');
                      return;
                    }
                    const preset = ROW_PRESETS[0]!;
                    wrapInLoop(fromIdx, toIdx, preset);
                  }}
                >
                  <Variable size={12} /> Wrap range in row-loop
                </button>
              )}
              {steps.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const fromStr = window.prompt(
                      `Wrap a range in an IF block.\n\n` +
                      `Use case (attendance): inside a row-loop over students,\n` +
                      `wrap the "send warning email" steps so they only run when\n` +
                      `{{pct}} < 75. You can flip the condition after wrapping.\n\n` +
                      `First step number to include (1–${steps.length}):`,
                      '1',
                    );
                    if (!fromStr) return;
                    const toStr = window.prompt(`Last step number to include (1–${steps.length}):`, String(steps.length));
                    if (!toStr) return;
                    const fromIdx = parseInt(fromStr, 10) - 1;
                    const toIdx = parseInt(toStr, 10) - 1;
                    if (Number.isNaN(fromIdx) || Number.isNaN(toIdx) || fromIdx < 0 || toIdx >= steps.length || fromIdx > toIdx) {
                      window.alert('Invalid range');
                      return;
                    }
                    const withElse = window.confirm('Add an else branch? OK = yes, Cancel = no.');
                    wrapInIf(fromIdx, toIdx, withElse);
                  }}
                >
                  <GitBranch size={12} /> Wrap range in if/else
                </button>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleDelete}
                style={{ marginLeft: 'auto' }}
              >
                <Trash2 size={12} color="#EF4444" /> Delete Automation
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — variables + run history */}
        <div className="stack-md">
          <div className="card">
            <SectionHead
              icon={<Variable size={18} />}
              title="Variables"
              subtitle="Reusable placeholders for step values"
              accent="#F59E0B"
              accentBg="#FEF3C7"
              right={
                <button className="btn btn-secondary btn-sm btn-icon-only" onClick={addVariable} title="Add variable">
                  <Plus size={12} />
                </button>
              }
            />
            {variables.length === 0 ? (
              <div style={{ padding: '0.75rem 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                Convert step values to <code>{`{{var}}`}</code> placeholders to make this automation reusable.
              </div>
            ) : (
              <div className="stack-sm">
                {variables.map((v, idx) => (
                  <div key={idx} style={{
                    border: '1px solid #E2E8F0', borderRadius: 8, padding: '0.5rem',
                    display: 'flex', flexDirection: 'column', gap: '0.4rem',
                  }}>
                    <input
                      type="text" style={inputStyle} value={v.name}
                      onChange={e => updateVariable(idx, { name: e.target.value })}
                      placeholder="varName"
                    />
                    <input
                      type="text" style={inputStyle} value={v.label ?? ''}
                      onChange={e => updateVariable(idx, { label: e.target.value })}
                      placeholder="Display label"
                    />
                    <input
                      type="text" style={inputStyle} value={v.defaultValue ?? ''}
                      onChange={e => updateVariable(idx, { defaultValue: e.target.value })}
                      placeholder="Default value"
                    />
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => deleteVariable(idx)}
                      style={{ alignSelf: 'flex-end' }}
                    >
                      <Trash2 size={11} color="#EF4444" /> Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showRunForm && askableVariables.length > 0 && (
            <div className="card" style={{ border: '2px solid var(--primary)' }}>
              <SectionHead
                icon={<Activity size={18} />}
                title="Run with values"
                subtitle="Fill the variables, then click Run"
                accent="var(--primary)"
                accentBg="#EFF6FF"
              />
              {askableVariables.map(v => (
                <label key={v.name} style={{ ...labelStyle, marginBottom: '0.5rem' }}>
                  {v.label || v.name}
                  <input
                    type={v.type === 'number' ? 'number' : 'text'} style={inputStyle}
                    value={varValues[v.name] ?? ''}
                    onChange={e => setVarValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                  />
                </label>
              ))}
              <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                Row-bound variables ({rowBoundVars.size > 0 ? Array.from(rowBoundVars).map(n => `{{${n}}}`).join(', ') : 'none'}) are filled automatically per row.
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowRunForm(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={() => void run()}>
                  <Play size={12} /> Run
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <SectionHead
              icon={<History size={18} />}
              title="Recent Runs"
              subtitle="Last 10 playback results"
              accent="#10B981"
              accentBg="#D1FAE5"
              right={
                <button className="btn btn-secondary btn-sm btn-icon-only" onClick={() => void refresh()} title="Refresh">
                  <RefreshCcw size={12} />
                </button>
              }
            />
            {runs.length === 0 ? (
              <div style={{ padding: '1rem 0', fontSize: '0.78rem', color: '#94A3B8', textAlign: 'center' }}>
                No runs yet — click <strong>Run</strong> above to see history here.
              </div>
            ) : (
              <div className="stack-sm">
                {runs.map(r => {
                  const passed = r.stepResults.filter(s => s.status === 'success').length;
                  const ok = r.status === 'success';
                  return (
                    <div key={r._id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.65rem',
                      padding: '0.6rem 0.75rem', borderRadius: 8,
                      background: ok ? '#F0FDF4' : '#FEF2F2',
                      border: `1px solid ${ok ? '#BBF7D0' : '#FECACA'}`,
                    }}>
                      {ok ? <CheckCircle2 size={16} color="#10B981" /> : <AlertCircle size={16} color="#EF4444" />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>
                          {passed}/{r.stepResults.length} steps
                          <span style={{
                            marginLeft: 6,
                            fontSize: '0.62rem', fontWeight: 800,
                            color: ok ? '#15803D' : '#B91C1C',
                            background: ok ? '#DCFCE7' : '#FEE2E2',
                            padding: '0.1rem 0.4rem', borderRadius: '999px',
                            textTransform: 'uppercase', letterSpacing: '0.4px',
                          }}>
                            {r.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 2 }}>
                          {new Date(r.startedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {shared && (
            <div className="status-pill info" style={{ fontSize: '0.65rem' }}>
              <Share2 size={11} style={{ marginRight: 4, verticalAlign: '-1px' }} />
              Visible to all teachers
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

/* ----------------------------------------------------------------------
 *  Step row — inline editor for a single step.
 * ------------------------------------------------------------------- */

interface StepRowProps {
  index: number;
  step: RecordedStep;
  isLast: boolean;
  onChange: (patch: Partial<RecordedStep>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onPromote: () => void;
  onReRecord: () => void;
}

const StepRow: React.FC<StepRowProps> = ({ index, step, isLast, onChange, onDelete, onMove, onPromote, onReRecord }) => {
  const [open, setOpen] = useState(false);
  const editable = step.type === 'input' || step.type === 'change' || step.type === 'navigate' || step.type === 'wait';
  const isLoop = step.type === 'loop-start' || step.type === 'loop-end';
  const isIf = step.type === 'if-start' || step.type === 'else' || step.type === 'if-end';
  const isControlFlow = isLoop || isIf;
  return (
    <div style={{
      border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden',
      background:
        isLoop ? '#FEFCE8'
        : isIf  ? '#EFF6FF'
        : 'white',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem',
          cursor: 'pointer', background: open ? '#F8FAFC' : 'transparent',
        }}
      >
        <span style={{ fontSize: '0.7rem', color: '#94A3B8', minWidth: 22 }}>{index + 1}</span>
        <span style={{
          fontSize: '0.65rem', fontWeight: 800,
          color: '#0F172A', textTransform: 'uppercase',
          background: '#F1F5F9', padding: '0.15rem 0.4rem', borderRadius: 4,
        }}>
          {STEP_TYPE_LABEL[step.type]}
        </span>
        <span style={{
          fontSize: '0.75rem', color: '#475569', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {step.label || step.visibleText || step.value || step.url || step.tagName || '—'}
        </span>
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '0.2rem' }}>
          <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => onMove(-1)} disabled={index === 0} title="Move up">↑</button>
          <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => onMove(1)} disabled={isLast} title="Move down">↓</button>
          {!isControlFlow && (
            <button className="btn btn-secondary btn-icon-only btn-sm" onClick={onReRecord} title="Re-record this step">
              <Circle size={11} color="#EF4444" />
            </button>
          )}
          <button className="btn btn-secondary btn-icon-only btn-sm" onClick={onDelete} title="Delete step">
            <Trash2 size={11} color="#EF4444" />
          </button>
        </div>
      </div>
      {open && step.type === 'loop-start' && (
        <div style={{ padding: '0.75rem', borderTop: '1px solid #FDE68A', background: '#FFFBEB', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={labelStyle}>
            Row Selector (CSS)
            <input
              type="text" style={inputStyle} value={step.rowSelector ?? ''}
              onChange={e => onChange({ rowSelector: e.target.value })}
              placeholder="[data-automation-row]"
            />
          </label>
          <div style={{ fontSize: '0.7rem', color: '#92400E' }}>
            <strong>Per-row variables:</strong>{' '}
            {(step.rowBindings ?? []).map(b => (
              <code key={b.name} style={{ marginRight: 8, padding: '0.1rem 0.35rem', background: '#FEF3C7', borderRadius: 4, fontSize: '0.7rem' }}>
                {`{{${b.name}}}`} ← {b.source}{b.attr ? `:${b.attr}` : ''}{b.selector ? ` ${b.selector}` : ''}
              </code>
            ))}
          </div>
        </div>
      )}
      {open && step.type === 'if-start' && (
        <IfConditionEditor
          condition={step.condition}
          onChange={(condition) => onChange({ condition })}
        />
      )}
      {open && !isControlFlow && (
        <div style={{ padding: '0.75rem', borderTop: '1px solid #F1F5F9', background: '#FAFBFC', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <label style={labelStyle}>
            Label (optional)
            <input
              type="text" style={inputStyle} value={step.label ?? ''}
              onChange={e => onChange({ label: e.target.value })}
              placeholder="Friendly description"
            />
          </label>
          <label style={labelStyle}>
            Visible text
            <input
              type="text" style={inputStyle} value={step.visibleText ?? ''}
              onChange={e => onChange({ visibleText: e.target.value })}
              placeholder="Text that should be visible"
            />
          </label>
          {editable && (
            <label style={{ ...labelStyle, gridColumn: step.type === 'navigate' ? '1 / -1' : 'auto' }}>
              {step.type === 'navigate' ? 'Path' : step.type === 'wait' ? 'Wait (ms)' : 'Value'}
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input
                  type="text"
                  style={inputStyle}
                  value={(step.type === 'navigate' ? step.url : step.value) ?? ''}
                  onChange={e => onChange(step.type === 'navigate' ? { url: e.target.value } : { value: e.target.value })}
                  placeholder={step.type === 'wait' ? '500' : 'Value or {{variable}}'}
                />
                {(step.type === 'input' || step.type === 'change') && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onPromote}
                    title="Convert this value into a variable"
                  >
                    <Variable size={11} /> Var
                  </button>
                )}
              </div>
            </label>
          )}
          <label style={labelStyle}>
            Pre-wait (ms)
            <input
              type="number" min={0} style={inputStyle} value={step.preWaitMs ?? 0}
              onChange={e => onChange({ preWaitMs: Number(e.target.value) || 0 })}
            />
          </label>
          <label style={labelStyle}>
            Post-wait (ms)
            <input
              type="number" min={0} style={inputStyle} value={step.postWaitMs ?? 0}
              onChange={e => onChange({ postWaitMs: Number(e.target.value) || 0 })}
            />
          </label>
          <div style={{ gridColumn: '1 / -1', fontSize: '0.65rem', color: '#94A3B8' }}>
            Selectors ({step.selectors.length}): {step.selectors.map(s => s.kind).join(' → ') || 'none'}
          </div>
        </div>
      )}
    </div>
  );
};

/* ----------------------------------------------------------------------
 *  If-condition editor — drives the `if-start` block.
 *
 *  Defaults to a variable comparison so the attendance use-case works
 *  out of the box: source=variable, variable=pct, operator='<', value=75
 *  ⇒ "if {{pct}} < 75 then run the inner steps".
 * ------------------------------------------------------------------- */
const IfConditionEditor: React.FC<{
  condition?: IfCondition;
  onChange: (c: IfCondition) => void;
}> = ({ condition, onChange }) => {
  const c: IfCondition = condition ?? { source: 'variable', operator: '==', value: '' };

  const update = (patch: Partial<IfCondition>) => onChange({ ...c, ...patch });
  const isElementCheck = c.source === 'element-text' || c.source === 'element-exists';

  return (
    <div style={{
      padding: '0.85rem', borderTop: '1px solid #BFDBFE',
      background: '#F5F9FF',
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.55rem',
    }}>
      <label style={labelStyle}>
        Source
        <select
          style={inputStyle}
          value={c.source}
          onChange={e => update({ source: e.target.value as IfCondition['source'] })}
        >
          <option value="variable">Variable</option>
          <option value="element-text">Element text</option>
          <option value="element-exists">Element exists</option>
        </select>
      </label>
      {c.source === 'variable' ? (
        <label style={labelStyle}>
          Variable
          <input
            type="text" style={inputStyle} value={c.variable ?? ''}
            onChange={e => update({ variable: e.target.value })}
            placeholder="e.g. pct"
          />
        </label>
      ) : (
        <label style={labelStyle}>
          Selector (CSS)
          <input
            type="text" style={inputStyle} value={c.selector ?? ''}
            onChange={e => update({ selector: e.target.value })}
            placeholder=".at-risk"
          />
        </label>
      )}
      <label style={labelStyle}>
        Operator
        <select
          style={inputStyle}
          value={c.operator}
          onChange={e => update({ operator: e.target.value as IfCondition['operator'] })}
        >
          {c.source === 'element-exists' ? (
            <>
              <option value="exists">exists</option>
              <option value="not-exists">does NOT exist</option>
            </>
          ) : (
            <>
              <option value="==">== (equals)</option>
              <option value="!=">!= (not equal)</option>
              <option value="<">&lt; (less than)</option>
              <option value="<=">&lt;= (at most)</option>
              <option value=">">&gt; (greater than)</option>
              <option value=">=">&gt;= (at least)</option>
              <option value="contains">contains</option>
              <option value="not-contains">does NOT contain</option>
            </>
          )}
        </select>
      </label>
      {c.source !== 'element-exists' && (
        <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
          Compared against
          <input
            type="text" style={inputStyle} value={c.value ?? ''}
            onChange={e => update({ value: e.target.value })}
            placeholder="75"
          />
        </label>
      )}
      <div style={{ gridColumn: '1 / -1', fontSize: '0.7rem', color: '#1E3A8A', background: '#DBEAFE', padding: '0.5rem 0.7rem', borderRadius: 5, lineHeight: 1.4 }}>
        <strong>Attendance use-case:</strong> wrap this block inside a row-loop over the AttendanceStudents
        roster, then check <code>{`{{pct}} < 75`}</code> to run the "send warning email" steps only for
        at-risk students. Switch to <em>Element text</em> to read a DOM value such as the row's badge.
        {isElementCheck && c.source === 'element-text' && (
          <div style={{ marginTop: 4 }}>
            <em>Element text</em> reads <code>textContent</code> from the matched selector — strip
            any unit (<code>%, $</code>) in your comparison value, or use <em>contains</em>.
          </div>
        )}
      </div>
    </div>
  );
};

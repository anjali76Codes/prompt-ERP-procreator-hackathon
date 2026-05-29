import React, { useEffect, useRef, useState } from 'react';
import {
  Circle, Pause, Play, Square, Save, X, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Loader, Repeat,
} from 'lucide-react';
import { useRecorder } from '../../../lib/automation/recorder/RecorderContext';
import s from './automation.module.css';

const StepIcon: React.FC<{ status?: 'pending' | 'running' | 'success' | 'failed' | 'skipped' }> = ({ status }) => {
  switch (status) {
    case 'running': return <Loader size={12} color="var(--primary, #0047FF)" className="spin" />;
    case 'success': return <CheckCircle2 size={12} color="#10B981" />;
    case 'failed':  return <AlertCircle size={12} color="#EF4444" />;
    default:        return <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#CBD5E1', display: 'inline-block' }} />;
  }
};

const STORAGE_KEY = 'automation.overlay.pos';

interface Position { x: number; y: number }

const loadPos = (): Position => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { x: window.innerWidth - 400, y: 100 };
};

export const RecorderOverlay: React.FC = () => {
  const r = useRecorder();
  const [pos, setPos] = useState<Position>(loadPos);
  const [collapsed, setCollapsed] = useState(false);
  const dragOffset = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
  }, [pos]);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [r.steps.length]);

  const visible = r.recorderState !== 'idle' || r.playerState === 'playing';
  if (!visible) return null;

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!dragOffset.current) return;
    const nx = Math.max(8, Math.min(window.innerWidth - 380, e.clientX - dragOffset.current.x));
    const ny = Math.max(8, Math.min(window.innerHeight - 80,  e.clientY - dragOffset.current.y));
    setPos({ x: nx, y: ny });
  };
  const onMouseUp = () => {
    dragOffset.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  const recording = r.recorderState === 'recording';
  const paused    = r.recorderState === 'paused';
  const playing   = r.playerState === 'playing';
  const mode = recording || paused ? 'record' : 'play';

  const dotClass =
    recording ? s.recording
    : paused  ? s.paused
    : playing ? s.playing
    : s.idle;
  const headerLabel =
    recording ? 'RECORDING'
    : paused  ? 'PAUSED'
    : playing ? 'PLAYING'
    : 'IDLE';

  return (
    <div
      data-recorder-overlay
      className={s.overlayShell}
      style={{ top: pos.y, left: pos.x }}
    >
      <div className={s.overlayHeader} onMouseDown={onHeaderMouseDown}>
        <div className={s.overlayHeaderLeft}>
          <span className={`${s.overlayDot} ${dotClass}`} />
          <span className={s.overlayLabel}>{headerLabel}</span>
          <span className={s.overlayName}>· {r.current?.name ?? '—'}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.2rem' }}>
          <button
            onClick={() => setCollapsed(c => !c)}
            className={s.iconBtn}
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {mode === 'record' && (
            <button onClick={() => r.cancelRecording()} className={s.iconBtn} title="Cancel recording (discard)">
              <X size={14} />
            </button>
          )}
          {mode === 'play' && (
            <button onClick={() => r.stopPlayback()} className={s.iconBtn} title="Stop playback">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {!collapsed && r.loopInfo && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: 'linear-gradient(90deg, rgba(0, 74, 198, 0.08) 0%, rgba(37, 99, 235, 0.04) 100%)',
            borderBottom: '1px solid rgba(0, 74, 198, 0.18)',
            color: 'var(--primary, #004ac6)',
            fontWeight: 700, fontSize: '0.72rem',
          }}
        >
          <Repeat size={14} className="spin" style={{ animation: 'spin 2s linear infinite' }} />
          <span>
            Looping — iteration <strong>{r.loopInfo.iteration}</strong> of <strong>{r.loopInfo.total}</strong>
            {r.loopInfo.rowSelector && (
              <span style={{ color: '#64748B', fontWeight: 500, marginLeft: 4 }}>
                ({r.loopInfo.rowSelector})
              </span>
            )}
          </span>
        </div>
      )}

      {!collapsed && (
        <>
          <div className={s.overlayToolbar}>
            {mode === 'record' && recording && (
              <button className="btn btn-secondary btn-sm" onClick={r.pauseRecording}>
                <Pause size={12} /> Pause
              </button>
            )}
            {mode === 'record' && paused && (
              <button className="btn btn-primary btn-sm" onClick={r.resumeRecording}>
                <Play size={12} /> Resume
              </button>
            )}
            {mode === 'record' && (
              <button
                className="btn btn-primary btn-sm"
                onClick={r.stopRecording}
                disabled={r.steps.length === 0}
                style={{ marginLeft: 'auto' }}
              >
                <Save size={12} /> Save
              </button>
            )}
            {mode === 'record' && (
              <button className="btn btn-secondary btn-sm" onClick={r.cancelRecording} title="Discard">
                <Square size={12} /> Discard
              </button>
            )}
            {mode === 'play' && (
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Step-by-step replay of <strong>{r.current?.name}</strong> · ✕ to abort
              </span>
            )}
          </div>

          <div ref={listRef} className={s.overlayBody}>
            {r.steps.length === 0 && (
              <div className={s.overlayEmpty}>
                <Circle size={22} color="#EF4444" style={{ marginBottom: 8 }} />
                <div>Click, type, navigate — every action is captured below.</div>
              </div>
            )}
            {r.steps.map((step, idx) => {
              const pb = r.playbackState[step.id];
              const stateClass =
                pb?.status === 'running' ? s.running
                : pb?.status === 'success' ? s.success
                : pb?.status === 'failed' ? s.failed
                : '';
              const isLoop = step.type === 'loop-start' || step.type === 'loop-end';
              return (
                <div key={step.id} className={`${s.overlayStep} ${stateClass}`}>
                  <StepIcon status={pb?.status} />
                  <span className={s.overlayStepNum}>{idx + 1}</span>
                  <span className={`${s.overlayStepType} ${isLoop ? s.loop : ''}`}>
                    {step.type.replace('-', ' ')}
                  </span>
                  <span className={s.overlayStepBody}>
                    {step.visibleText || step.value || step.url || step.label || step.tagName || '—'}
                  </span>
                  {mode === 'record' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); r.removeStep(step.id); }}
                      className={`${s.iconBtn} ${s.dark}`}
                      title="Remove step"
                    >
                      <Trash2 size={12} color="#EF4444" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {r.logs.length > 0 && mode === 'play' && (
            <div className={s.overlayLogs}>
              {r.logs.slice(-6).map((l, i) => (
                <div key={i} className={`${s.overlayLog} ${l.level === 'warn' ? s.warn : l.level === 'error' ? s.error : ''}`}>
                  {l.message}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

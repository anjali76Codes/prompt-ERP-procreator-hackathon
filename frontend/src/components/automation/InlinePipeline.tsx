/**
 * Compact pipeline card rendered INSIDE an AI message bubble. Same step
 * semantics as `WorkflowPipeline` but without the header / PAUSE / DEPLOY
 * controls — chat history is read-only, not a control surface.
 */
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Workflow } from '../../lib/automation/types';
import { STEP_ICON } from '../../lib/automation/engine';

const STATUS_PILL: Record<string, { label: string; bg: string; color: string }> = {
  queued:    { label: 'QUEUED',     bg: '#F1F5F9', color: '#64748B' },
  running:   { label: 'PROCESSING', bg: '#FEF3C7', color: '#92400E' },
  completed: { label: 'COMPLETED',  bg: '#DCFCE7', color: '#15803D' },
  failed:    { label: 'FAILED',     bg: '#FEE2E2', color: '#B91C1C' },
  skipped:   { label: 'SKIPPED',    bg: '#F1F5F9', color: '#94A3B8' },
};

interface Props {
  workflow: Workflow;
}

export const InlinePipeline: React.FC<Props> = ({ workflow }) => {
  const [expanded, setExpanded] = React.useState(true);
  const steps = workflow.steps;
  if (steps.length === 0) return null;

  return (
    <div style={{
      background: '#FAFBFC',
      border: '1px solid #E2E8F0',
      borderRadius: '0.65rem',
      padding: '0.55rem 0.7rem',
    }}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '0.4rem',
          background: 'transparent', border: 'none', padding: 0,
          cursor: 'pointer',
          fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.6px',
          color: '#475569', textTransform: 'uppercase',
        }}
      >
        <span>Automation pipeline — {steps.length} step{steps.length === 1 ? '' : 's'}</span>
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>

      {expanded && (
        <div style={{ marginTop: '0.7rem', display: 'flex', flexDirection: 'column' }}>
          {steps.map((step, idx) => {
            const pill = STATUS_PILL[step.status] ?? STATUS_PILL.queued;
            const isLast = idx === steps.length - 1;
            const isProcessing = step.status === 'running';
            const isCompleted = step.status === 'completed';
            // Bordered step box. Processing → blue accent, completed → green tint,
            // queued/failed/skipped → neutral.
            const boxBorder = isProcessing ? '2px solid var(--primary)'
              : isCompleted ? '1px solid #BBF7D0'
              : '1px solid #E2E8F0';
            const boxBg = isProcessing ? '#F5F9FF'
              : isCompleted ? '#FFFFFF'
              : '#FFFFFF';
            return (
              <div key={step.id} style={{ display: 'flex', gap: '0.7rem', alignItems: 'stretch' }}>
                {/* Icon column with vertical connector rail */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  flexShrink: 0, width: 32,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '0.45rem',
                    background: step.iconBg ?? (isCompleted ? '#DCFCE7' : '#EFF6FF'),
                    color: step.color ?? (isCompleted ? '#15803D' : 'var(--primary)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: isProcessing ? '0 0 0 3px rgba(0, 74, 198, 0.15)' : 'none',
                    transition: 'box-shadow 0.2s',
                  }}>
                    {React.isValidElement(STEP_ICON[step.kind])
                      ? React.cloneElement(STEP_ICON[step.kind] as React.ReactElement<{ size?: number }>, { size: 16 })
                      : null}
                  </div>
                  {!isLast && (
                    <div style={{
                      width: 2, flex: 1,
                      minHeight: 18,
                      background: isCompleted ? '#10B981' : '#CBD5E1',
                      marginTop: 4,
                      marginBottom: 4,
                      borderRadius: 1,
                    }} />
                  )}
                </div>

                {/* Step body — bordered card */}
                <div style={{
                  flex: 1, minWidth: 0,
                  marginBottom: isLast ? 0 : '0.55rem',
                  border: boxBorder,
                  background: boxBg,
                  borderRadius: '0.55rem',
                  padding: '0.65rem 0.85rem',
                  boxShadow: isProcessing ? '0 2px 10px rgba(0, 74, 198, 0.08)' : 'none',
                  transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}>
                    <div style={{
                      fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.5px',
                      color: step.color ?? 'var(--primary)',
                      textTransform: 'uppercase',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      Step {String(idx + 1).padStart(2, '0')}: {step.label}
                    </div>
                    <span style={{
                      flexShrink: 0,
                      padding: '0.18rem 0.55rem',
                      background: pill.bg, color: pill.color,
                      borderRadius: '999px',
                      fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.4px',
                    }}>
                      {pill.label}
                    </span>
                  </div>
                  {step.description && (
                    <div style={{
                      fontSize: '0.78rem', color: '#475569', marginTop: '0.3rem',
                      lineHeight: 1.45,
                    }}>
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

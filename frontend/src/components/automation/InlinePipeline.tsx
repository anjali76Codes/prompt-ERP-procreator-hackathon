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
        <div style={{ marginTop: '0.55rem', display: 'flex', flexDirection: 'column' }}>
          {steps.map((step, idx) => {
            const pill = STATUS_PILL[step.status] ?? STATUS_PILL.queued;
            const isLast = idx === steps.length - 1;
            return (
              <div key={step.id} style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start' }}>
                {/* Icon column with vertical connector */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '0.4rem',
                    background: step.iconBg ?? '#EFF6FF',
                    color: step.color ?? 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {React.isValidElement(STEP_ICON[step.kind])
                      ? React.cloneElement(STEP_ICON[step.kind] as React.ReactElement<{ size?: number }>, { size: 14 })
                      : null}
                  </div>
                  {!isLast && (
                    <div style={{
                      width: 1, flex: 1,
                      minHeight: 16,
                      background: '#E2E8F0',
                    }} />
                  )}
                </div>

                {/* Step body */}
                <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : '0.7rem' }}>
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
                      padding: '0.15rem 0.5rem',
                      background: pill.bg, color: pill.color,
                      borderRadius: '999px',
                      fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.4px',
                    }}>
                      {pill.label}
                    </span>
                  </div>
                  {step.description && (
                    <div style={{
                      fontSize: '0.78rem', color: '#475569', marginTop: '0.15rem',
                      lineHeight: 1.4,
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

import React from 'react';
import { Cpu, Play, Pause } from 'lucide-react';
import s from './Automation.module.css';
import type { Workflow } from '../../lib/automation/types';
import { STEP_ICON } from '../../lib/automation/engine';

interface Props {
  workflow: Workflow;
  isPaused: boolean;
  onTogglePause: () => void;
  onDeploy: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  queued:    'QUEUED',
  running:   'PROCESSING...',
  completed: 'COMPLETED',
  failed:    'FAILED',
  skipped:   'SKIPPED',
};

export const WorkflowPipeline: React.FC<Props> = ({ workflow, isPaused, onTogglePause, onDeploy }) => {
  // Show every step that has started, plus the leading edge so the next step is hinted.
  const statuses = workflow.steps.map(st => st.status);
  const lastActiveIdx = Math.max(
    0,
    statuses.lastIndexOf('running'),
    statuses.lastIndexOf('completed'),
  );
  const stepsToRender = workflow.steps.slice(0, lastActiveIdx + 1);

  return (
    <div className={s.pipelineCard}>
      <div className={s.pipelineHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Cpu size={20} color="var(--primary)" />
          <h3 className={s.pipelineTitle}>Automation Pipeline</h3>
        </div>
        <div className={s.pipelineActions}>
          <button className="btn btn-secondary btn-sm" onClick={onTogglePause}>
            {isPaused ? <Play size={10} fill="currentColor" /> : <Pause size={10} fill="currentColor" />}
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={onDeploy}>
            DEPLOY TO ERP
          </button>
        </div>
      </div>

      <div className={s.pipelineBody}>
        {stepsToRender.map((step, idx) => {
          const previous = idx > 0 ? stepsToRender[idx - 1] : null;
          const isProcessing = step.status === 'running';
          const isCompleted  = step.status === 'completed';
          const rowClass = `${s.stepRow} ${isProcessing ? s.processing : ''} ${isCompleted ? s.completed : ''}`;

          return (
            <React.Fragment key={step.id}>
              {previous && (
                <div className={`${s.connector} ${previous.status === 'completed' ? s.done : ''}`} />
              )}
              <div className={rowClass}>
                <div
                  className={s.stepIcon}
                  style={{
                    backgroundColor: step.iconBg ?? '#EFF6FF',
                    color: step.color ?? 'var(--primary)',
                  }}
                >
                  {STEP_ICON[step.kind] ?? null}
                </div>
                <div className={s.stepBody}>
                  <div className={s.stepHeader}>
                    <span className={s.stepLabel} style={{ color: step.color ?? 'var(--primary)' }}>
                      STEP {String(idx + 1).padStart(2, '0')}: {step.label}
                    </span>
                    <span className={`${s.stepStatus} ${s[step.status]}`}>
                      {isProcessing && (
                        <span className={s.loaderBars}>
                          <span className={s.loaderBar} />
                          <span className={s.loaderBar} />
                          <span className={s.loaderBar} />
                        </span>
                      )}
                      {STATUS_LABEL[step.status]}
                    </span>
                  </div>
                  <p className={`${s.stepDesc} ${isProcessing ? s.processing : ''}`}>
                    {step.description}
                  </p>
                  {step.detail && typeof step.detail === 'string' ? (
                    <div className={s.stepCode}>{step.detail}</div>
                  ) : step.detail}
                  {step.tags && step.tags.length > 0 && (
                    <div className={s.stepTags}>
                      {step.tags.map(t => (
                        <span
                          key={t.text}
                          className={s.stepTag}
                          style={{ border: `1px solid ${t.borderColor}`, color: t.borderColor }}
                        >
                          {t.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

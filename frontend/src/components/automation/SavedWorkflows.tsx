import React from 'react';
import { Library, ChevronRight } from 'lucide-react';
import s from './Automation.module.css';
import type { WorkflowTemplate } from '../../lib/automation/types';

interface Props {
  templates: WorkflowTemplate[];
  split: boolean;
  onRun: (id: string) => void;
}

const relativeTime = (ts?: number) => {
  if (!ts) return 'Never run';
  const diff = Date.now() - ts;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return 'Today';
  if (diff < 2 * day) return 'Yesterday';
  return `${Math.floor(diff / day)}d ago`;
};

export const SavedWorkflows: React.FC<Props> = ({ templates, split, onRun }) => (
  <div className={`${s.templates} ${split ? s.split : s.full}`}>
    <div className={s.templatesHeader}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Library size={14} color="var(--primary)" />
        <span className={s.templatesTitle}>Saved Workflows</span>
      </div>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>
        {templates.length} reusable templates
      </span>
    </div>

    <div className={s.templatesGrid}>
      {templates.slice(0, 4).map(tpl => (
        <button
          key={tpl.id}
          type="button"
          className={s.templateCard}
          onClick={() => onRun(tpl.id)}
          title={`Run "${tpl.name}"`}
        >
          <h4 className={s.templateName}>{tpl.name}</h4>
          <p className={s.templateDesc}>{tpl.description}</p>
          <div className={s.templateTags}>
            {tpl.tags.slice(0, 3).map(t => (
              <span key={t} className={s.templateTag}>{t}</span>
            ))}
          </div>
          <div className={s.templateMeta}>
            <span>{tpl.runCount} runs • {relativeTime(tpl.lastRunAt)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--primary)' }}>
              RUN <ChevronRight size={11} />
            </span>
          </div>
        </button>
      ))}
    </div>
  </div>
);

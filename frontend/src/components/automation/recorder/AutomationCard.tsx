import React from 'react';
import { Play, Pencil, Trash2, Layers, Users, Variable as VarIcon } from 'lucide-react';
import type { Automation } from '../../../lib/automation/recorder/types';
import s from './automation.module.css';

interface Props {
  automation: Automation;
  currentUserId: string;
  onRun: (a: Automation) => void;
  onEdit: (a: Automation) => void;
  onDelete: (a: Automation) => void;
}

const ownerName = (o: Automation['owner']): string =>
  typeof o === 'string' ? 'You' : (o.name || 'Unknown');

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

export const AutomationCard: React.FC<Props> = ({ automation, currentUserId, onRun, onEdit, onDelete }) => {
  const isOwner = typeof automation.owner === 'string'
    ? automation.owner === currentUserId
    : automation.owner._id === currentUserId;

  const hasLoop = automation.steps.some(st => st.type === 'loop-start');

  return (
    <div className={s.autoCard} onClick={() => onEdit(automation)}>
      <div className={s.autoCardHeader}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={s.autoCardTitle}>{automation.name}</div>
          {automation.description && <div className={s.autoCardDescription}>{automation.description}</div>}
        </div>
        <span className={`status-pill ${automation.status === 'ready' ? 'success' : 'muted'}`} style={{ flexShrink: 0 }}>
          {automation.status}
        </span>
      </div>

      <div className={s.autoCardMeta}>
        <span className={s.autoCardMetaItem}>
          <Layers size={12} /> {automation.steps.length} steps
        </span>
        {automation.variables.length > 0 && (
          <span className={s.autoCardMetaItem}>
            <VarIcon size={12} /> {automation.variables.length} var{automation.variables.length === 1 ? '' : 's'}
          </span>
        )}
        {hasLoop && (
          <span className={s.autoCardMetaItem} style={{ color: '#92400E', fontWeight: 700 }}>
            row-loop
          </span>
        )}
        {!isOwner && (
          <span className={s.autoCardMetaItem}>
            <Users size={12} /> by {ownerName(automation.owner)}
          </span>
        )}
      </div>

      <div className={s.autoCardFooter}>
        <span className={s.autoCardFooterTime}>updated {formatDate(automation.updatedAt)}</span>
        <div style={{ display: 'flex', gap: '0.35rem' }} onClick={e => e.stopPropagation()}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onRun(automation)}
            disabled={automation.steps.length === 0}
            title="Run"
          >
            <Play size={12} /> Run
          </button>
          {isOwner && (
            <>
              <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => onEdit(automation)} title="Edit">
                <Pencil size={12} />
              </button>
              <button className="btn btn-secondary btn-icon-only btn-sm" onClick={() => onDelete(automation)} title="Delete">
                <Trash2 size={12} color="#EF4444" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

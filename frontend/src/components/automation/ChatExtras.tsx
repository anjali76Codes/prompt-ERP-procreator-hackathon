/**
 * Renders the structured side-channels (tables / attachments / navigate /
 * permission dropdown) the agent attaches to an AI message. Pure display
 * component — the parent owns the data flow.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, ExternalLink, FileText, ImageIcon as ImgIcon, ArrowRight,
} from 'lucide-react';
import type {
  ChatAttachment, ChatNavigate, ChatPermission, ChatTable,
  PermissionResponse,
} from '../../lib/automation/agentApi';

const fmtBytes = (n?: number): string => {
  if (!n || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

const fmtCell = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
};

/* -------------------------------------------------------------------------- */
/*  Table                                                                      */
/* -------------------------------------------------------------------------- */

const TableView: React.FC<{ table: ChatTable }> = ({ table }) => (
  <div style={{
    background: 'white',
    border: '1px solid #E2E8F0',
    borderRadius: '0.65rem',
    overflow: 'hidden',
  }}>
    {table.title && (
      <div style={{
        padding: '0.55rem 0.9rem',
        background: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0',
        fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.5px',
        color: '#475569', textTransform: 'uppercase',
      }}>
        {table.title}
      </div>
    )}
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr>
            {table.columns.map((c, i) => (
              <th key={i} style={{
                textAlign: 'left',
                padding: '0.55rem 0.9rem',
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.4px',
                color: '#64748B', textTransform: 'uppercase',
                borderBottom: '1px solid #F1F5F9',
                background: '#FAFBFC',
                whiteSpace: 'nowrap',
              }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '0.55rem 0.9rem',
                  borderBottom: '1px solid #F1F5F9',
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                }}>
                  {fmtCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Attachment                                                                 */
/* -------------------------------------------------------------------------- */

const AttachmentCard: React.FC<{ att: ChatAttachment }> = ({ att }) => {
  const isPdf = (att.mimeType ?? '').includes('pdf') || att.url.toLowerCase().endsWith('.pdf');
  const isImg = (att.mimeType ?? '').startsWith('image/');

  return (
    <div style={{
      background: 'white',
      border: '1px solid #E2E8F0',
      borderRadius: '0.65rem',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.65rem',
        padding: '0.7rem 0.9rem',
        borderBottom: isPdf || isImg ? '1px solid #F1F5F9' : 'none',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '0.4rem',
          background: '#EFF6FF', color: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isImg ? <ImgIcon size={16} /> : <FileText size={16} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {att.name}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.1rem' }}>
            {[att.mimeType, fmtBytes(att.sizeBytes)].filter(Boolean).join(' · ') || 'file'}
          </div>
        </div>
        <a
          href={att.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.4rem 0.7rem', borderRadius: '0.4rem',
            background: '#F1F5F9', color: '#334155',
            textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700,
          }}
        >
          <Download size={12} /> Open
        </a>
      </div>
      {isPdf && (
        <iframe
          src={att.url}
          title={att.name}
          style={{
            width: '100%',
            height: 380,
            border: 'none',
            display: 'block',
            background: '#FAFBFC',
          }}
        />
      )}
      {isImg && (
        // eslint-disable-next-line jsx-a11y/img-redundant-alt
        <img
          src={att.url}
          alt={att.name}
          style={{ width: '100%', maxHeight: 380, objectFit: 'contain', background: '#FAFBFC', display: 'block' }}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Navigate                                                                   */
/* -------------------------------------------------------------------------- */

const NavigateButton: React.FC<{ nav: ChatNavigate }> = ({ nav }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(nav.path)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.55rem 0.95rem',
        background: 'var(--primary)', color: 'white',
        border: 'none', borderRadius: '0.5rem',
        fontWeight: 700, fontSize: '0.82rem',
        cursor: 'pointer', alignSelf: 'flex-start',
      }}
    >
      {nav.label} <ArrowRight size={14} />
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/*  Permission dropdown                                                        */
/* -------------------------------------------------------------------------- */

const PermissionDropdown: React.FC<{
  permission: ChatPermission;
  answered?: boolean;
  onSubmit: (pr: PermissionResponse) => void;
}> = ({ permission, answered, onSubmit }) => {
  const [value, setValue] = useState<string>(permission.options[0]?.value ?? 'allow');
  const [override, setOverride] = useState<string>('');
  const denyMode = value === 'deny';

  const submit = () => {
    if (denyMode) {
      const n = Number(override);
      if (Number.isNaN(n)) return;
      onSubmit({ value: 'deny', context: permission.context, overrideScore: n });
    } else {
      onSubmit({ value, context: permission.context });
    }
  };

  return (
    <div style={{
      background: '#FAFBFC',
      border: '1px solid #E2E8F0',
      borderRadius: '0.65rem',
      padding: '0.85rem 0.95rem',
      display: 'flex', flexDirection: 'column', gap: '0.55rem',
    }}>
      <div style={{ fontSize: '0.85rem', color: '#0F172A', fontWeight: 600 }}>
        {permission.prompt}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem' }}>
        <select
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={answered}
          style={{
            padding: '0.45rem 0.7rem',
            border: '1px solid #CBD5E1',
            borderRadius: '0.4rem',
            fontSize: '0.85rem', fontWeight: 600,
            background: 'white', color: '#0F172A',
            outline: 'none',
            cursor: answered ? 'not-allowed' : 'pointer',
          }}
        >
          {permission.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {denyMode && (
          <input
            type="number"
            min={0}
            placeholder="New score"
            value={override}
            onChange={e => setOverride(e.target.value)}
            disabled={answered}
            style={{
              width: 110, padding: '0.45rem 0.7rem',
              border: '1px solid #CBD5E1', borderRadius: '0.4rem',
              fontSize: '0.85rem', fontWeight: 600, outline: 'none',
            }}
          />
        )}
        <button
          type="button"
          onClick={submit}
          disabled={answered || (denyMode && !override.trim())}
          style={{
            padding: '0.45rem 0.95rem',
            background: answered ? '#E2E8F0' : '#0F172A',
            color: answered ? '#94A3B8' : 'white',
            border: 'none', borderRadius: '0.4rem',
            fontSize: '0.82rem', fontWeight: 700,
            cursor: answered ? 'not-allowed' : 'pointer',
          }}
        >
          {answered ? 'Sent' : 'Submit'}
        </button>
      </div>
      {!answered && (
        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
          {permission.options.find(o => o.value === value)?.description}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Container                                                                  */
/* -------------------------------------------------------------------------- */

interface Props {
  messageId: string;
  tables?: ChatTable[];
  attachments?: ChatAttachment[];
  navigate?: ChatNavigate | null;
  permission?: ChatPermission | null;
  permissionAnswered?: boolean;
  onPermission: (messageId: string, pr: PermissionResponse) => void;
}

export const ChatExtras: React.FC<Props> = ({
  messageId, tables, attachments, navigate, permission, permissionAnswered, onPermission,
}) => {
  const hasAnything =
    (tables && tables.length > 0)
    || (attachments && attachments.length > 0)
    || !!navigate
    || !!permission;
  if (!hasAnything) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
      {tables?.map((t, i) => <TableView key={i} table={t} />)}
      {attachments?.map((a, i) => <AttachmentCard key={i} att={a} />)}
      {permission && (
        <PermissionDropdown
          permission={permission}
          answered={permissionAnswered}
          onSubmit={(pr) => onPermission(messageId, pr)}
        />
      )}
      {navigate && <NavigateButton nav={navigate} />}
    </div>
  );
};

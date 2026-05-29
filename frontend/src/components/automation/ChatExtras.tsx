/**
 * Renders the structured side-channels (tables / attachments / navigate /
 * permission dropdown) the agent attaches to an AI message. Pure display
 * component — the parent owns the data flow.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, FileText, ImageIcon as ImgIcon, ArrowRight,
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

/**
 * Force a URL to download with a HUMAN-READABLE filename:
 *   - Cloudinary: insert `fl_attachment:<basename>` after /upload/. This makes
 *     Cloudinary respond with `Content-Disposition: attachment; filename="…"`
 *     containing OUR name (otherwise it falls back to the random public_id
 *     and the browser saves the file as "file (2)" with no extension).
 *   - Our own /exports/ route: already sends attachment headers via
 *     FileResponse(filename=…), no transform needed.
 * Caller pairs the returned URL with `<a download={filename}>`; the browser
 * uses the server-provided filename when present, which is what we want.
 */
const sanitizeForCloudinary = (raw: string): string => {
  // Cloudinary parses dots in the fl_attachment value as URL transformation
  // extensions and returns 400, so strip the extension. The browser saves the
  // file without `.pdf` but the content is still valid — OS PDF viewers
  // sniff and open it correctly.
  const stem = raw.replace(/\.[^./]+$/, '');
  return stem
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'download';
};

const forceAttachmentUrl = (url: string, filename?: string): string => {
  if (!url) return url;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')
      && !url.includes('/upload/fl_attachment')) {
    const segment = filename
      ? `fl_attachment:${sanitizeForCloudinary(filename)}`
      : 'fl_attachment';
    return url.replace('/upload/', `/upload/${segment}/`);
  }
  return url;
};

const AttachmentCard: React.FC<{ att: ChatAttachment }> = ({ att }) => {
  const isPdf = (att.mimeType ?? '').includes('pdf') || att.url.toLowerCase().endsWith('.pdf');
  const isImg = (att.mimeType ?? '').startsWith('image/');
  const label = isPdf ? 'PDF' : isImg ? 'Image' : 'File';

  const ensurePdfExt = (name: string): string => {
    if (!isPdf) return name;
    return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
  };

  const displayName = ensurePdfExt(att.name || 'download');
  const downloadUrl = forceAttachmentUrl(att.url, displayName);

  return (
    <div style={{
      background: 'white',
      border: '1px solid #E2E8F0',
      borderRadius: '0.65rem',
      padding: '0.55rem 0.7rem',
      display: 'flex', alignItems: 'center', gap: '0.65rem',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '0.45rem',
        background: isPdf ? '#FEE2E2' : '#EFF6FF',
        color: isPdf ? '#B91C1C' : 'var(--primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.5px',
      }}>
        {isImg ? <ImgIcon size={16} /> : (isPdf ? 'PDF' : <FileText size={16} />)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.1rem' }}>
          {[label, fmtBytes(att.sizeBytes)].filter(Boolean).join(' · ')}
        </div>
      </div>
      <a
        href={downloadUrl}
        download={displayName}
        // No target="_blank": cross-origin <a download> with attachment-
        // disposition headers fires the browser's save dialog without
        // navigating away, which is exactly what we want.
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          padding: '0.45rem 0.85rem', borderRadius: '0.45rem',
          background: 'var(--primary)', color: 'white',
          textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <Download size={13} /> Download
      </a>
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

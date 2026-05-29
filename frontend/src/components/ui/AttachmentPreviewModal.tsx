import React, { useEffect, useState } from 'react';
import { X, FileText, Image as ImageIcon, Download, ExternalLink } from 'lucide-react';
import { PdfFrame } from './PdfFrame';

export interface PreviewAttachment {
  name: string;
  url: string;
  mimeType?: string;
}

interface Props {
  title: string;
  attachments: PreviewAttachment[];
  onClose: () => void;
}

const isPdf = (a: PreviewAttachment) =>
  (a.mimeType?.startsWith('application/pdf')) || a.url.toLowerCase().endsWith('.pdf');

const isImage = (a: PreviewAttachment) =>
  a.mimeType?.startsWith('image/') ||
  /\.(png|jpe?g|gif|webp|svg)$/i.test(a.url);

/**
 * Generic preview drawer for attachment lists. Drops the right pane into
 * one of: PdfFrame (PDFs), <img> (images), or a download fallback for
 * anything else (docs/zips/etc.). The left sidebar is only shown when
 * more than one file is attached.
 */
export const AttachmentPreviewModal: React.FC<Props> = ({ title, attachments, onClose }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = attachments[activeIdx];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.25rem', zIndex: 200,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 1000, height: '85vh',
          background: 'white', borderRadius: '0.75rem',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.3)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.85rem 1.1rem', borderBottom: '1px solid #E2E8F0',
        }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
              {title}
            </h3>
            {active && (
              <div style={{
                fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {active.name}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {active && (
              <a
                href={active.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
                style={{
                  width: 32, height: 32, borderRadius: '0.4rem',
                  background: 'white', border: '1px solid #E2E8F0',
                  color: '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ExternalLink size={14} />
              </a>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 32, height: 32, borderRadius: '0.4rem',
                background: 'white', border: '1px solid #E2E8F0',
                color: '#475569', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {attachments.length > 1 && (
            <div style={{
              width: 240, borderRight: '1px solid #E2E8F0',
              overflowY: 'auto', background: '#FAFBFC',
            }}>
              {attachments.map((a, i) => (
                <button
                  key={`${a.url}-${i}`}
                  onClick={() => setActiveIdx(i)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '0.7rem 0.85rem',
                    background: i === activeIdx ? 'white' : 'transparent',
                    borderLeft: i === activeIdx ? '3px solid var(--primary)' : '3px solid transparent',
                    border: 'none', borderBottom: '1px solid #F1F5F9',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.55rem',
                  }}
                >
                  {isImage(a) ? (
                    <ImageIcon size={15} color="#6366F1" />
                  ) : (
                    <FileText size={15} color="#3B82F6" />
                  )}
                  <span style={{
                    fontSize: '0.8rem', color: '#0F172A', fontWeight: 600,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {a.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0, background: '#F8FAFC', display: 'flex' }}>
            {active && <PreviewPane attachment={active} />}
          </div>
        </div>
      </div>
    </div>
  );
};

const PreviewPane: React.FC<{ attachment: PreviewAttachment }> = ({ attachment }) => {
  if (isPdf(attachment)) {
    return (
      <div style={{ flex: 1, padding: '0.5rem' }}>
        <PdfFrame src={attachment.url} title={attachment.name} />
      </div>
    );
  }
  if (isImage(attachment)) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', overflow: 'auto',
      }}>
        <img
          src={attachment.url}
          alt={attachment.name}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>
    );
  }
  // Unknown type — give the user a download path.
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '0.85rem',
      color: '#475569', padding: '2rem',
    }}>
      <FileText size={42} color="#94A3B8" />
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
        Preview not available for this file type.
      </div>
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.55rem 0.95rem',
          background: 'var(--primary)', color: 'white',
          borderRadius: '0.45rem', textDecoration: 'none',
          fontSize: '0.85rem', fontWeight: 700,
        }}
      >
        <Download size={14} /> Download "{attachment.name}"
      </a>
    </div>
  );
};

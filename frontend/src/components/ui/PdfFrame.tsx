import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Inline PDF preview.
 *
 * Cloudinary serves raw-uploaded PDFs with `Content-Disposition: attachment`,
 * which makes the browser download the file when used as an `<iframe src>`.
 * Fetching the PDF via JS sidesteps that header — we wrap the bytes in a Blob
 * with explicit `application/pdf` type and hand the resulting object URL to
 * the iframe, which then renders inline using the browser's PDF plugin.
 */
export const PdfFrame: React.FC<{ src: string; title: string }> = ({ src, title }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError]     = useState(false);

  useEffect(() => {
    setBlobUrl(null);
    setError(false);
    let cancelled = false;
    let createdUrl: string | null = null;

    fetch(src)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then(b => {
        if (cancelled) return;
        const pdfBlob = new Blob([b], { type: 'application/pdf' });
        createdUrl = URL.createObjectURL(pdfBlob);
        setBlobUrl(createdUrl);
      })
      .catch(() => { if (!cancelled) setError(true); });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src]);

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#475569' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
          Could not load preview
        </div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block', marginTop: '0.6rem',
            padding: '0.45rem 0.85rem',
            background: 'var(--primary)', color: 'white',
            borderRadius: '0.45rem',
            textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700,
          }}
        >
          Open in new tab
        </a>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#64748B', fontSize: '0.85rem' }}>
        <Loader2 size={16} className="animate-spin" /> Loading preview…
      </div>
    );
  }

  return (
    <iframe
      title={title}
      src={blobUrl}
      style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
    />
  );
};

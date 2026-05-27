import React, { useEffect, useState } from 'react';
import { X, Folder, Save, Loader2 } from 'lucide-react';
import { useResources } from '../../lib/resources/ResourcesContext';
import { ApiError } from '../../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (folderId: string) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #E2E8F0',
  borderRadius: '0.6rem',
  padding: '0.7rem 0.9rem',
  fontSize: '0.92rem',
  outline: 'none',
  background: 'white',
  fontFamily: 'inherit',
  color: '#0F172A',
};

const labelText: React.CSSProperties = {
  display: 'block',
  fontSize: '0.86rem',
  fontWeight: 500,
  color: '#334155',
  marginBottom: '0.4rem',
};

export const CreateFolderModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const { divisionId, subjectId, divisions, subjects, createFolder } = useResources();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setTitle(''); setDescription(''); setBusy(false);
      setError(null); setFieldErrors({});
    }
  }, [open]);

  if (!open) return null;

  const division = divisions.find(d => d._id === divisionId);
  const subject  = subjects.find(s => s._id === subjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Folder name is required';
    if (title.trim().length > 200) errs.title = 'Keep the name under 200 characters';
    if (!description.trim()) errs.description = 'Add a short description';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!divisionId || !subjectId) {
      setError('Pick a division and subject first.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const folder = await createFolder({
        division: divisionId,
        subject: subjectId,
        title: title.trim(),
        description: description.trim(),
      });
      onCreated(folder._id);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create folder');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
      }}
    >
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          maxWidth: 520, width: '100%',
          background: 'white', borderRadius: '0.85rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.18)',
          display: 'flex', flexDirection: 'column', gap: '1.1rem',
          padding: '1.5rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.85rem', borderBottom: '1px solid #F1F5F9' }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: '0.55rem',
              background: '#EEF2FF', color: '#4F46E5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Folder size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
              Create Folder
            </h3>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
              Bundle multiple documents under one heading for {division?.code ?? 'this division'} ·{' '}
              {subject?.name ?? 'this subject'}.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent', border: '1px solid #E2E8F0',
              borderRadius: '0.45rem', padding: '0.3rem',
              cursor: 'pointer', color: '#64748B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Title */}
        <div>
          <label style={labelText}>Folder Name *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Unit 3 — Recurrence Relations"
            maxLength={200}
            style={{ ...inputStyle, borderColor: fieldErrors.title ? '#EF4444' : '#E2E8F0' }}
            autoFocus
          />
          {fieldErrors.title && (
            <div style={{ marginTop: '0.35rem', fontSize: '0.76rem', color: '#EF4444', fontWeight: 500 }}>
              {fieldErrors.title}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label style={labelText}>Description *</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What's inside this folder? e.g. all material for the Unit 3 lectures including slides, problem sets, and reference papers."
            style={{
              ...inputStyle,
              borderColor: fieldErrors.description ? '#EF4444' : '#E2E8F0',
              minHeight: 110, resize: 'vertical', lineHeight: 1.55,
            }}
          />
          {fieldErrors.description && (
            <div style={{ marginTop: '0.35rem', fontSize: '0.76rem', color: '#EF4444', fontWeight: 500 }}>
              {fieldErrors.description}
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: '0.55rem 0.75rem', borderRadius: '0.5rem',
              background: '#FEE2E2', color: '#B91C1C',
              fontSize: '0.82rem', fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.25rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '0.6rem 1rem', border: '1px solid #E2E8F0',
              background: 'white', color: '#334155',
              borderRadius: '0.55rem',
              fontSize: '0.85rem', fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: '0.6rem 1.1rem',
              background: 'var(--primary)', color: 'white',
              border: 'none', borderRadius: '0.55rem',
              fontSize: '0.85rem', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {busy ? 'Creating…' : 'Create Folder'}
          </button>
        </div>
      </form>
    </div>
  );
};

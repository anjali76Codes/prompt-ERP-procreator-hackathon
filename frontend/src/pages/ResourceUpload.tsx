import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  Upload, FileText, ChevronRight, ChevronLeft, Pencil, Send, Save,
  Paperclip, X, FileImage, FileType2, File as FileIcon, Eye, Loader2,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useResources } from '../lib/resources/ResourcesContext';
import type {
  Resource, ResourceAttachment, ResourceKind,
} from '../lib/resources/types';
import { ApiError } from '../lib/api';

type Stage = 'form' | 'preview';

const ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.ppt,.pptx,.zip';
const MAX_TOTAL_MB = 25;

const fmtBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

const mimeIcon = (type: string): React.ReactNode => {
  if (type.startsWith('image/')) return <FileImage size={16} />;
  if (type === 'application/pdf') return <FileType2 size={16} />;
  return <FileIcon size={16} />;
};

const inputStyle: React.CSSProperties = {
  border: '1px solid #E2E8F0', borderRadius: '0.5rem',
  padding: '0.55rem 0.85rem', fontSize: '0.9rem', outline: 'none',
  background: 'white', fontFamily: 'inherit', width: '100%',
};

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.35rem',
  fontSize: '0.72rem', fontWeight: 700, color: '#475569',
  textTransform: 'uppercase', letterSpacing: '0.4px',
};

interface FormState {
  title: string;
  description: string;
  dueDate: string;
  maxMarks: string;
  unit: string;
  /** New files queued for upload (only in create mode + as additions in edit mode). */
  pendingFiles: File[];
}

const emptyForm = (): FormState => ({
  title: '', description: '', dueDate: '', maxMarks: '', unit: '', pendingFiles: [],
});

export const ResourceUpload: React.FC = () => {
  const { type } = useParams<{ type: ResourceKind }>();
  const navigate = useNavigate();
  const kind: ResourceKind = type === 'notes' ? 'notes' : 'assignment';

  const {
    divisions, subjects, divisionId, subjectId,
    getItem, createItem, updateItem, addFiles, removeFile, publish,
    draftId, setDraftId,
  } = useResources();

  const [stage, setStage] = useState<Stage>('form');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Resume the draft if one is in flight (Edit handoff from listing or preview).
  useEffect(() => {
    if (!draftId) return;
    const existing = getItem(draftId);
    if (!existing) return;
    setForm({
      title: existing.title,
      description: existing.description,
      dueDate: existing.dueDate ? existing.dueDate.slice(0, 10) : '',
      maxMarks: existing.maxMarks !== undefined ? String(existing.maxMarks) : '',
      unit: existing.unit ?? '',
      pendingFiles: [],
    });
  }, [draftId, getItem]);

  if (!divisionId || !subjectId) {
    return <Navigate to="/assignments" replace />;
  }

  const division = divisions.find(d => d._id === divisionId);
  const subject  = subjects.find(s => s._id === subjectId);
  const draft    = draftId ? getItem(draftId) : undefined;
  const editing  = !!draft;

  const titleLabel = kind === 'assignment' ? 'Upload Assignment' : 'Upload Notes';
  const iconNode   = kind === 'assignment' ? <Upload size={18} /> : <FileText size={18} />;

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setForm(f => ({ ...f, pendingFiles: [...f.pendingFiles, ...Array.from(files)] }));
    // As soon as the user adds a file, drop the "Attach at least one file" error.
    setErrors(prev => {
      if (!prev.attachments) return prev;
      const { attachments: _drop, ...rest } = prev;
      return rest;
    });
  };

  const removePending = (idx: number) =>
    setForm(f => {
      const next = f.pendingFiles.slice();
      next.splice(idx, 1);
      return { ...f, pendingFiles: next };
    });

  const removeUploaded = async (attId: string) => {
    if (!draft) return;
    if (!confirm('Delete this attachment from Cloudinary? This cannot be undone.')) return;
    try {
      await removeFile(draft._id, attId);
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Failed to delete attachment');
    }
  };

  const pendingBytes = form.pendingFiles.reduce((a, f) => a + f.size, 0);
  const uploadedBytes = draft?.attachments.reduce((a, x) => a + x.size, 0) ?? 0;
  const totalBytes = pendingBytes + uploadedBytes;
  const totalAttachments = (draft?.attachments.length ?? 0) + form.pendingFiles.length;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (form.title.trim().length > 200) e.title = 'Keep the title under 200 characters';
    if (!form.description.trim()) e.description = 'Add a short description';

    if (kind === 'assignment') {
      if (!form.dueDate) e.dueDate = 'Due date is required';
      if (form.maxMarks && Number.isNaN(Number(form.maxMarks))) e.maxMarks = 'Marks must be a number';
    }

    if (totalAttachments === 0) e.attachments = 'Attach at least one file';
    if (totalBytes > MAX_TOTAL_MB * 1024 * 1024) {
      e.attachments = `Attachments exceed ${MAX_TOTAL_MB} MB total`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /** Persist the form to the backend; returns the saved Resource id. */
  const persist = async (): Promise<string | null> => {
    setServerError(null);
    if (!validate()) return null;

    setBusy(true);
    try {
      if (editing && draft) {
        // Update metadata.
        await updateItem(draft._id, {
          title: form.title.trim(),
          description: form.description.trim(),
          dueDate: kind === 'assignment' ? form.dueDate : undefined,
          maxMarks: kind === 'assignment' && form.maxMarks ? Number(form.maxMarks) : undefined,
          unit:    kind === 'notes' ? (form.unit.trim() || undefined) : undefined,
        });
        if (form.pendingFiles.length > 0) {
          await addFiles(draft._id, form.pendingFiles);
          setForm(f => ({ ...f, pendingFiles: [] }));
        }
        return draft._id;
      }

      // Create flow.
      const created = await createItem({
        kind,
        division: divisionId,
        subject:  subjectId,
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate:  kind === 'assignment' ? form.dueDate : undefined,
        maxMarks: kind === 'assignment' && form.maxMarks ? Number(form.maxMarks) : undefined,
        unit:     kind === 'notes' ? (form.unit.trim() || undefined) : undefined,
        files: form.pendingFiles,
      });
      setDraftId(created._id);
      setForm(f => ({ ...f, pendingFiles: [] }));
      return created._id;
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Failed to save resource');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handlePreview = async () => {
    const id = await persist();
    if (id) setStage('preview');
  };

  const handleSaveDraft = async () => {
    const id = await persist();
    if (id) navigate(kind === 'assignment' ? '/assignments/list' : '/assignments/notes');
  };

  const handlePublish = async () => {
    if (!draftId) return;
    setBusy(true);
    setServerError(null);
    try {
      await publish(draftId);
      setDraftId(null);
      navigate(kind === 'assignment' ? '/assignments/list' : '/assignments/notes');
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  };

  const previewItem = useMemo<Resource | undefined>(
    () => (draftId ? getItem(draftId) : undefined),
    [draftId, getItem]
  );

  /* --------------------------------- render -------------------------------- */

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={iconNode}
      pageTitle={titleLabel}
      pageBreadcrumb={
        <>
          <button onClick={() => navigate('/assignments')}>Assignments & Notes</button>
          <ChevronRight size={11} />
          <span>{division?.code}</span>
          <ChevronRight size={11} />
          <span>{subject?.code} · {subject?.name}</span>
          <ChevronRight size={11} />
          <span className="current">{stage === 'form' ? 'Compose' : 'Preview'}</span>
        </>
      }
      pageActions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/assignments')} disabled={busy}>
            <ChevronLeft size={14} /> Back
          </button>
          {stage === 'form' ? (
            <>
              <button className="btn btn-secondary btn-sm" onClick={handleSaveDraft} disabled={busy}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Draft
              </button>
              <button className="btn btn-primary" onClick={handlePreview} disabled={busy}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                {busy ? 'Uploading…' : 'Preview'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setStage('form')} disabled={busy}>
                <Pencil size={14} /> Edit
              </button>
              <button className="btn btn-primary" onClick={handlePublish} disabled={busy || !previewItem || previewItem.status === 'published'}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {previewItem?.status === 'published' ? 'Published' : 'Publish'}
              </button>
            </>
          )}
        </>
      }
    >
      {serverError && (
        <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
          {serverError}
        </div>
      )}

      {stage === 'form' ? (
        <FormStage
          kind={kind}
          form={form}
          errors={errors}
          uploadedAttachments={draft?.attachments ?? []}
          update={update}
          onFiles={onFiles}
          removePending={removePending}
          removeUploaded={removeUploaded}
          busy={busy}
        />
      ) : previewItem ? (
        <PreviewStage
          item={previewItem}
          divisionLabel={division ? `${division.code} · ${division.year}` : '—'}
          subjectLabel={subject ? `${subject.code} · ${subject.name}` : '—'}
        />
      ) : null}
    </AppLayout>
  );
};

/* -------------------------------- form stage ------------------------------ */

interface FormStageProps {
  kind: ResourceKind;
  form: FormState;
  errors: Record<string, string>;
  uploadedAttachments: ResourceAttachment[];
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onFiles: (files: FileList | null) => void;
  removePending: (idx: number) => void;
  removeUploaded: (attId: string) => void;
  busy: boolean;
}

const FormStage: React.FC<FormStageProps> = ({
  kind, form, errors, uploadedAttachments, update, onFiles, removePending, removeUploaded, busy,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '64% 33.5%', gap: '2.5%', alignItems: 'flex-start' }}>
      {/* Left — fields */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <div className="card-header" style={{ marginBottom: 0 }}>
          <h3 className="card-title-lg">{kind === 'assignment' ? 'Assignment details' : 'Notes details'}</h3>
          <span className="status-pill muted">Required fields marked *</span>
        </div>

        <label style={labelStyle}>
          Title *
          <input
            type="text"
            style={{ ...inputStyle, borderColor: errors.title ? '#EF4444' : '#E2E8F0' }}
            value={form.title}
            onChange={e => update('title', e.target.value)}
            placeholder={kind === 'assignment' ? 'e.g. Unit 3 — Recurrence Relations Problem Set' : 'e.g. Unit 3 — Lecture Notes'}
            maxLength={200}
          />
          {errors.title && <span style={{ color: '#EF4444', textTransform: 'none', fontWeight: 600 }}>{errors.title}</span>}
        </label>

        <label style={labelStyle}>
          {kind === 'assignment' ? 'Instructions / description *' : 'Description *'}
          <textarea
            style={{ ...inputStyle, minHeight: 130, resize: 'vertical', borderColor: errors.description ? '#EF4444' : '#E2E8F0' }}
            value={form.description}
            onChange={e => update('description', e.target.value)}
            placeholder={kind === 'assignment'
              ? 'Spell out what students must solve, submission format, citation policy, late-submission policy…'
              : 'Briefly describe what these notes cover and how students should use them.'}
          />
          {errors.description && <span style={{ color: '#EF4444', textTransform: 'none', fontWeight: 600 }}>{errors.description}</span>}
        </label>

        {kind === 'assignment' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={labelStyle}>
              Due date *
              <input
                type="date"
                style={{ ...inputStyle, borderColor: errors.dueDate ? '#EF4444' : '#E2E8F0' }}
                value={form.dueDate}
                onChange={e => update('dueDate', e.target.value)}
              />
              {errors.dueDate && <span style={{ color: '#EF4444', textTransform: 'none', fontWeight: 600 }}>{errors.dueDate}</span>}
            </label>
            <label style={labelStyle}>
              Maximum marks
              <input
                type="number"
                min={0}
                style={{ ...inputStyle, borderColor: errors.maxMarks ? '#EF4444' : '#E2E8F0' }}
                value={form.maxMarks}
                onChange={e => update('maxMarks', e.target.value)}
                placeholder="e.g. 20"
              />
              {errors.maxMarks && <span style={{ color: '#EF4444', textTransform: 'none', fontWeight: 600 }}>{errors.maxMarks}</span>}
            </label>
          </div>
        ) : (
          <label style={labelStyle}>
            Unit / Chapter tag
            <input
              type="text"
              style={inputStyle}
              value={form.unit}
              onChange={e => update('unit', e.target.value)}
              placeholder="e.g. Unit 4 · Greedy Algorithms"
            />
          </label>
        )}

        {/* Dropzone */}
        <div>
          <div style={{ ...labelStyle, marginBottom: '0.4rem' }}>
            Attachments *
          </div>
          {/*
           * Keep the file input as a sibling — not a child — of the clickable
           * wrapper. If the input lives inside the wrapper, the synthesised
           * click bubbles back up to the wrapper's onClick and re-triggers
           * input.click(), which the browser blocks as a re-entrant file
           * picker and quietly drops the user's selection.
           */}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            onChange={e => { onFiles(e.target.files); e.target.value = ''; }}
            style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
            tabIndex={-1}
            aria-hidden="true"
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => { if (!busy) inputRef.current?.click(); }}
            onKeyDown={e => {
              if (busy) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false);
              if (!busy) onFiles(e.dataTransfer.files);
            }}
            style={{
              cursor: busy ? 'wait' : 'pointer',
              border: `1.5px dashed ${dragOver ? 'var(--primary)' : errors.attachments ? '#EF4444' : '#CBD5E1'}`,
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              textAlign: 'center',
              background: dragOver ? '#EFF6FF' : '#F8FAFC',
              transition: 'background 0.15s, border-color 0.15s',
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Paperclip size={22} color={dragOver ? 'var(--primary)' : '#64748B'} />
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }}>
              Click to choose files or drag & drop
            </div>
            <div style={{ marginTop: '0.2rem', fontSize: '0.72rem', color: '#64748B' }}>
              PDF, DOC, DOCX, PPT, PPTX, images, ZIP — up to {MAX_TOTAL_MB} MB total
            </div>
          </div>
          {errors.attachments && (
            <div style={{ color: '#EF4444', fontSize: '0.72rem', fontWeight: 700, marginTop: '0.4rem' }}>
              {errors.attachments}
            </div>
          )}

          {/* Already-uploaded attachments (edit mode) */}
          {uploadedAttachments.length > 0 && (
            <div style={{ marginTop: '0.85rem' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#16A34A', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
                UPLOADED · {uploadedAttachments.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {uploadedAttachments.map(a => (
                  <AttachmentRow
                    key={a._id}
                    name={a.name}
                    size={a.size}
                    type={a.mimeType}
                    href={a.url}
                    onRemove={() => removeUploaded(a._id)}
                    cloud
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending (not-yet-uploaded) files */}
          {form.pendingFiles.length > 0 && (
            <div style={{ marginTop: '0.85rem' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#B45309', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
                PENDING UPLOAD · {form.pendingFiles.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {form.pendingFiles.map((a, idx) => (
                  <AttachmentRow
                    key={`${a.name}-${idx}`}
                    name={a.name}
                    size={a.size}
                    type={a.type}
                    onRemove={() => removePending(idx)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right — guidance card */}
      <div className="stack-lg">
        <div className="card">
          <span className="section-eyebrow">Before you publish</span>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', color: '#475569', fontSize: '0.82rem', lineHeight: 1.7 }}>
            <li>Use a clear title — students see it in their feed.</li>
            <li>Spell out submission expectations in the description.</li>
            {kind === 'assignment' && <li>Pick a due date students will see in their planner.</li>}
            <li>Files are stored on Cloudinary; URLs are saved in MongoDB.</li>
            <li>Drafts are private until you press <strong>Publish</strong>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

interface AttachmentRowProps {
  name: string;
  size: number;
  type: string;
  href?: string;
  cloud?: boolean;
  onRemove: () => void;
}

const AttachmentRow: React.FC<AttachmentRowProps> = ({ name, size, type, href, cloud, onRemove }) => (
  <div
    style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)',
      border: '1px solid #E2E8F0', background: 'white',
    }}
  >
    <span style={{ color: cloud ? '#16A34A' : 'var(--primary)' }}>{mimeIcon(type)}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.82rem', fontWeight: 700, color: '#0F172A',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
            textDecoration: 'none',
          }}
        >
          {name}
        </a>
      ) : (
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
      )}
      <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{fmtBytes(size)}{cloud && ' · Cloudinary'}</div>
    </div>
    <button
      type="button"
      onClick={onRemove}
      className="btn btn-secondary btn-icon-only btn-sm"
      aria-label="Remove attachment"
    >
      <X size={12} />
    </button>
  </div>
);

/* ------------------------------ preview stage ----------------------------- */

const PreviewStage: React.FC<{
  item: Resource;
  divisionLabel: string;
  subjectLabel: string;
}> = ({ item, divisionLabel, subjectLabel }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = item.attachments[activeIdx];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '62% 35.5%', gap: '2.5%', alignItems: 'flex-start' }}>
      {/* Left — file viewer */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="card-header"
          style={{ marginBottom: 0, padding: '0.85rem 1rem', borderBottom: '1px solid #E2E8F0' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <span style={{ color: 'var(--primary)' }}>{active ? mimeIcon(active.mimeType) : <FileIcon size={16} />}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {active?.name ?? 'No file'}
            </span>
          </div>
          <span className="status-pill muted">{active ? fmtBytes(active.size) : '0 B'}</span>
        </div>

        <div style={{ background: '#F1F5F9', height: 540, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {active ? (
            active.mimeType === 'application/pdf' ? (
              <iframe
                title={active.name}
                src={active.url}
                style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
              />
            ) : active.mimeType.startsWith('image/') ? (
              <img
                src={active.url}
                alt={active.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', background: 'white' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#64748B', padding: '2rem' }}>
                <FileIcon size={36} />
                <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }}>
                  No inline preview for this file type
                </div>
                <div style={{ marginTop: '0.25rem', fontSize: '0.78rem' }}>
                  Students will be able to download it.
                </div>
                <a
                  href={active.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '1rem', textDecoration: 'none' }}
                >
                  Open in new tab
                </a>
              </div>
            )
          ) : (
            <div style={{ color: '#94A3B8', fontSize: '0.875rem' }}>No attachment</div>
          )}
        </div>

        {item.attachments.length > 1 && (
          <div style={{ display: 'flex', gap: '0.4rem', padding: '0.6rem 0.75rem', borderTop: '1px solid #E2E8F0', overflowX: 'auto' }}>
            {item.attachments.map((a, idx) => (
              <button
                key={a._id}
                onClick={() => setActiveIdx(idx)}
                style={{
                  border: '1px solid', borderColor: idx === activeIdx ? 'var(--primary)' : '#E2E8F0',
                  background: idx === activeIdx ? '#EFF6FF' : 'white',
                  color: idx === activeIdx ? 'var(--primary)' : '#475569',
                  padding: '0.35rem 0.7rem', borderRadius: '0.4rem',
                  fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {a.name.length > 24 ? `${a.name.slice(0, 22)}…` : a.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right — metadata */}
      <div className="stack-lg">
        <div className="card">
          <span className="section-eyebrow">{item.kind === 'assignment' ? 'Assignment summary' : 'Notes summary'}</span>
          <h2 style={{ margin: '0.6rem 0 0.4rem', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
            {item.title}
          </h2>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
            <span className="status-pill info">{divisionLabel}</span>
            <span className="status-pill muted">{subjectLabel}</span>
            <span className={`status-pill ${item.status === 'published' ? 'success' : 'warning'}`}>
              {item.status}
            </span>
          </div>

          <p style={{ margin: 0, color: '#475569', fontSize: '0.86rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {item.description}
          </p>

          <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {item.kind === 'assignment' && (
              <>
                <Meta label="Due" value={item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'} />
                <Meta label="Max marks" value={item.maxMarks !== undefined ? String(item.maxMarks) : '—'} />
              </>
            )}
            {item.kind === 'notes' && (
              <Meta label="Unit / chapter" value={item.unit ?? '—'} />
            )}
            <Meta label="Attachments" value={String(item.attachments.length)} />
            <Meta label="Total size" value={fmtBytes(item.attachments.reduce((a, x) => a + x.size, 0))} />
          </div>
        </div>

        {item.status === 'draft' ? (
          <div className="card" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
            <span className="section-eyebrow" style={{ color: '#B45309' }}>This is a draft</span>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#92400E', lineHeight: 1.55 }}>
              Students will not see this until you press <strong>Publish</strong>. Use <strong>Edit</strong> if anything looks off.
            </p>
          </div>
        ) : (
          <div className="card" style={{ background: '#ECFDF5', borderColor: '#A7F3D0' }}>
            <span className="section-eyebrow" style={{ color: '#15803D' }}>Published</span>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#166534', lineHeight: 1.55 }}>
              Visible to students of {divisionLabel}. Editing the title or description is still allowed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const Meta: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      padding: '0.55rem 0.75rem', border: '1px solid #E2E8F0',
      borderRadius: 'var(--radius-md)', background: '#F8FAFC',
    }}
  >
    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {label}
    </div>
    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginTop: '0.15rem' }}>
      {value}
    </div>
  </div>
);

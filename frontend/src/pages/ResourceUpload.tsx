import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  Upload, FileText, ChevronRight, ChevronLeft, Pencil, Send, Save,
  Paperclip, X, FileImage, FileType2, File as FileIcon, Eye,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import {
  useResources, newResourceId,
  type ResourceAttachment, type ResourceItem, type ResourceKind,
} from '../lib/resources/ResourcesContext';

type Stage = 'form' | 'preview';

const ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.ppt,.pptx,.zip';
const MAX_TOTAL_MB = 25;

const fmtBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

const attachmentIcon = (type: string): React.ReactNode => {
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
  attachments: ResourceAttachment[];
}

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  dueDate: '',
  maxMarks: '',
  unit: '',
  attachments: [],
});

export const ResourceUpload: React.FC = () => {
  const { type } = useParams<{ type: ResourceKind }>();
  const navigate = useNavigate();
  const kind: ResourceKind = type === 'notes' ? 'notes' : 'assignment';

  const {
    divisions, subjects, divisionId, subjectId,
    upsertItem, publishItem, getItem,
    draftId, setDraftId,
  } = useResources();

  const [stage, setStage] = useState<Stage>('form');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Resume an existing draft if one is in flight (from previous "Edit").
  useEffect(() => {
    if (!draftId) return;
    const existing = getItem(draftId);
    if (!existing) return;
    setForm({
      title: existing.title,
      description: existing.description,
      dueDate: existing.dueDate ?? '',
      maxMarks: existing.maxMarks !== undefined ? String(existing.maxMarks) : '',
      unit: existing.unit ?? '',
      attachments: existing.attachments,
    });
  }, [draftId, getItem]);

  // If user navigated here without picking division+subject, bounce back to hub.
  if (!divisionId || !subjectId) {
    return <Navigate to="/assignments" replace />;
  }

  const division = divisions.find(d => d._id === divisionId);
  const subject = subjects.find(s => s._id === subjectId);

  const title = kind === 'assignment' ? 'Upload Assignment' : 'Upload Notes';
  const icon  = kind === 'assignment' ? <Upload size={18} /> : <FileText size={18} />;

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: ResourceAttachment[] = Array.from(files).map(f => ({
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
      url: URL.createObjectURL(f),
    }));
    setForm(f => ({ ...f, attachments: [...f.attachments, ...added] }));
  };

  const removeAttachment = (idx: number) => {
    setForm(f => {
      const next = f.attachments.slice();
      const [removed] = next.splice(idx, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return { ...f, attachments: next };
    });
  };

  const totalBytes = form.attachments.reduce((a, x) => a + x.size, 0);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (form.title.trim().length > 120) e.title = 'Keep the title under 120 characters';
    if (!form.description.trim()) e.description = 'Add a short description';

    if (kind === 'assignment') {
      if (!form.dueDate) e.dueDate = 'Due date is required';
      if (form.maxMarks && Number.isNaN(Number(form.maxMarks))) e.maxMarks = 'Marks must be a number';
    }

    if (form.attachments.length === 0) e.attachments = 'Attach at least one file';
    if (totalBytes > MAX_TOTAL_MB * 1024 * 1024) {
      e.attachments = `Attachments exceed ${MAX_TOTAL_MB} MB total`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildItem = (statusOverride?: 'draft' | 'published'): ResourceItem => {
    const id = draftId ?? newResourceId();
    const existing = draftId ? getItem(draftId) : undefined;
    const now = new Date().toISOString();
    return {
      id,
      kind,
      status: statusOverride ?? existing?.status ?? 'draft',
      divisionId: divisionId!,
      subjectId: subjectId!,
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: kind === 'assignment' ? form.dueDate : undefined,
      maxMarks: kind === 'assignment' && form.maxMarks ? Number(form.maxMarks) : undefined,
      unit: kind === 'notes' ? form.unit.trim() || undefined : undefined,
      attachments: form.attachments,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
  };

  const handlePreview = () => {
    if (!validate()) return;
    const item = buildItem();
    upsertItem(item);
    setDraftId(item.id);
    setStage('preview');
  };

  const handleSaveDraft = () => {
    if (!form.title.trim()) {
      setErrors({ title: 'A title is required even for drafts' });
      return;
    }
    const item = buildItem('draft');
    upsertItem(item);
    setDraftId(item.id);
    navigate(kind === 'assignment' ? '/assignments/list' : '/assignments/notes');
  };

  const handlePublish = () => {
    if (!draftId) return;
    publishItem(draftId);
    setDraftId(null);
    navigate(kind === 'assignment' ? '/assignments/list' : '/assignments/notes');
  };

  const previewItem = useMemo<ResourceItem | undefined>(
    () => (draftId ? getItem(draftId) : undefined),
    [draftId, getItem]
  );

  /* --------------------------------- render -------------------------------- */

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={icon}
      pageTitle={title}
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
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/assignments')}>
            <ChevronLeft size={14} /> Back
          </button>
          {stage === 'form' ? (
            <>
              <button className="btn btn-secondary btn-sm" onClick={handleSaveDraft}>
                <Save size={14} /> Save Draft
              </button>
              <button className="btn btn-primary" onClick={handlePreview}>
                <Eye size={14} /> Preview
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setStage('form')}>
                <Pencil size={14} /> Edit
              </button>
              <button className="btn btn-primary" onClick={handlePublish}>
                <Send size={14} /> Publish
              </button>
            </>
          )}
        </>
      }
    >
      {stage === 'form' ? (
        <FormStage
          kind={kind}
          form={form}
          errors={errors}
          update={update}
          onFiles={onFiles}
          removeAttachment={removeAttachment}
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
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onFiles: (files: FileList | null) => void;
  removeAttachment: (idx: number) => void;
}

const FormStage: React.FC<FormStageProps> = ({
  kind, form, errors, update, onFiles, removeAttachment,
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
            maxLength={140}
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
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false);
              onFiles(e.dataTransfer.files);
            }}
            style={{
              cursor: 'pointer',
              border: `1.5px dashed ${dragOver ? 'var(--primary)' : errors.attachments ? '#EF4444' : '#CBD5E1'}`,
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              textAlign: 'center',
              background: dragOver ? '#EFF6FF' : '#F8FAFC',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <Paperclip size={22} color={dragOver ? 'var(--primary)' : '#64748B'} />
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }}>
              Click to choose files or drag & drop
            </div>
            <div style={{ marginTop: '0.2rem', fontSize: '0.72rem', color: '#64748B' }}>
              PDF, DOC, DOCX, PPT, PPTX, images, ZIP — up to {MAX_TOTAL_MB} MB total
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              onChange={e => { onFiles(e.target.files); e.target.value = ''; }}
              style={{ display: 'none' }}
            />
          </div>
          {errors.attachments && (
            <div style={{ color: '#EF4444', fontSize: '0.72rem', fontWeight: 700, marginTop: '0.4rem' }}>
              {errors.attachments}
            </div>
          )}

          {form.attachments.length > 0 && (
            <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {form.attachments.map((a, idx) => (
                <div
                  key={`${a.name}-${idx}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)',
                    border: '1px solid #E2E8F0', background: 'white',
                  }}
                >
                  <span style={{ color: 'var(--primary)' }}>{attachmentIcon(a.type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{fmtBytes(a.size)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="btn btn-secondary btn-icon-only btn-sm"
                    aria-label="Remove attachment"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
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
            <li>Drafts are private until you press <strong>Publish</strong>.</li>
            <li>You can keep editing after publishing.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------ preview stage ----------------------------- */

const PreviewStage: React.FC<{
  item: ResourceItem;
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
            <span style={{ color: 'var(--primary)' }}>{active ? attachmentIcon(active.type) : <FileIcon size={16} />}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {active?.name ?? 'No file'}
            </span>
          </div>
          <span className="status-pill muted">{active ? fmtBytes(active.size) : '0 B'}</span>
        </div>

        <div style={{ background: '#F1F5F9', height: 540, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {active ? (
            active.type === 'application/pdf' ? (
              <iframe
                title={active.name}
                src={active.url}
                style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
              />
            ) : active.type.startsWith('image/') ? (
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
                  download={active.name}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '1rem', textDecoration: 'none' }}
                >
                  Download to verify
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
                key={`${a.name}-${idx}`}
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

        <div className="card" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
          <span className="section-eyebrow" style={{ color: '#B45309' }}>This is a draft</span>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#92400E', lineHeight: 1.55 }}>
            Students will not see this until you press <strong>Publish</strong>. Use <strong>Edit</strong> if anything looks off.
          </p>
        </div>
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

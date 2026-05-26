import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  Upload, FileText, ChevronRight, ChevronLeft, Pencil, Send, Save,
  Paperclip, X, FileImage, FileType2, File as FileIcon, Loader2,
  ArrowRight, Check,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useResources } from '../lib/resources/ResourcesContext';
import type {
  Resource, ResourceAttachment, ResourceKind,
} from '../lib/resources/types';
import { ApiError } from '../lib/api';

type Stage = 'form' | 'preview';
type Step = 1 | 2 | 3;

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

/* -------------------------------------------------------------------------- */
/*  Shared styles — softer look to match the wizard mockup                    */
/* -------------------------------------------------------------------------- */

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
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const labelText: React.CSSProperties = {
  display: 'block',
  fontSize: '0.88rem',
  fontWeight: 500,
  color: '#334155',
  marginBottom: '0.45rem',
};

const errorText: React.CSSProperties = {
  display: 'block',
  marginTop: '0.4rem',
  fontSize: '0.78rem',
  color: '#EF4444',
  fontWeight: 500,
};

/* -------------------------------------------------------------------------- */
/*  Form state                                                                */
/* -------------------------------------------------------------------------- */

interface FormState {
  title: string;
  description: string;
  dueDate: string;
  maxMarks: string;
  unit: string;
  /** New files queued for upload. */
  pendingFiles: File[];
}

const emptyForm = (): FormState => ({
  title: '', description: '', dueDate: '', maxMarks: '', unit: '', pendingFiles: [],
});

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export const ResourceUpload: React.FC = () => {
  const { type } = useParams<{ type: ResourceKind }>();
  const navigate = useNavigate();
  const initialKind: ResourceKind = type === 'notes' ? 'notes' : 'assignment';

  const {
    divisions, subjects, divisionId, subjectId,
    getItem, createItem, updateItem, addFiles, removeFile, publish,
    draftId, setDraftId,
  } = useResources();

  const [stage, setStage] = useState<Stage>('form');
  const [step, setStep] = useState<Step>(1);
  const [kind, setKind] = useState<ResourceKind>(initialKind);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Resume an existing draft if one is in flight (Edit handoff).
  useEffect(() => {
    if (!draftId) return;
    const existing = getItem(draftId);
    if (!existing) return;
    setKind(existing.kind);
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

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    // Snapshot the FileList synchronously — the input's `value` is reset
    // right after this call, which empties the FileList before React runs
    // the setForm updater.
    const incoming = Array.from(files);
    setForm(f => ({ ...f, pendingFiles: [...f.pendingFiles, ...incoming] }));
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

  const pendingBytes   = form.pendingFiles.reduce((a, f) => a + f.size, 0);
  const uploadedBytes  = draft?.attachments.reduce((a, x) => a + x.size, 0) ?? 0;
  const totalBytes     = pendingBytes + uploadedBytes;
  const totalAttachments = (draft?.attachments.length ?? 0) + form.pendingFiles.length;

  const validateStep = (s: Step): boolean => {
    const e: Record<string, string> = {};

    if (s === 1) {
      if (!form.title.trim()) e.title = 'A title is required';
      else if (form.title.trim().length > 200) e.title = 'Keep the title under 200 characters';
      if (!form.description.trim()) e.description = 'Add a short description';
    }

    if (s === 2) {
      if (totalAttachments === 0) e.attachments = 'Attach at least one file';
      if (totalBytes > MAX_TOTAL_MB * 1024 * 1024) {
        e.attachments = `Attachments exceed ${MAX_TOTAL_MB} MB total`;
      }
    }

    if (s === 3) {
      if (kind === 'assignment') {
        if (!form.dueDate) e.dueDate = 'Due date is required';
        if (form.maxMarks && Number.isNaN(Number(form.maxMarks))) e.maxMarks = 'Marks must be a number';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /** Persist all collected fields & files to the backend. Returns saved id. */
  const persist = async (): Promise<string | null> => {
    setServerError(null);
    setBusy(true);
    try {
      if (editing && draft) {
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

  const goNext = async () => {
    if (!validateStep(step)) return;
    if (step < 3) {
      setStep((step + 1) as Step);
      return;
    }
    // Step 3 → persist + jump to Preview.
    const id = await persist();
    if (id) setStage('preview');
  };

  const goBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleSaveDraft = async () => {
    // Save draft requires at least the title.
    if (!form.title.trim()) {
      setStep(1);
      setErrors({ title: 'A title is required even for drafts' });
      return;
    }
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

  const titleLabel = kind === 'assignment' ? 'Upload Assignment' : 'Upload Notes';
  const iconNode   = kind === 'assignment' ? <Upload size={18} /> : <FileText size={18} />;

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
          <span className="current">{stage === 'form' ? `Step ${step}` : 'Preview'}</span>
        </>
      }
      pageActions={
        stage === 'preview' ? (
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => setStage('form')} disabled={busy}>
              <Pencil size={14} /> Edit
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePublish}
              disabled={busy || !previewItem || previewItem.status === 'published'}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {previewItem?.status === 'published' ? 'Published' : 'Publish'}
            </button>
          </>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/assignments')} disabled={busy}>
            <ChevronLeft size={14} /> Back to Hub
          </button>
        )
      }
    >
      {serverError && (
        <div
          className="status-pill danger"
          style={{ marginBottom: '1rem', textTransform: 'none' }}
        >
          {serverError}
        </div>
      )}

      {stage === 'form' ? (
        <WizardLayout step={step}>
          {step === 1 && (
            <BasicInfoStep
              form={form}
              errors={errors}
              update={update}
              onNext={goNext}
              onSaveDraft={handleSaveDraft}
              busy={busy}
            />
          )}
          {step === 2 && (
            <FileUploadStep
              form={form}
              errors={errors}
              uploadedAttachments={draft?.attachments ?? []}
              onFiles={onFiles}
              removePending={removePending}
              removeUploaded={removeUploaded}
              onNext={goNext}
              onBack={goBack}
              onSaveDraft={handleSaveDraft}
              busy={busy}
            />
          )}
          {step === 3 && (
            <SettingsStep
              kind={kind}
              form={form}
              errors={errors}
              update={update}
              onPreview={goNext}
              onBack={goBack}
              onSaveDraft={handleSaveDraft}
              busy={busy}
            />
          )}
        </WizardLayout>
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

/* -------------------------------------------------------------------------- */
/*  Wizard frame (3-dot stepper + max-width centered content)                  */
/* -------------------------------------------------------------------------- */

const STEPS: { idx: Step; label: string }[] = [
  { idx: 1, label: 'Basic Info' },
  { idx: 2, label: 'File Upload' },
  { idx: 3, label: 'Settings' },
];

const WizardLayout: React.FC<{ step: Step; children: React.ReactNode }> = ({ step, children }) => (
  <div style={{ maxWidth: 880, margin: '0 auto' }}>
    {/* Stepper */}
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.85rem', margin: '0.25rem 0 2.25rem',
      }}
    >
      {STEPS.map((s, i) => {
        const done = step > s.idx;
        const active = step === s.idx;
        return (
          <React.Fragment key={s.idx}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem' }}>
              <div
                style={{
                  width: 44, height: 44, borderRadius: '0.65rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'var(--primary)' : done ? '#DBEAFE' : '#F1F5F9',
                  color: active ? 'white' : done ? 'var(--primary)' : '#94A3B8',
                  fontWeight: 800, fontSize: '0.95rem',
                  boxShadow: active ? '0 6px 14px rgba(13, 138, 188, 0.25)' : undefined,
                  transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
                }}
              >
                {done ? <Check size={18} /> : s.idx}
              </div>
              <span
                style={{
                  fontSize: '0.86rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#0F172A' : '#475569',
                }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 80, height: 2,
                  background: step > s.idx ? 'var(--primary)' : '#E2E8F0',
                  borderRadius: 1, marginBottom: '1.6rem',
                  transition: 'background 0.15s',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>

    {children}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Step 1 — Basic Info                                                       */
/* -------------------------------------------------------------------------- */

interface BasicInfoStepProps {
  form: FormState;
  errors: Record<string, string>;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onNext: () => void;
  onSaveDraft: () => void;
  busy: boolean;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  form, errors, update, onNext, onSaveDraft, busy,
}) => (
  <Card>
    <CardHeader
      title="Content Details"
      subtitle="Provide the foundational details for your resource."
    />

    <Field
      label="Resource Title"
      error={errors.title}
    >
      <input
        type="text"
        style={fieldStyle(!!errors.title)}
        value={form.title}
        onChange={e => update('title', e.target.value)}
        placeholder="e.g. Introduction to Algorithms - Final Project"
        maxLength={200}
      />
    </Field>

    <Field
      label="Description"
      error={errors.description}
    >
      <textarea
        style={{ ...fieldStyle(!!errors.description), minHeight: 140, resize: 'vertical', lineHeight: 1.55 }}
        value={form.description}
        onChange={e => update('description', e.target.value)}
        placeholder="Briefly describe the contents of this upload..."
      />
    </Field>

    <FooterButtons>
      <SecondaryButton onClick={onSaveDraft} disabled={busy}>
        <Save size={14} /> Save as Draft
      </SecondaryButton>
      <PrimaryButton onClick={onNext} disabled={busy}>
        Next to File Upload <ArrowRight size={14} />
      </PrimaryButton>
    </FooterButtons>
  </Card>
);

/* -------------------------------------------------------------------------- */
/*  Step 2 — File Upload                                                      */
/* -------------------------------------------------------------------------- */

interface FileUploadStepProps {
  form: FormState;
  errors: Record<string, string>;
  uploadedAttachments: ResourceAttachment[];
  onFiles: (files: FileList | null) => void;
  removePending: (idx: number) => void;
  removeUploaded: (attId: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSaveDraft: () => void;
  busy: boolean;
}

const FileUploadStep: React.FC<FileUploadStepProps> = ({
  form, errors, uploadedAttachments, onFiles, removePending, removeUploaded, onNext, onBack, onSaveDraft, busy,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <Card>
      <CardHeader
        title="Attachments"
        subtitle="Drop in the files students need. They're uploaded to Cloudinary; URLs are kept in MongoDB."
      />

      {/* Hidden input — sibling of the dropzone so programmatic clicks don't bubble back. */}
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
          borderRadius: '0.6rem',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          background: dragOver ? '#EFF6FF' : '#F8FAFC',
          transition: 'background 0.15s, border-color 0.15s',
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Paperclip size={24} color={dragOver ? 'var(--primary)' : '#64748B'} />
        <div style={{ marginTop: '0.6rem', fontSize: '0.95rem', fontWeight: 600, color: '#0F172A' }}>
          Click to choose files or drag &amp; drop
        </div>
        <div style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: '#64748B' }}>
          PDF, DOC, DOCX, PPT, PPTX, images, ZIP — up to {MAX_TOTAL_MB} MB total
        </div>
      </div>
      {errors.attachments && <span style={errorText}>{errors.attachments}</span>}

      {/* Already-uploaded attachments (edit mode) */}
      {uploadedAttachments.length > 0 && (
        <FileGroup label={`UPLOADED · ${uploadedAttachments.length}`} tone="green">
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
        </FileGroup>
      )}

      {/* Pending (not-yet-uploaded) files */}
      {form.pendingFiles.length > 0 && (
        <FileGroup label={`PENDING UPLOAD · ${form.pendingFiles.length}`} tone="amber">
          {form.pendingFiles.map((a, idx) => (
            <AttachmentRow
              key={`${a.name}-${idx}`}
              name={a.name}
              size={a.size}
              type={a.type}
              onRemove={() => removePending(idx)}
            />
          ))}
        </FileGroup>
      )}

      <FooterButtons>
        <SecondaryButton onClick={onBack} disabled={busy}>
          <ChevronLeft size={14} /> Back
        </SecondaryButton>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <SecondaryButton onClick={onSaveDraft} disabled={busy}>
            <Save size={14} /> Save as Draft
          </SecondaryButton>
          <PrimaryButton onClick={onNext} disabled={busy}>
            Next to Settings <ArrowRight size={14} />
          </PrimaryButton>
        </div>
      </FooterButtons>
    </Card>
  );
};

/* -------------------------------------------------------------------------- */
/*  Step 3 — Settings                                                         */
/* -------------------------------------------------------------------------- */

interface SettingsStepProps {
  kind: ResourceKind;
  form: FormState;
  errors: Record<string, string>;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onPreview: () => void;
  onBack: () => void;
  onSaveDraft: () => void;
  busy: boolean;
}

const SettingsStep: React.FC<SettingsStepProps> = ({
  kind, form, errors, update, onPreview, onBack, onSaveDraft, busy,
}) => (
  <Card>
    <CardHeader
      title={kind === 'assignment' ? 'Assignment settings' : 'Notes settings'}
      subtitle={kind === 'assignment'
        ? 'Set when the assignment is due and how many marks it carries.'
        : 'Tag the notes so students can find them inside the right unit.'}
    />

    {kind === 'assignment' ? (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <Field label="Due Date" error={errors.dueDate}>
          <input
            type="date"
            style={fieldStyle(!!errors.dueDate)}
            value={form.dueDate}
            onChange={e => update('dueDate', e.target.value)}
          />
        </Field>
        <Field label="Maximum Marks" error={errors.maxMarks}>
          <input
            type="number"
            min={0}
            style={fieldStyle(!!errors.maxMarks)}
            value={form.maxMarks}
            onChange={e => update('maxMarks', e.target.value)}
            placeholder="e.g. 20"
          />
        </Field>
      </div>
    ) : (
      <Field label="Unit / Chapter tag">
        <input
          type="text"
          style={fieldStyle(false)}
          value={form.unit}
          onChange={e => update('unit', e.target.value)}
          placeholder="e.g. Unit 4 · Greedy Algorithms"
        />
      </Field>
    )}

    <FooterButtons>
      <SecondaryButton onClick={onBack} disabled={busy}>
        <ChevronLeft size={14} /> Back
      </SecondaryButton>
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <SecondaryButton onClick={onSaveDraft} disabled={busy}>
          <Save size={14} /> Save as Draft
        </SecondaryButton>
        <PrimaryButton onClick={onPreview} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          {busy ? 'Uploading…' : 'Next to Preview'}
          {!busy && <ArrowRight size={14} />}
        </PrimaryButton>
      </div>
    </FooterButtons>
  </Card>
);

/* -------------------------------------------------------------------------- */
/*  Building blocks                                                            */
/* -------------------------------------------------------------------------- */

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      background: 'white',
      border: '1px solid #E2E8F0',
      borderRadius: '0.85rem',
      padding: '1.75rem',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      display: 'flex', flexDirection: 'column', gap: '1.25rem',
    }}
  >
    {children}
  </div>
);

const CardHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #F1F5F9' }}>
    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0F172A' }}>{title}</h2>
    <p style={{ margin: '0.35rem 0 0', color: '#64748B', fontSize: '0.88rem' }}>{subtitle}</p>
  </div>
);

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({
  label, error, children,
}) => (
  <div>
    <label style={labelText}>{label}</label>
    {children}
    {error && <span style={errorText}>{error}</span>}
  </div>
);

const fieldStyle = (hasError: boolean): React.CSSProperties => ({
  ...inputStyle,
  borderColor: hasError ? '#EF4444' : '#E2E8F0',
});

const FooterButtons: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: '0.6rem', paddingTop: '0.5rem',
    }}
  >
    {children}
  </div>
);

const PrimaryButton: React.FC<{
  onClick: () => void; disabled?: boolean; children: React.ReactNode;
}> = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.65rem 1.15rem',
      background: 'var(--primary)', color: 'white',
      border: 'none', borderRadius: '0.6rem',
      fontWeight: 600, fontSize: '0.88rem',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      transition: 'opacity 0.15s',
    }}
  >
    {children}
  </button>
);

const SecondaryButton: React.FC<{
  onClick: () => void; disabled?: boolean; children: React.ReactNode;
}> = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.6rem 1rem',
      background: 'white', color: '#334155',
      border: '1px solid #E2E8F0', borderRadius: '0.6rem',
      fontWeight: 600, fontSize: '0.86rem',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      transition: 'opacity 0.15s, background 0.15s',
    }}
  >
    {children}
  </button>
);

const FileGroup: React.FC<{ label: string; tone: 'green' | 'amber'; children: React.ReactNode }> = ({
  label, tone, children,
}) => (
  <div>
    <div
      style={{
        fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.5px',
        color: tone === 'green' ? '#16A34A' : '#B45309', marginBottom: '0.45rem',
      }}
    >
      {label}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{children}</div>
  </div>
);

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
      display: 'flex', alignItems: 'center', gap: '0.65rem',
      padding: '0.6rem 0.85rem', borderRadius: '0.5rem',
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
            fontSize: '0.85rem', fontWeight: 600, color: '#0F172A',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
            textDecoration: 'none',
          }}
        >
          {name}
        </a>
      ) : (
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
      )}
      <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{fmtBytes(size)}{cloud && ' · Cloudinary'}</div>
    </div>
    <button
      type="button"
      onClick={onRemove}
      style={{
        background: 'transparent', border: '1px solid #E2E8F0',
        borderRadius: '0.45rem', padding: '0.3rem',
        cursor: 'pointer', color: '#64748B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      aria-label="Remove attachment"
    >
      <X size={13} />
    </button>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Preview stage (unchanged behaviour)                                        */
/* -------------------------------------------------------------------------- */

const PreviewStage: React.FC<{
  item: Resource;
  divisionLabel: string;
  subjectLabel: string;
}> = ({ item, divisionLabel, subjectLabel }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = item.attachments[activeIdx];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '62% 35.5%', gap: '2.5%', alignItems: 'flex-start' }}>
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

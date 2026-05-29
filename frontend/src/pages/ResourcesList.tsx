import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  ClipboardList, FileText, ChevronLeft, ChevronRight, Plus, Pencil,
  Eye, Trash2, Search, Filter, MoreVertical, Upload as UploadIcon,
  CheckCircle2, Hourglass, FileEdit, ClipboardCheck, Paperclip,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useResources } from '../lib/resources/ResourcesContext';
import type { Resource, ResourceKind } from '../lib/resources/types';
import { ApiError } from '../lib/api';
import { AttachmentPreviewModal } from '../components/ui/AttachmentPreviewModal';

type StatusFilter = 'all' | 'draft' | 'published' | 'grading';

const PAGE_SIZE = 10;

interface Props { kind: ResourceKind }

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export const ResourcesList: React.FC<Props> = ({ kind }) => {
  const navigate = useNavigate();
  const {
    divisions, subjects, divisionId, subjectId, loading,
    itemsForCurrent, publish, deleteItem, setDraftId,
  } = useResources();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [opError, setOpError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<Resource | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const items = itemsForCurrent(kind);
  const now = Date.now();

  // Reset paging when filters change.
  useEffect(() => { setPage(1); }, [statusFilter, query]);

  // Close the filter menu on outside click.
  useEffect(() => {
    if (!filterOpen) return;
    const onClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [filterOpen]);

  /** Maps a Resource to one of the buckets shown in the metric cards. */
  const bucketOf = (i: Resource): 'draft' | 'published' | 'grading' => {
    if (i.status === 'draft') return 'draft';
    if (i.kind === 'assignment' && i.dueDate && new Date(i.dueDate).getTime() < now) {
      return 'grading';
    }
    return 'published';
  };

  const counts = useMemo(() => {
    const c = { total: items.length, published: 0, grading: 0, drafts: 0 };
    for (const i of items) {
      const b = bucketOf(i);
      if (b === 'draft') c.drafts++;
      else if (b === 'grading') c.grading++;
      else c.published++;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, now]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter(i => {
        if (statusFilter === 'all') return true;
        return bucketOf(i) === statusFilter;
      })
      .filter(i => q === '' ? true :
        i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, statusFilter, query, now]);

  if (!divisionId || !subjectId) {
    return <Navigate to="/assignments" replace />;
  }

  const division = divisions.find(d => d._id === divisionId);
  const subject  = subjects.find(s => s._id === subjectId);

  const uploadPath = kind === 'assignment' ? '/assignments/upload/assignment' : '/assignments/upload/notes';
  const pageTitle  = kind === 'assignment' ? 'Manage Assignments' : 'Manage Notes';
  const newLabel   = kind === 'assignment' ? 'Create New Assignment' : 'Create New Notes';
  const headerIcon = kind === 'assignment' ? <ClipboardList size={18} /> : <FileText size={18} />;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageStart  = (page - 1) * PAGE_SIZE;
  const pageItems  = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const onEdit = (item: Resource) => {
    setDraftId(item._id);
    navigate(uploadPath);
  };

  const onView = (item: Resource) => {
    if (item.kind === 'assignment') {
      navigate(`/assignments/list/${item._id}/review`);
    } else {
      // Notes don't have a submissions view — open edit screen as read+edit.
      setDraftId(item._id);
      navigate(uploadPath);
    }
  };

  const onPublish = async (item: Resource) => {
    if (!confirm(`Publish "${item.title}"? Students will be able to see it immediately.`)) return;
    try { await publish(item._id); }
    catch (e) { setOpError(e instanceof ApiError ? e.message : 'Publish failed'); }
  };

  const onDelete = async (item: Resource) => {
    if (!confirm(`Delete "${item.title}"? This also removes all files from Cloudinary.`)) return;
    try { await deleteItem(item._id); }
    catch (e) { setOpError(e instanceof ApiError ? e.message : 'Delete failed'); }
  };

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={headerIcon}
      pageTitle={pageTitle}
      pageBreadcrumb={
        <>
          <button onClick={() => navigate('/assignments')}>Assignments</button>
          {subject && (
            <>
              <ChevronRight size={11} />
              <span className="current">{subject.name} ({subject.code})</span>
            </>
          )}
        </>
      }
      pageActions={
        <>
          {/* Filter dropdown */}
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setFilterOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={filterOpen}
            >
              <Filter size={14} /> Filter
            </button>
            {filterOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30,
                  background: 'white', border: '1px solid #E2E8F0',
                  borderRadius: '0.5rem', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.1)',
                  minWidth: 200, padding: '0.3rem',
                }}
              >
                <FilterRow label="All"        active={statusFilter === 'all'}       onClick={() => { setStatusFilter('all'); setFilterOpen(false); }} />
                <FilterRow label="Published"  active={statusFilter === 'published'} onClick={() => { setStatusFilter('published'); setFilterOpen(false); }} />
                {kind === 'assignment' && (
                  <FilterRow label="Grading" active={statusFilter === 'grading'} onClick={() => { setStatusFilter('grading'); setFilterOpen(false); }} />
                )}
                <FilterRow label="Drafts"     active={statusFilter === 'draft'}     onClick={() => { setStatusFilter('draft'); setFilterOpen(false); }} />
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={() => { setDraftId(null); navigate(uploadPath); }}
          >
            <Plus size={14} /> {newLabel}
          </button>
        </>
      }
    >
      {opError && (
        <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
          {opError}
        </div>
      )}

      {/* Metric cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <MetricCard
          icon={<ClipboardList size={18} />} label={`Total ${kind === 'assignment' ? 'Assignments' : 'Notes'}`}
          value={counts.total} tone="neutral"
        />
        <MetricCard
          icon={<CheckCircle2 size={18} />} label="Published"
          value={counts.published} tone="green"
        />
        {kind === 'assignment' ? (
          <MetricCard
            icon={<Hourglass size={18} />} label="Grading"
            value={counts.grading} tone="amber"
          />
        ) : (
          <MetricCard
            icon={<ClipboardCheck size={18} />} label="With unit tag"
            value={items.filter(i => i.kind === 'notes' && i.unit).length} tone="amber"
          />
        )}
        <MetricCard
          icon={<FileEdit size={18} />} label="Drafts"
          value={counts.drafts} tone="slate"
        />
      </div>

      {/* Table */}
      <div
        style={{
          background: 'white', border: '1px solid #E2E8F0',
          borderRadius: '0.85rem', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Search bar at top of table */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: '#FAFBFC',
          }}
        >
          <Search size={14} color="#94A3B8" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${kind === 'assignment' ? 'assignments' : 'notes'} by title or description`}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: '0.86rem', fontFamily: 'inherit', color: '#0F172A',
            }}
          />
          <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 600 }}>
            {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
          </span>
        </div>

        {loading.items && items.length === 0 ? (
          <EmptyRow message="Loading…" />
        ) : filtered.length === 0 ? (
          <EmptyRow
            message={items.length === 0
              ? `No ${kind === 'assignment' ? 'assignments' : 'notes'} yet for ${subject?.code}`
              : 'Nothing matches your filters'}
            cta={items.length === 0 ? {
              label: newLabel,
              onClick: () => { setDraftId(null); navigate(uploadPath); },
            } : undefined}
          />
        ) : (
          <>
            {/* Header row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2.6fr 1.1fr 1.3fr 1.4fr auto',
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid #F1F5F9',
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.6px',
                color: '#64748B', textTransform: 'uppercase',
              }}
            >
              <div>{kind === 'assignment' ? 'Assignment Title' : 'Notes Title'}</div>
              <div>Status</div>
              <div>{kind === 'assignment' ? 'Due Date' : 'Unit'}</div>
              <div>{kind === 'assignment' ? 'Submissions' : 'Attachments'}</div>
              <div style={{ textAlign: 'right' }}>Actions</div>
            </div>

            {pageItems.map(item => (
              <TableRow
                key={item._id}
                item={item}
                bucket={bucketOf(item)}
                division={division}
                onEdit={() => onEdit(item)}
                onView={() => onView(item)}
                onPreview={() => setPreviewItem(item)}
                onPublish={() => onPublish(item)}
                onDelete={() => onDelete(item)}
              />
            ))}

            {/* Pagination */}
            <div
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.9rem 1.25rem', borderTop: '1px solid #F1F5F9',
                background: '#FAFBFC',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                Showing {pageStart + 1} to {Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length} {kind === 'assignment' ? 'assignments' : 'notes'}
              </span>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {previewItem && (
        <AttachmentPreviewModal
          title={previewItem.title}
          attachments={previewItem.attachments.map(a => ({
            name: a.name, url: a.url, mimeType: a.mimeType,
          }))}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </AppLayout>
  );
};

/* -------------------------------------------------------------------------- */
/*  Metric card                                                                */
/* -------------------------------------------------------------------------- */

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'neutral' | 'green' | 'amber' | 'slate';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, tone }) => {
  const palette = {
    neutral: { bg: 'white',  border: '#E2E8F0', iconBg: '#EFF6FF', iconColor: 'var(--primary)', valueColor: '#0F172A' },
    green:   { bg: '#ECFDF5', border: '#A7F3D0', iconBg: '#DCFCE7', iconColor: '#16A34A',        valueColor: '#14532D' },
    amber:   { bg: '#FEFCE8', border: '#FDE68A', iconBg: '#FEF3C7', iconColor: '#B45309',        valueColor: '#7C2D12' },
    slate:   { bg: '#F8FAFC', border: '#E2E8F0', iconBg: '#E2E8F0', iconColor: '#475569',        valueColor: '#0F172A' },
  }[tone];

  return (
    <div
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: '0.85rem',
        padding: '1.1rem 1.25rem',
        display: 'flex', flexDirection: 'column', gap: '0.85rem',
        minHeight: 108,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: '0.5rem',
            background: palette.iconBg, color: palette.iconColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: palette.valueColor }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '1.85rem', fontWeight: 800, color: palette.valueColor, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Table row                                                                  */
/* -------------------------------------------------------------------------- */

interface TableRowProps {
  item: Resource;
  bucket: 'draft' | 'published' | 'grading';
  division?: { code?: string } | undefined;
  onEdit: () => void;
  onView: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onDelete: () => void;
}

const statusBadge = (bucket: TableRowProps['bucket']): { label: string; bg: string; color: string } => {
  if (bucket === 'draft')    return { label: 'Draft', bg: '#EFF6FF', color: '#3B82F6' };
  if (bucket === 'grading')  return { label: 'Grading in Progress', bg: '#FEF3C7', color: '#92400E' };
  return                       { label: 'Published', bg: '#DCFCE7', color: '#15803D' };
};

const TableRow: React.FC<TableRowProps> = ({ item, bucket, division, onEdit, onView, onPreview, onPublish, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const badge = statusBadge(bucket);

  // Submissions are not yet tracked server-side. The progress bar represents
  // "expected denominator" — when a Submission model lands this should switch
  // to real counts. For now we show 0/—.
  const totalAttachments = item.attachments.length;
  const submissionsNumerator = 0;
  const submissionsDenominator = totalAttachments; // placeholder for future student count

  const subtitle = item.kind === 'assignment'
    ? `${division?.code ?? ''} • ${item.maxMarks !== undefined ? 'Marks ' + item.maxMarks : 'No marks set'}`
    : `${division?.code ?? ''} • ${item.unit ? item.unit : 'No unit tag'}`;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2.6fr 1.1fr 1.3fr 1.4fr auto',
        alignItems: 'center',
        padding: '1rem 1.25rem',
        borderBottom: '1px solid #F1F5F9',
        background: 'white',
      }}
    >
      {/* Title block */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.35 }}>
          {item.title}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.25rem' }}>
          {subtitle}
        </div>
      </div>

      {/* Status pill */}
      <div>
        <span
          style={{
            display: 'inline-block',
            padding: '0.3rem 0.65rem',
            borderRadius: '999px',
            background: badge.bg, color: badge.color,
            fontSize: '0.72rem', fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Due date / Unit */}
      <div style={{ fontSize: '0.84rem', color: '#334155' }}>
        {item.kind === 'assignment' ? (
          item.dueDate ? (
            <>
              {new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
              <span style={{ color: '#94A3B8', margin: '0 0.3rem' }}>•</span>
              11:59 PM
            </>
          ) : (
            <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Not scheduled</span>
          )
        ) : (
          item.unit
            ? <span style={{ fontWeight: 500 }}>{item.unit}</span>
            : <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>—</span>
        )}
      </div>

      {/* Submissions / Attachments progress */}
      <div>
        {item.kind === 'assignment' ? (
          <SubmissionsBar
            numerator={submissionsNumerator}
            denominator={submissionsDenominator}
            bucket={bucket}
          />
        ) : (
          <div style={{ fontSize: '0.84rem', color: '#334155' }}>
            {totalAttachments} file{totalAttachments === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', justifyContent: 'flex-end' }}>
        {totalAttachments > 0 && (
          <IconBtn label="Preview files" onClick={onPreview}>
            <Paperclip size={15} />
          </IconBtn>
        )}
        {bucket === 'draft' ? (
          <>
            <IconBtn label="Publish" onClick={onPublish}><UploadIcon size={15} /></IconBtn>
            <IconBtn label="Edit"    onClick={onEdit}><Pencil size={15} /></IconBtn>
            <IconBtn label="Delete"  onClick={onDelete} danger><Trash2 size={15} /></IconBtn>
          </>
        ) : bucket === 'grading' ? (
          <>
            <button
              onClick={onView}
              style={{
                padding: '0.5rem 0.9rem', borderRadius: '0.5rem',
                background: 'var(--primary)', color: 'white', border: 'none',
                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Grade Now
            </button>
            <RowMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef}
              onEdit={onEdit} onDelete={onDelete} />
          </>
        ) : (
          <>
            <IconBtn label={item.kind === 'assignment' ? 'Review submissions' : 'View'} onClick={onView}>
              <Eye size={15} />
            </IconBtn>
            <IconBtn label="Edit" onClick={onEdit}><Pencil size={15} /></IconBtn>
            <RowMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef}
              onEdit={onEdit} onDelete={onDelete} />
          </>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Submissions bar                                                            */
/* -------------------------------------------------------------------------- */

const SubmissionsBar: React.FC<{
  numerator: number; denominator: number; bucket: 'draft' | 'published' | 'grading';
}> = ({ numerator, denominator, bucket }) => {
  const pct = denominator > 0 ? (numerator / denominator) * 100 : 0;
  const color = bucket === 'grading' ? '#92400E' : 'var(--primary)';
  const dim = bucket === 'draft';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
      <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden', maxWidth: 140 }}>
        <div
          style={{
            height: '100%', width: `${pct}%`,
            background: dim ? '#CBD5E1' : color, borderRadius: 3,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <span
        style={{
          fontSize: '0.78rem', fontWeight: 700,
          color: dim ? '#94A3B8' : color,
          minWidth: 42,
        }}
      >
        {numerator}/{denominator || '—'}
      </span>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Row menu (three-dot)                                                      */
/* -------------------------------------------------------------------------- */

const RowMenu: React.FC<{
  menuOpen: boolean;
  setMenuOpen: (b: boolean) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ menuOpen, setMenuOpen, menuRef, onEdit, onDelete }) => (
  <div ref={menuRef} style={{ position: 'relative' }}>
    <IconBtn label="More" onClick={() => setMenuOpen(!menuOpen)}>
      <MoreVertical size={15} />
    </IconBtn>
    {menuOpen && (
      <div
        role="menu"
        style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 20,
          background: 'white', border: '1px solid #E2E8F0',
          borderRadius: '0.5rem', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.1)',
          minWidth: 150, padding: '0.3rem',
        }}
      >
        <button
          onClick={() => { setMenuOpen(false); onEdit(); }}
          style={menuItemStyle()}
        >
          <Pencil size={13} /> Edit
        </button>
        <button
          onClick={() => { setMenuOpen(false); onDelete(); }}
          style={menuItemStyle(true)}
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    )}
  </div>
);

const menuItemStyle = (danger = false): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  width: '100%', textAlign: 'left', padding: '0.5rem 0.7rem',
  background: 'transparent', border: 'none', borderRadius: '0.35rem',
  fontSize: '0.83rem', fontWeight: 600,
  color: danger ? '#EF4444' : '#334155', cursor: 'pointer',
});

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const IconBtn: React.FC<{
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, danger, children }) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    style={{
      width: 32, height: 32, borderRadius: '0.5rem',
      background: 'transparent', border: '1px solid transparent',
      color: danger ? '#EF4444' : '#475569',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
      transition: 'background 0.12s, border-color 0.12s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
  >
    {children}
  </button>
);

const FilterRow: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({
  label, active, onClick,
}) => (
  <button
    onClick={onClick}
    style={{
      display: 'block', width: '100%', textAlign: 'left',
      padding: '0.5rem 0.75rem', borderRadius: '0.35rem',
      fontSize: '0.83rem', fontWeight: 600,
      background: active ? '#EFF6FF' : 'transparent',
      color: active ? 'var(--primary)' : '#334155',
      border: 'none', cursor: 'pointer',
    }}
  >
    {label}
  </button>
);

const EmptyRow: React.FC<{ message: string; cta?: { label: string; onClick: () => void } }> = ({
  message, cta,
}) => (
  <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
    <p style={{ margin: 0, fontSize: '0.92rem', color: '#475569', fontWeight: 500 }}>{message}</p>
    {cta && (
      <button
        onClick={cta.onClick}
        style={{
          marginTop: '1rem',
          padding: '0.6rem 1.1rem', borderRadius: '0.55rem',
          background: 'var(--primary)', color: 'white', border: 'none',
          fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        }}
      >
        <Plus size={14} /> {cta.label}
      </button>
    )}
  </div>
);

const Pagination: React.FC<{ page: number; totalPages: number; onChange: (p: number) => void }> = ({
  page, totalPages, onChange,
}) => {
  const goto = (p: number) => onChange(Math.max(1, Math.min(totalPages, p)));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 2),
    Math.max(0, page - 2) + 3
  );
  return (
    <div style={{ display: 'flex', gap: '0.35rem' }}>
      <PageBtn onClick={() => goto(page - 1)} disabled={page === 1}>
        <ChevronLeft size={14} />
      </PageBtn>
      {pages.map(p => (
        <PageBtn key={p} onClick={() => goto(p)} active={p === page}>
          {p}
        </PageBtn>
      ))}
      <PageBtn onClick={() => goto(page + 1)} disabled={page === totalPages}>
        <ChevronRight size={14} />
      </PageBtn>
    </div>
  );
};

const PageBtn: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}> = ({ onClick, disabled, active, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      minWidth: 32, height: 32, padding: '0 0.5rem',
      borderRadius: '0.45rem',
      background: active ? 'var(--primary)' : 'white',
      color: active ? 'white' : '#334155',
      border: '1px solid', borderColor: active ? 'var(--primary)' : '#E2E8F0',
      fontWeight: 600, fontSize: '0.83rem',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    {children}
  </button>
);

import React, { useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  ClipboardList, FileText, ChevronLeft, ChevronRight, Plus, Pencil,
  Send, Trash2, Search, Paperclip,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import {
  useResources, type ResourceItem, type ResourceKind,
} from '../lib/resources/ResourcesContext';

type StatusFilter = 'all' | 'draft' | 'published';

const fmtBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

interface Props { kind: ResourceKind }

export const ResourcesList: React.FC<Props> = ({ kind }) => {
  const navigate = useNavigate();
  const {
    divisions, subjects, divisionId, subjectId,
    itemsForCurrent, publishItem, deleteItem, setDraftId,
  } = useResources();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  const items = itemsForCurrent(kind);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter(i => statusFilter === 'all' ? true : i.status === statusFilter)
      .filter(i => q === '' ? true : i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [items, statusFilter, query]);

  if (!divisionId || !subjectId) {
    return <Navigate to="/assignments" replace />;
  }

  const division = divisions.find(d => d._id === divisionId);
  const subject = subjects.find(s => s._id === subjectId);

  const uploadPath = kind === 'assignment' ? '/assignments/upload/assignment' : '/assignments/upload/notes';
  const title = kind === 'assignment' ? 'Check Assignments' : 'Check Notes';
  const icon  = kind === 'assignment' ? <ClipboardList size={18} /> : <FileText size={18} />;

  const onEdit = (item: ResourceItem) => {
    setDraftId(item.id);
    navigate(uploadPath);
  };

  const onPublish = (item: ResourceItem) => {
    if (!confirm(`Publish "${item.title}"? Students will be able to see it immediately.`)) return;
    publishItem(item.id);
  };

  const onDelete = (item: ResourceItem) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    deleteItem(item.id);
  };

  const draftCount = items.filter(i => i.status === 'draft').length;
  const publishedCount = items.filter(i => i.status === 'published').length;

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
          <span className="current">{subject?.code} · {subject?.name}</span>
        </>
      }
      pageActions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/assignments')}>
            <ChevronLeft size={14} /> Back
          </button>
          <button className="btn btn-primary" onClick={() => { setDraftId(null); navigate(uploadPath); }}>
            <Plus size={14} /> {kind === 'assignment' ? 'New Assignment' : 'New Notes'}
          </button>
        </>
      }
    >
      <div className="stack-lg">
        {/* Metrics + filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '1rem', alignItems: 'stretch' }}>
          <Metric label="Total" value={String(items.length)} tone="muted" />
          <Metric label="Published" value={String(publishedCount)} tone="success" />
          <Metric label="Drafts" value={String(draftCount)} tone="warning" />

          <div
            className="card card-compact"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem' }}
          >
            <Search size={14} color="#64748B" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search title or description"
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontSize: '0.85rem', minWidth: 200, fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['all', 'published', 'draft'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '999px',
                fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: statusFilter === f ? 'var(--primary)' : '#E2E8F0',
                background: statusFilter === f ? '#EFF6FF' : 'white',
                color: statusFilter === f ? 'var(--primary)' : '#475569',
              }}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div
            className="card"
            style={{ padding: '3rem 2rem', textAlign: 'center' }}
          >
            <div
              style={{
                width: 52, height: 52, borderRadius: '50%',
                background: '#EFF6FF', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 0.85rem',
              }}
            >
              {icon}
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
              {items.length === 0
                ? `No ${kind === 'assignment' ? 'assignments' : 'notes'} yet for ${subject?.code}`
                : 'Nothing matches your filters'}
            </h3>
            <p style={{ margin: '0.5rem 0 1.25rem', color: '#64748B', fontSize: '0.86rem' }}>
              {items.length === 0
                ? `Create the first one — students will see it once you publish.`
                : `Try clearing the search or switching the status filter.`}
            </p>
            {items.length === 0 && (
              <button className="btn btn-primary" onClick={() => { setDraftId(null); navigate(uploadPath); }}>
                <Plus size={14} /> {kind === 'assignment' ? 'Create assignment' : 'Create notes'}
              </button>
            )}
          </div>
        ) : (
          <div className="stack-md">
            {filtered.map(item => (
              <Row
                key={item.id}
                item={item}
                onEdit={() => onEdit(item)}
                onPublish={() => onPublish(item)}
                onDelete={() => onDelete(item)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const Metric: React.FC<{ label: string; value: string; tone: 'muted' | 'success' | 'warning' }> = ({
  label, value, tone,
}) => {
  const color =
    tone === 'success' ? '#16A34A' :
    tone === 'warning' ? '#D97706' : '#0F172A';
  return (
    <div className="metric-card">
      <div className="metric-card-body">
        <span className="metric-card-label">{label}</span>
        <span className="metric-card-value" style={{ color }}>{value}</span>
      </div>
    </div>
  );
};

const Row: React.FC<{
  item: ResourceItem;
  onEdit: () => void;
  onPublish: () => void;
  onDelete: () => void;
}> = ({ item, onEdit, onPublish, onDelete }) => {
  const totalBytes = item.attachments.reduce((a, x) => a + x.size, 0);
  return (
    <div
      className="card"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '1rem',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
            {item.title}
          </h3>
          <span className={`status-pill ${item.status === 'published' ? 'success' : 'warning'}`}>
            {item.status}
          </span>
          {item.kind === 'assignment' && item.dueDate && (
            <span className="status-pill info">
              Due {new Date(item.dueDate).toLocaleDateString()}
            </span>
          )}
          {item.kind === 'notes' && item.unit && (
            <span className="status-pill muted">{item.unit}</span>
          )}
        </div>
        <p
          style={{
            margin: '0.4rem 0 0', color: '#475569', fontSize: '0.83rem',
            lineHeight: 1.55,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.description}
        </p>
        <div
          style={{
            marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap',
            gap: '0.5rem 1rem', color: '#64748B', fontSize: '0.74rem', fontWeight: 600,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Paperclip size={12} /> {item.attachments.length} file{item.attachments.length === 1 ? '' : 's'}
            · {fmtBytes(totalBytes)}
          </span>
          {item.kind === 'assignment' && item.maxMarks !== undefined && (
            <span>{item.maxMarks} marks</span>
          )}
          <span>Updated {new Date(item.updatedAt).toLocaleString()}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onEdit}>
          <Pencil size={12} /> Edit
        </button>
        {item.status === 'draft' && (
          <button className="btn btn-primary btn-sm" onClick={onPublish}>
            <Send size={12} /> Publish
          </button>
        )}
        <button
          className="btn btn-secondary btn-icon-only btn-sm"
          onClick={onDelete}
          aria-label="Delete"
          title="Delete"
        >
          <Trash2 size={12} color="#EF4444" />
        </button>
      </div>
    </div>
  );
};

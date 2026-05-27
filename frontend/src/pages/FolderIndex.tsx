import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  FolderOpen, Folder, ChevronLeft, ChevronRight, Plus, Trash2, ArrowRight, Loader2,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useResources } from '../lib/resources/ResourcesContext';
import { listResources } from '../lib/resources/api';
import { CreateFolderModal } from '../components/resources/CreateFolderModal';
import type { Resource } from '../lib/resources/types';
import { ApiError } from '../lib/api';

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });

export const FolderIndex: React.FC = () => {
  const navigate = useNavigate();
  const { divisions, subjects, divisionId, subjectId, deleteItem } = useResources();

  const [folders, setFolders] = useState<Resource[]>([]);
  const [counts, setCounts]   = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = async () => {
    if (!divisionId || !subjectId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listResources({
        divisionId, subjectId, kind: 'folder', mine: true,
      });
      setFolders(list);
      // Fire child-count lookups in parallel (cheap because of indexes).
      const entries = await Promise.all(list.map(async f => {
        const kids = await listResources({ parentId: f._id, mine: true });
        return [f._id, kids.length] as const;
      }));
      setCounts(Object.fromEntries(entries));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [divisionId, subjectId]);

  if (!divisionId || !subjectId) {
    return <Navigate to="/assignments" replace />;
  }

  const division = divisions.find(d => d._id === divisionId);
  const subject  = subjects.find(s => s._id === subjectId);

  const onDelete = async (folder: Resource) => {
    const childCount = counts[folder._id] ?? 0;
    const extra = childCount > 0
      ? `\n\nThis will also delete ${childCount} document${childCount === 1 ? '' : 's'} inside, including their files on Cloudinary.`
      : '';
    if (!confirm(`Delete folder "${folder.title}"?${extra}`)) return;
    try {
      await deleteItem(folder._id);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<FolderOpen size={18} />}
      pageTitle="Folders"
      pageBreadcrumb={
        <>
          <button onClick={() => navigate('/assignments')}>Assignments & Notes</button>
          <ChevronRight size={11} />
          <span>{subject?.code} · {subject?.name}</span>
          <ChevronRight size={11} />
          <span className="current">Folders</span>
        </>
      }
      pageActions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/assignments')}>
            <ChevronLeft size={14} /> Back
          </button>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Create Folder
          </button>
        </>
      }
    >
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>Folders</h1>
        <p style={{ margin: '0.35rem 0 0', color: '#64748B', fontSize: '0.9rem' }}>
          Bundle multiple documents for {subject?.name ?? 'this subject'} in {division?.code ?? 'this division'}.
        </p>
      </div>

      {error && (
        <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
          {error}
        </div>
      )}

      {loading && folders.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
          <Loader2 size={18} className="animate-spin" /> Loading folders…
        </div>
      ) : folders.length === 0 ? (
        <div
          style={{
            background: 'white', border: '1px dashed #CBD5E1',
            borderRadius: '0.85rem', padding: '3rem 2rem', textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#FEF3C7', color: '#B45309',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 0.85rem',
            }}
          >
            <FolderOpen size={24} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
            No folders yet for {subject?.code}
          </h3>
          <p style={{ margin: '0.5rem 0 1.25rem', color: '#64748B', fontSize: '0.88rem' }}>
            Folders let you bundle multiple documents under one heading — useful for units, modules, lab series, etc.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              padding: '0.6rem 1.1rem',
              background: 'var(--primary)', color: 'white',
              border: 'none', borderRadius: '0.55rem',
              fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
            }}
          >
            <Plus size={14} /> Create your first folder
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {folders.map(f => (
            <FolderCard
              key={f._id}
              folder={f}
              childCount={counts[f._id] ?? 0}
              onOpen={() => navigate(`/assignments/folders/${f._id}`)}
              onDelete={() => onDelete(f)}
            />
          ))}
        </div>
      )}

      <CreateFolderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(folderId) => navigate(`/assignments/folders/${folderId}`)}
      />
    </AppLayout>
  );
};

const FolderCard: React.FC<{
  folder: Resource;
  childCount: number;
  onOpen: () => void;
  onDelete: () => void;
}> = ({ folder, childCount, onOpen, onDelete }) => (
  <div
    style={{
      background: 'white', border: '1px solid #E2E8F0',
      borderRadius: '0.85rem', padding: '1.1rem 1.2rem',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      display: 'flex', flexDirection: 'column', gap: '0.85rem',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      cursor: 'pointer',
    }}
    onClick={onOpen}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#E2E8F0'; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div
        style={{
          width: 42, height: 42, borderRadius: '0.55rem',
          background: '#FEF3C7', color: '#B45309',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Folder size={20} />
      </div>
      <span className={`status-pill ${folder.status === 'published' ? 'success' : 'warning'}`}>
        {folder.status}
      </span>
    </div>

    <div>
      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
        {folder.title}
      </div>
      <p
        style={{
          margin: '0.35rem 0 0', color: '#64748B', fontSize: '0.82rem', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}
      >
        {folder.description}
      </p>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '0.7rem' }}>
      <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>
        {childCount} document{childCount === 1 ? '' : 's'} · {formatDate(folder.updatedAt)}
      </div>
      <div style={{ display: 'flex', gap: '0.35rem' }}>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          title="Delete folder"
          style={{
            width: 30, height: 30, borderRadius: '0.4rem',
            background: 'transparent', border: '1px solid transparent',
            color: '#EF4444', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Trash2 size={13} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onOpen(); }}
          title="Open folder"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.4rem 0.7rem',
            background: 'var(--primary)', color: 'white',
            border: 'none', borderRadius: '0.4rem',
            fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Open <ArrowRight size={12} />
        </button>
      </div>
    </div>
  </div>
);

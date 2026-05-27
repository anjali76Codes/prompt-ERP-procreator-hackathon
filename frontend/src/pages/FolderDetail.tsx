import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Folder, FolderOpen, ChevronRight, ChevronLeft, Plus, FileText, ClipboardList,
  Pencil, Send, Trash2, Eye, Paperclip, Loader2, FileEdit, Upload as UploadIcon,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useResources } from '../lib/resources/ResourcesContext';
import { fetchResource, listResources } from '../lib/resources/api';
import type { Resource } from '../lib/resources/types';
import { ApiError } from '../lib/api';

const fmtBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export const FolderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { publish, deleteItem, setDraftId } = useResources();

  const [folder, setFolder] = useState<Resource | null>(null);
  const [children, setChildren] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [f, kids] = await Promise.all([
        fetchResource(id),
        listResources({ parentId: id }),
      ]);
      setFolder(f);
      setChildren(kids);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load folder');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (!id) return null;

  const division = folder && typeof folder.division !== 'string' ? folder.division : null;
  const subject  = folder && typeof folder.subject  !== 'string' ? folder.subject  : null;
  const isFolder = folder?.kind === 'folder';

  const handleAdd = (kind: 'assignment' | 'notes') => () => {
    setDraftId(null);
    navigate(`/assignments/upload/${kind}?parent=${id}`);
  };

  const handlePublishFolder = async () => {
    if (!folder) return;
    if (!confirm('Publish this folder? Students will see it in their feed.')) return;
    try {
      const updated = await publish(folder._id);
      setFolder(updated);
    } catch (e) {
      setOpError(e instanceof ApiError ? e.message : 'Publish failed');
    }
  };

  const handleDeleteFolder = async () => {
    if (!folder) return;
    const childMsg = children.length > 0
      ? `\n\nThis will also delete ${children.length} document${children.length === 1 ? '' : 's'} inside, including any files on Cloudinary.`
      : '';
    if (!confirm(`Delete folder "${folder.title}"?${childMsg}`)) return;
    try {
      await deleteItem(folder._id);
      navigate('/assignments/folders');
    } catch (e) {
      setOpError(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  const handleEditFolder = () => {
    if (!folder) return;
    setDraftId(folder._id);
    navigate('/assignments/upload/notes'); // wizard handles editing existing folder metadata too — but folders can't be edited that way; show a friendlier path later
  };

  const childPublishedCount = children.filter(c => c.status === 'published').length;
  const childDraftCount     = children.filter(c => c.status === 'draft').length;

  return (
    <AppLayout
      background="#F8FAFC"
      pageIcon={<Folder size={18} />}
      pageTitle={folder?.title ?? 'Folder'}
      pageBreadcrumb={
        <>
          <button onClick={() => navigate('/assignments')}>Assignments & Notes</button>
          <ChevronRight size={11} />
          <button onClick={() => navigate('/assignments/folders')}>Folders</button>
          <ChevronRight size={11} />
          <span className="current">{folder?.title ?? 'Loading…'}</span>
        </>
      }
      pageActions={
        <>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/assignments/folders')}>
            <ChevronLeft size={14} /> Back
          </button>
          {folder && isFolder && folder.status === 'draft' && (
            <button className="btn btn-primary btn-sm" onClick={handlePublishFolder}>
              <Send size={14} /> Publish folder
            </button>
          )}
        </>
      }
    >
      {error && (
        <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
          {error}
        </div>
      )}
      {opError && (
        <div className="status-pill danger" style={{ marginBottom: '1rem', textTransform: 'none' }}>
          {opError}
        </div>
      )}

      {loading && !folder ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
          <Loader2 size={18} className="animate-spin" /> Loading folder…
        </div>
      ) : !folder ? null : !isFolder ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          That resource isn't a folder.{' '}
          <button onClick={() => navigate('/assignments/folders')}>Back to folders</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '1.25rem', alignItems: 'flex-start' }}>
          {/* Main column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Folder header card */}
            <div
              style={{
                background: 'white', border: '1px solid #E2E8F0',
                borderRadius: '0.85rem', padding: '1.5rem',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                display: 'flex', alignItems: 'flex-start', gap: '1rem',
              }}
            >
              <div
                style={{
                  width: 56, height: 56, borderRadius: '0.6rem',
                  background: '#FEF3C7', color: '#B45309',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <FolderOpen size={26} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
                    {folder.title}
                  </h1>
                  <span
                    className={`status-pill ${folder.status === 'published' ? 'success' : 'warning'}`}
                  >
                    {folder.status}
                  </span>
                </div>
                <p style={{ margin: '0.5rem 0 0', color: '#475569', fontSize: '0.88rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  {folder.description}
                </p>
                <div style={{ marginTop: '0.65rem', fontSize: '0.76rem', color: '#64748B', fontWeight: 500, display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem' }}>
                  {division && <span>{division.code} · {division.name}</span>}
                  {subject  && <span>{subject.code} · {subject.name}</span>}
                  <span>Created {formatDate(folder.createdAt)}</span>
                </div>
              </div>
              <button
                onClick={handleDeleteFolder}
                title="Delete folder"
                aria-label="Delete folder"
                style={{
                  background: 'transparent', border: '1px solid #E2E8F0',
                  borderRadius: '0.45rem', padding: '0.4rem',
                  cursor: 'pointer', color: '#EF4444',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Add Document toolbar */}
            <div
              style={{
                background: 'white', border: '1px solid #E2E8F0',
                borderRadius: '0.85rem', padding: '1rem 1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '0.75rem',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                  Documents
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
                  {children.length} document{children.length === 1 ? '' : 's'}
                  {children.length > 0 && ` · ${childPublishedCount} published · ${childDraftCount} draft`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleAdd('notes')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                    padding: '0.6rem 1rem',
                    background: 'white', color: '#334155',
                    border: '1px solid #E2E8F0', borderRadius: '0.55rem',
                    fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <FileText size={14} /> Add Notes
                </button>
                <button
                  onClick={handleAdd('assignment')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                    padding: '0.6rem 1.1rem',
                    background: 'var(--primary)', color: 'white',
                    border: 'none', borderRadius: '0.55rem',
                    fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> Add Document
                </button>
              </div>
            </div>

            {/* Children list */}
            {children.length === 0 ? (
              <div
                style={{
                  background: 'white', border: '1px dashed #CBD5E1',
                  borderRadius: '0.85rem', padding: '3rem 2rem',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: '#FEF3C7', color: '#B45309',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 0.75rem',
                  }}
                >
                  <FolderOpen size={22} />
                </div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0F172A' }}>
                  This folder is empty
                </h3>
                <p style={{ margin: '0.4rem 0 1rem', fontSize: '0.86rem', color: '#64748B' }}>
                  Click <strong>Add Document</strong> above to upload assignments or notes into this folder.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {children.map(child => (
                  <ChildRow
                    key={child._id}
                    item={child}
                    onEdit={() => { setDraftId(child._id); navigate(`/assignments/upload/${child.kind === 'assignment' ? 'assignment' : 'notes'}?parent=${id}`); }}
                    onPublish={async () => {
                      if (!confirm(`Publish "${child.title}"?`)) return;
                      try { const updated = await publish(child._id); setChildren(prev => prev.map(c => c._id === child._id ? updated : c)); }
                      catch (e) { setOpError(e instanceof ApiError ? e.message : 'Publish failed'); }
                    }}
                    onDelete={async () => {
                      if (!confirm(`Delete "${child.title}"? This also removes its files from Cloudinary.`)) return;
                      try { await deleteItem(child._id); setChildren(prev => prev.filter(c => c._id !== child._id)); }
                      catch (e) { setOpError(e instanceof ApiError ? e.message : 'Delete failed'); }
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right rail — folder stats */}
          <SideStats
            children={children}
            onEditFolder={handleEditFolder}
            folderStatus={folder.status}
          />
        </div>
      )}
    </AppLayout>
  );
};

/* -------------------------------------------------------------------------- */
/*  Child row                                                                  */
/* -------------------------------------------------------------------------- */

const ChildRow: React.FC<{
  item: Resource;
  onEdit: () => void;
  onPublish: () => void;
  onDelete: () => void;
}> = ({ item, onEdit, onPublish, onDelete }) => {
  const totalBytes = item.attachments.reduce((a, x) => a + x.size, 0);
  const isAssignment = item.kind === 'assignment';
  const accent = isAssignment ? 'var(--primary)' : '#16A34A';
  const bg     = isAssignment ? '#EFF6FF' : '#DCFCE7';

  return (
    <div
      style={{
        background: 'white', border: '1px solid #E2E8F0',
        borderRadius: '0.7rem', padding: '0.9rem 1.1rem',
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0.85rem',
        alignItems: 'center',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: '0.5rem',
          background: bg, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isAssignment ? <ClipboardList size={16} /> : <FileText size={16} />}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>{item.title}</span>
          <span className={`status-pill ${item.status === 'published' ? 'success' : 'warning'}`}>
            {item.status}
          </span>
          {isAssignment && item.dueDate && (
            <span className="status-pill info">Due {formatDate(item.dueDate)}</span>
          )}
        </div>
        <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '0.2rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Paperclip size={11} /> {item.attachments.length} file{item.attachments.length === 1 ? '' : 's'} · {fmtBytes(totalBytes)}
          </span>
          <span>Updated {new Date(item.updatedAt).toLocaleString()}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.3rem' }}>
        {item.status === 'draft' && (
          <IconBtn label="Publish" onClick={onPublish}><UploadIcon size={14} /></IconBtn>
        )}
        <IconBtn label="Edit" onClick={onEdit}><Pencil size={14} /></IconBtn>
        <IconBtn label="Preview" onClick={onEdit}><Eye size={14} /></IconBtn>
        <IconBtn label="Delete" onClick={onDelete} danger><Trash2 size={14} /></IconBtn>
      </div>
    </div>
  );
};

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
      width: 32, height: 32, borderRadius: '0.45rem',
      background: 'transparent', border: '1px solid transparent',
      color: danger ? '#EF4444' : '#475569',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
      transition: 'background 0.12s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
  >
    {children}
  </button>
);

/* -------------------------------------------------------------------------- */
/*  Side stats                                                                 */
/* -------------------------------------------------------------------------- */

const SideStats: React.FC<{
  children: Resource[];
  onEditFolder: () => void;
  folderStatus: Resource['status'];
}> = ({ children, onEditFolder, folderStatus }) => {
  const totalFiles = children.reduce((a, c) => a + c.attachments.length, 0);
  const totalBytes = children.reduce((a, c) => a + c.attachments.reduce((b, x) => b + x.size, 0), 0);
  const assignments = children.filter(c => c.kind === 'assignment').length;
  const notes       = children.filter(c => c.kind === 'notes').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '1rem' }}>
      <div
        style={{
          background: 'white', border: '1px solid #E2E8F0',
          borderRadius: '0.7rem', padding: '1.1rem 1.25rem',
        }}
      >
        <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.6px', color: '#64748B' }}>
          FOLDER OVERVIEW
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <StatRow label="Documents"    value={String(children.length)} />
          <StatRow label="Assignments"  value={String(assignments)} />
          <StatRow label="Notes"        value={String(notes)} />
          <StatRow label="Total files"  value={String(totalFiles)} />
          <StatRow label="Total size"   value={fmtBytes(totalBytes)} />
        </div>
      </div>

      <div
        style={{
          background: folderStatus === 'published' ? '#ECFDF5' : '#FFFBEB',
          border: `1px solid ${folderStatus === 'published' ? '#A7F3D0' : '#FDE68A'}`,
          borderRadius: '0.7rem', padding: '1rem 1.1rem',
        }}
      >
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: folderStatus === 'published' ? '#15803D' : '#B45309' }}>
          {folderStatus === 'published' ? 'Folder is published' : 'Folder is a draft'}
        </div>
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', lineHeight: 1.55, color: folderStatus === 'published' ? '#166534' : '#92400E' }}>
          {folderStatus === 'published'
            ? 'Students of the matching division see this folder and any published documents inside it.'
            : 'Drafts are private. Publish the folder when you\'re ready for students to see it. Individual documents have their own publish state.'}
        </p>
        <button
          onClick={onEditFolder}
          style={{
            marginTop: '0.7rem',
            padding: '0.45rem 0.85rem',
            background: 'white', color: '#334155',
            border: '1px solid #E2E8F0', borderRadius: '0.45rem',
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          <FileEdit size={13} /> Edit folder details
        </button>
      </div>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
    <span style={{ fontSize: '0.8rem', color: '#475569' }}>{label}</span>
    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>{value}</span>
  </div>
);

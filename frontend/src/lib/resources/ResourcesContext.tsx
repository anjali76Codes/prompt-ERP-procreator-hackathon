import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { fetchMyDivisions, fetchMySubjects } from '../erp/api';
import type { Division, Subject } from '../erp/types';
import { useAuth } from '../auth/AuthContext';

export type ResourceKind = 'assignment' | 'notes';
export type ResourceStatus = 'draft' | 'published';

export interface ResourceAttachment {
  name: string;
  size: number;
  type: string;
  /** Object URL kept alive for the lifetime of this session. */
  url: string;
}

export interface ResourceItem {
  id: string;
  kind: ResourceKind;
  status: ResourceStatus;
  divisionId: string;
  subjectId: string;
  title: string;
  description: string;
  /** Assignment-only: ISO date (yyyy-mm-dd) the student must submit by. */
  dueDate?: string;
  /** Assignment-only: maximum marks. */
  maxMarks?: number;
  /** Notes-only: free-form unit/chapter tag. */
  unit?: string;
  attachments: ResourceAttachment[];
  createdAt: string;
  updatedAt: string;
}

interface ResourcesContextValue {
  // Reference data (from backend).
  divisions: Division[];
  subjects: Subject[];
  loading: { divisions: boolean; subjects: boolean };
  error: string | null;

  // Selection (persists across pages of the flow).
  divisionId: string | null;
  subjectId: string | null;
  selectDivision: (id: string | null) => void;
  selectSubject: (id: string | null) => void;
  resetSelection: () => void;

  // In-memory store of created items.
  items: ResourceItem[];
  upsertItem: (item: ResourceItem) => void;
  publishItem: (id: string) => void;
  deleteItem: (id: string) => void;
  getItem: (id: string) => ResourceItem | undefined;

  // Editing handoff between Upload form and Preview view.
  draftId: string | null;
  setDraftId: (id: string | null) => void;

  // Helpers
  itemsForCurrent: (kind: ResourceKind) => ResourceItem[];
}

const Ctx = createContext<ResourcesContextValue | null>(null);

const newId = (): string =>
  `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const ResourcesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState({ divisions: false, subjects: false });
  const [error, setError] = useState<string | null>(null);

  const [divisionId, setDivisionId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);

  const [items, setItems] = useState<ResourceItem[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);

  // Load teacher's divisions + subjects on login.
  useEffect(() => {
    if (!user || user.role !== 'teacher') return;
    let cancelled = false;
    setLoading({ divisions: true, subjects: true });
    Promise.all([fetchMyDivisions(), fetchMySubjects()])
      .then(([d, s]) => {
        if (cancelled) return;
        setDivisions(d);
        setSubjects(s);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load divisions/subjects');
      })
      .finally(() => {
        if (!cancelled) setLoading({ divisions: false, subjects: false });
      });
    return () => { cancelled = true; };
  }, [user]);

  const selectDivision = useCallback((id: string | null) => {
    setDivisionId(id);
    setSubjectId(null); // changing division invalidates subject choice
  }, []);
  const selectSubject = useCallback((id: string | null) => setSubjectId(id), []);
  const resetSelection = useCallback(() => {
    setDivisionId(null);
    setSubjectId(null);
    setDraftId(null);
  }, []);

  const upsertItem = useCallback((item: ResourceItem) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === item.id);
      if (idx === -1) return [...prev, item];
      const next = prev.slice();
      next[idx] = item;
      return next;
    });
  }, []);

  const publishItem = useCallback((id: string) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, status: 'published', updatedAt: new Date().toISOString() } : i
    ));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const getItem = useCallback(
    (id: string) => items.find(i => i.id === id),
    [items]
  );

  const itemsForCurrent = useCallback(
    (kind: ResourceKind) =>
      items.filter(i => i.kind === kind && i.divisionId === divisionId && i.subjectId === subjectId),
    [items, divisionId, subjectId]
  );

  const value = useMemo<ResourcesContextValue>(() => ({
    divisions, subjects, loading, error,
    divisionId, subjectId, selectDivision, selectSubject, resetSelection,
    items, upsertItem, publishItem, deleteItem, getItem,
    draftId, setDraftId,
    itemsForCurrent,
  }), [
    divisions, subjects, loading, error,
    divisionId, subjectId, selectDivision, selectSubject, resetSelection,
    items, upsertItem, publishItem, deleteItem, getItem,
    draftId, itemsForCurrent,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useResources = (): ResourcesContextValue => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useResources must be used within <ResourcesProvider>');
  return ctx;
};

export { newId as newResourceId };

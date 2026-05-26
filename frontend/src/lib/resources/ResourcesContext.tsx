import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { fetchMyDivisions, fetchMySubjects } from '../erp/api';
import type { Division, Subject } from '../erp/types';
import { useAuth } from '../auth/AuthContext';
import {
  listResources, createResource, updateResource as apiUpdateResource,
  publishResource as apiPublishResource, unpublishResource as apiUnpublishResource,
  deleteResource as apiDeleteResource, addAttachments, removeAttachment,
  type CreateResourceBody, type UpdateResourceBody,
} from './api';
import type { Resource, ResourceKind } from './types';

interface ResourcesContextValue {
  // Reference data.
  divisions: Division[];
  subjects: Subject[];
  loading: { divisions: boolean; subjects: boolean; items: boolean };
  error: string | null;

  // Selection (in-memory only — drives which subject/division the teacher is working on).
  divisionId: string | null;
  subjectId: string | null;
  selectDivision: (id: string | null) => void;
  selectSubject: (id: string | null) => void;
  resetSelection: () => void;

  // Backend-backed item store.
  items: Resource[];
  refresh: () => Promise<void>;
  createItem: (body: CreateResourceBody) => Promise<Resource>;
  updateItem: (id: string, body: UpdateResourceBody) => Promise<Resource>;
  addFiles:   (id: string, files: File[]) => Promise<Resource>;
  removeFile: (id: string, attId: string) => Promise<Resource>;
  publish:    (id: string) => Promise<Resource>;
  unpublish:  (id: string) => Promise<Resource>;
  deleteItem: (id: string) => Promise<void>;
  getItem:    (id: string) => Resource | undefined;
  itemsForCurrent: (kind: ResourceKind) => Resource[];

  // Draft handoff between Upload form and Preview view.
  draftId: string | null;
  setDraftId: (id: string | null) => void;
}

const Ctx = createContext<ResourcesContextValue | null>(null);

export const ResourcesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState({ divisions: false, subjects: false, items: false });
  const [error, setError] = useState<string | null>(null);

  const [divisionId, setDivisionId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);

  const [items, setItems] = useState<Resource[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);

  /* ---- Load divisions + subjects (teacher only) -------------------- */
  useEffect(() => {
    if (!isTeacher) return;
    let cancelled = false;
    setLoading(l => ({ ...l, divisions: true, subjects: true }));
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
        if (!cancelled) setLoading(l => ({ ...l, divisions: false, subjects: false }));
      });
    return () => { cancelled = true; };
  }, [isTeacher]);

  /* ---- Load resources for the active division+subject -------------- */
  const refresh = useCallback(async () => {
    if (!isTeacher) return;
    if (!divisionId || !subjectId) { setItems([]); return; }
    setLoading(l => ({ ...l, items: true }));
    try {
      const list = await listResources({
        divisionId,
        subjectId,
        mine: true,
      });
      setItems(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load resources');
    } finally {
      setLoading(l => ({ ...l, items: false }));
    }
  }, [isTeacher, divisionId, subjectId]);

  useEffect(() => { void refresh(); }, [refresh]);

  /* ---- Selection helpers ------------------------------------------- */
  const selectDivision = useCallback((id: string | null) => {
    setDivisionId(id);
    setSubjectId(null);
  }, []);
  const selectSubject = useCallback((id: string | null) => setSubjectId(id), []);
  const resetSelection = useCallback(() => {
    setDivisionId(null);
    setSubjectId(null);
    setDraftId(null);
  }, []);

  /* ---- Mutations --------------------------------------------------- */
  const replaceItem = (next: Resource) =>
    setItems(prev => {
      const idx = prev.findIndex(i => i._id === next._id);
      if (idx === -1) return [next, ...prev];
      const out = prev.slice();
      out[idx] = next;
      return out;
    });

  const createItem = useCallback(async (body: CreateResourceBody) => {
    const created = await createResource(body);
    replaceItem(created);
    return created;
  }, []);

  const updateItem = useCallback(async (id: string, body: UpdateResourceBody) => {
    const updated = await apiUpdateResource(id, body);
    replaceItem(updated);
    return updated;
  }, []);

  const addFiles = useCallback(async (id: string, files: File[]) => {
    const updated = await addAttachments(id, files);
    replaceItem(updated);
    return updated;
  }, []);

  const removeFile = useCallback(async (id: string, attId: string) => {
    const updated = await removeAttachment(id, attId);
    replaceItem(updated);
    return updated;
  }, []);

  const publish = useCallback(async (id: string) => {
    const updated = await apiPublishResource(id);
    replaceItem(updated);
    return updated;
  }, []);

  const unpublish = useCallback(async (id: string) => {
    const updated = await apiUnpublishResource(id);
    replaceItem(updated);
    return updated;
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    await apiDeleteResource(id);
    setItems(prev => prev.filter(i => i._id !== id));
    if (draftId === id) setDraftId(null);
  }, [draftId]);

  const getItem = useCallback(
    (id: string) => items.find(i => i._id === id),
    [items]
  );

  const itemsForCurrent = useCallback(
    (kind: ResourceKind) =>
      items.filter(i => {
        const divId = typeof i.division === 'string' ? i.division : i.division._id;
        const subId = typeof i.subject === 'string'  ? i.subject  : i.subject._id;
        return i.kind === kind && divId === divisionId && subId === subjectId;
      }),
    [items, divisionId, subjectId]
  );

  const value = useMemo<ResourcesContextValue>(() => ({
    divisions, subjects, loading, error,
    divisionId, subjectId, selectDivision, selectSubject, resetSelection,
    items, refresh, createItem, updateItem, addFiles, removeFile,
    publish, unpublish, deleteItem, getItem, itemsForCurrent,
    draftId, setDraftId,
  }), [
    divisions, subjects, loading, error,
    divisionId, subjectId, selectDivision, selectSubject, resetSelection,
    items, refresh, createItem, updateItem, addFiles, removeFile,
    publish, unpublish, deleteItem, getItem, itemsForCurrent,
    draftId,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useResources = (): ResourcesContextValue => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useResources must be used within <ResourcesProvider>');
  return ctx;
};

export type { Resource, ResourceKind } from './types';

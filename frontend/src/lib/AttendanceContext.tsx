import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  fetchLecture, fetchLectureRoster, fetchMyDivisions, fetchLectures,
  markAttendance as apiMarkAttendance,
} from './erp/api';
import type {
  AttendanceMarkEntry, AttendanceStatus, Division, Lecture, RosterEntry,
} from './erp/types';
import { useAuth } from './auth/AuthContext';

export type { AttendanceStatus, Lecture, Division, RosterEntry };

interface SelectionState {
  divisionId: string | null;
  lectureId: string | null;
}

interface AttendanceContextValue {
  // Selection state
  divisionId: string | null;
  lectureId: string | null;
  selectDivision: (id: string | null) => void;
  selectLecture: (id: string | null) => void;

  // Data
  divisions: Division[];
  lectures: Lecture[];
  lecture: Lecture | null;
  roster: RosterEntry[];

  // Loading flags
  loading: { divisions: boolean; lectures: boolean; roster: boolean; saving: boolean };
  error: string | null;

  // Local overrides (in-memory until `saveAttendance` flushes them).
  localStatus: Record<string, AttendanceStatus>;
  localRemarks: Record<string, string>;
  setLocalStatus: (studentId: string, status: AttendanceStatus) => void;
  setLocalRemarks: (studentId: string, remarks: string) => void;
  setAllLocalStatus: (status: AttendanceStatus) => void;

  // Persistence
  refreshLectures: () => Promise<void>;
  refreshRoster: () => Promise<void>;
  saveAttendance: () => Promise<{ count: number }>;

  // Derived
  presentCount: number;
  absentCount: number;
  presentPct: number;
}

const Ctx = createContext<AttendanceContextValue | null>(null);

const today = () => new Date();

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [sel, setSel] = useState<SelectionState>({ divisionId: null, lectureId: null });

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  // Local-only overrides keyed by studentId. Flushed to backend on `saveAttendance`.
  const [localStatus, setLocalStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [localRemarks, setLocalRemarksMap] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState({
    divisions: false, lectures: false, roster: false, saving: false,
  });
  const [error, setError] = useState<string | null>(null);

  /* ---- Load teacher's divisions on login ------------------------- */
  useEffect(() => {
    if (!user || user.role !== 'teacher') return;
    let cancelled = false;
    setLoading(l => ({ ...l, divisions: true }));
    fetchMyDivisions()
      .then(d => { if (!cancelled) setDivisions(d); })
      .catch(e => { if (!cancelled) setError(e?.message ?? 'Failed to load divisions'); })
      .finally(() => { if (!cancelled) setLoading(l => ({ ...l, divisions: false })); });
    return () => { cancelled = true; };
  }, [user]);

  /* ---- Load lectures whenever the selected division changes ------ */
  const refreshLectures = useCallback(async () => {
    if (!sel.divisionId) { setLectures([]); return; }
    setLoading(l => ({ ...l, lectures: true }));
    try {
      const list = await fetchLectures({ divisionId: sel.divisionId, date: today() });
      setLectures(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load lectures');
    } finally {
      setLoading(l => ({ ...l, lectures: false }));
    }
  }, [sel.divisionId]);

  useEffect(() => { void refreshLectures(); }, [refreshLectures]);

  /* ---- Load lecture detail + roster ------------------------------ */
  const refreshRoster = useCallback(async () => {
    if (!sel.lectureId) { setLecture(null); setRoster([]); return; }
    setLoading(l => ({ ...l, roster: true }));
    try {
      const [lec, ros] = await Promise.all([
        fetchLecture(sel.lectureId),
        fetchLectureRoster(sel.lectureId),
      ]);
      setLecture(lec);
      setRoster(ros);
      // Seed local overrides with whatever's already saved on the server.
      const initStatus: Record<string, AttendanceStatus> = {};
      const initRemarks: Record<string, string> = {};
      for (const r of ros) {
        if (r.attendance) {
          initStatus[r.student._id] = r.attendance.status;
          if (r.attendance.remarks) initRemarks[r.student._id] = r.attendance.remarks;
        } else {
          initStatus[r.student._id] = 'present'; // optimistic default
        }
      }
      setLocalStatusMap(initStatus);
      setLocalRemarksMap(initRemarks);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load roster');
    } finally {
      setLoading(l => ({ ...l, roster: false }));
    }
  }, [sel.lectureId]);

  useEffect(() => { void refreshRoster(); }, [refreshRoster]);

  /* ---- Selection helpers ----------------------------------------- */
  const selectDivision = useCallback((id: string | null) => {
    setSel({ divisionId: id, lectureId: null });
  }, []);
  const selectLecture = useCallback((id: string | null) => {
    setSel(prev => ({ ...prev, lectureId: id }));
  }, []);

  /* ---- Local mutations ------------------------------------------- */
  const setLocalStatus = useCallback((studentId: string, status: AttendanceStatus) => {
    setLocalStatusMap(prev => ({ ...prev, [studentId]: status }));
  }, []);
  const setLocalRemarks = useCallback((studentId: string, remarks: string) => {
    setLocalRemarksMap(prev => ({ ...prev, [studentId]: remarks }));
  }, []);
  const setAllLocalStatus = useCallback((status: AttendanceStatus) => {
    setLocalStatusMap(() => {
      const next: Record<string, AttendanceStatus> = {};
      for (const r of roster) next[r.student._id] = status;
      return next;
    });
  }, [roster]);

  /* ---- Persist --------------------------------------------------- */
  const saveAttendance = useCallback(async () => {
    if (!sel.lectureId) throw new Error('No lecture selected');
    const entries: AttendanceMarkEntry[] = roster.map(r => ({
      student: r.student._id,
      status: localStatus[r.student._id] ?? 'absent',
      remarks: localRemarks[r.student._id],
    }));
    setLoading(l => ({ ...l, saving: true }));
    try {
      const result = await apiMarkAttendance(sel.lectureId, entries);
      // Refresh roster *and* the lecture list so the overview reflects the
      // 'completed' status without forcing the user to reload.
      await Promise.all([refreshRoster(), refreshLectures()]);
      return { count: result.count };
    } finally {
      setLoading(l => ({ ...l, saving: false }));
    }
  }, [sel.lectureId, roster, localStatus, localRemarks, refreshRoster, refreshLectures]);

  /* ---- Derived counts (use local overrides, not server state) ---- */
  const presentCount = roster.reduce((acc, r) => {
    const s = localStatus[r.student._id];
    return s === 'present' || s === 'late' ? acc + 1 : acc;
  }, 0);
  const absentCount = roster.length - presentCount;
  const presentPct = roster.length === 0 ? 0 : Math.round((presentCount / roster.length) * 100);

  const value = useMemo<AttendanceContextValue>(() => ({
    divisionId: sel.divisionId,
    lectureId: sel.lectureId,
    selectDivision,
    selectLecture,
    divisions,
    lectures,
    lecture,
    roster,
    loading,
    error,
    localStatus,
    localRemarks,
    setLocalStatus,
    setLocalRemarks,
    setAllLocalStatus,
    refreshLectures,
    refreshRoster,
    saveAttendance,
    presentCount,
    absentCount,
    presentPct,
  }), [
    sel, selectDivision, selectLecture, divisions, lectures, lecture, roster,
    loading, error, localStatus, localRemarks,
    setLocalStatus, setLocalRemarks, setAllLocalStatus,
    refreshLectures, refreshRoster, saveAttendance,
    presentCount, absentCount, presentPct,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAttendance = (): AttendanceContextValue => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAttendance must be used within <AttendanceProvider>');
  return ctx;
};


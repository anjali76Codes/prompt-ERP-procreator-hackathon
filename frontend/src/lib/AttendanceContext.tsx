import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type AttendanceStatus = 'P' | 'A';

export interface StudentRow {
  roll: string;
  name: string;
  avatar: string;
  status: AttendanceStatus;
  late: boolean;
  remarks: string;
}

export interface LectureContext {
  subject: string;
  subjectCode: string;
  section: string;
  room: string;
  date: string;
  timeSlot: string;
  facultyName: string;
  totalEnrolled: number;
}

export interface AttendanceSession {
  id: string;
  lecture: LectureContext;
  roster: StudentRow[];
  draftSavedAt: string | null;
  validated: boolean;
}

const DEFAULT_LECTURE: LectureContext = {
  subject: 'Advanced Math',
  subjectCode: 'MATH-301',
  section: 'CS-A',
  room: 'Hall 7-A (Main)',
  date: 'Oct 24, 2023',
  timeSlot: '09:00 AM - 10:30 AM',
  facultyName: 'Prof. R. Vance',
  totalEnrolled: 46,
};

const DEFAULT_ROSTER: StudentRow[] = [
  { roll: '101', name: 'Aaron Bennett',  avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=80&h=80&q=80', status: 'P', late: false, remarks: '' },
  { roll: '102', name: 'Bella Carson',   avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80', status: 'A', late: false, remarks: 'Medical Leave' },
  { roll: '103', name: 'Caleb Daugherty',avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80', status: 'P', late: true,  remarks: '10 mins late' },
  { roll: '104', name: 'Diana Prince',   avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&h=80&q=80', status: 'P', late: false, remarks: '' },
  { roll: '105', name: 'Ethan Hunt',     avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80', status: 'P', late: false, remarks: '' },
  { roll: '106', name: 'Fiona Glenanne', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&h=80&q=80', status: 'P', late: false, remarks: '' },
  { roll: '107', name: 'George Miller',  avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=80&h=80&q=80', status: 'P', late: false, remarks: '' },
  { roll: '108', name: 'Hannah Abbott',  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80', status: 'P', late: false, remarks: '' },
  { roll: '109', name: 'Ian Wright',     avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=80&h=80&q=80', status: 'P', late: false, remarks: '' },
  { roll: '110', name: 'Julia Roberts',  avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=80&h=80&q=80', status: 'P', late: false, remarks: '' },
  { roll: '111', name: 'Kevin Hart',     avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=80&h=80&q=80', status: 'P', late: false, remarks: '' },
  { roll: '112', name: 'Lana Del Rey',   avatar: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&w=80&h=80&q=80', status: 'P', late: false, remarks: '' },
];

interface AttendanceContextValue {
  session: AttendanceSession;
  setAllStatus: (s: AttendanceStatus) => void;
  toggleStatus: (roll: string, next: AttendanceStatus) => void;
  toggleLate: (roll: string) => void;
  updateRemarks: (roll: string, val: string) => void;
  saveDraft: () => void;
  markValidated: () => void;
  presentCount: number;
  absentCount: number;
  presentPct: number;
}

const Ctx = createContext<AttendanceContextValue | null>(null);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AttendanceSession>({
    id: 'session-default',
    lecture: DEFAULT_LECTURE,
    roster: DEFAULT_ROSTER,
    draftSavedAt: '09:15 AM',
    validated: false,
  });

  const setAllStatus = useCallback((s: AttendanceStatus) => {
    setSession(prev => ({ ...prev, roster: prev.roster.map(r => ({ ...r, status: s })) }));
  }, []);

  const toggleStatus = useCallback((roll: string, next: AttendanceStatus) => {
    setSession(prev => ({
      ...prev,
      roster: prev.roster.map(r => (r.roll === roll ? { ...r, status: next } : r)),
    }));
  }, []);

  const toggleLate = useCallback((roll: string) => {
    setSession(prev => ({
      ...prev,
      roster: prev.roster.map(r => (r.roll === roll ? { ...r, late: !r.late } : r)),
    }));
  }, []);

  const updateRemarks = useCallback((roll: string, val: string) => {
    setSession(prev => ({
      ...prev,
      roster: prev.roster.map(r => (r.roll === roll ? { ...r, remarks: val } : r)),
    }));
  }, []);

  const saveDraft = useCallback(() => {
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSession(prev => ({ ...prev, draftSavedAt: stamp }));
  }, []);

  const markValidated = useCallback(() => {
    setSession(prev => ({ ...prev, validated: true }));
  }, []);

  const presentCount = session.roster.filter(r => r.status === 'P').length;
  const absentCount = session.roster.length - presentCount;
  const total = session.roster.length || 1;
  const presentPct = Math.round((presentCount / total) * 100);

  const value = useMemo<AttendanceContextValue>(
    () => ({
      session,
      setAllStatus,
      toggleStatus,
      toggleLate,
      updateRemarks,
      saveDraft,
      markValidated,
      presentCount,
      absentCount,
      presentPct,
    }),
    [session, setAllStatus, toggleStatus, toggleLate, updateRemarks, saveDraft, markValidated, presentCount, absentCount, presentPct]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAttendance = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAttendance must be used within <AttendanceProvider>');
  return ctx;
};

/**
 * Types mirroring the Express backend models.
 *
 * Mongo `_id` fields are strings on the wire (after JSON.stringify of ObjectId).
 */

export interface Branch {
  _id: string;
  code: string;
  name: string;
}

export interface AcademicYear {
  _id: string;
  code: string;
  startsAt: string;
  endsAt: string;
  isCurrent: boolean;
}

export interface Division {
  _id: string;
  code: string;
  name: string;
  branch: Branch | string;
  year: 'FE' | 'SE' | 'TE' | 'BE';
  academicYear: AcademicYear | string;
}

export interface Subject {
  _id: string;
  code: string;
  name: string;
  branch: Branch | string;
  year: 'FE' | 'SE' | 'TE' | 'BE';
  credits: number;
}

export interface StudentLite {
  _id: string;
  name: string;
  email: string;
  rollNumber?: string;
  branch?: string;
  division?: string;
  year?: 'FE' | 'SE' | 'TE' | 'BE';
}

export interface TeacherLite {
  _id: string;
  name: string;
  email: string;
}

export interface Schedule {
  _id: string;
  division: Division | string;
  subject: Subject | string;
  teacher: TeacherLite | string;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startTime: string;
  endTime: string;
  room: string;
  academicYear: AcademicYear | string;
}

export type LectureStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface Lecture {
  _id: string;
  schedule?: string;
  division: Division | string;
  subject: Subject | string;
  teacher: TeacherLite | string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  status: LectureStatus;
  attendanceMarkedAt?: string;
  notes?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  _id: string;
  lecture: string;
  student: string;
  division: string;
  subject: string;
  status: AttendanceStatus;
  remarks?: string;
  markedBy: string;
  markedAt: string;
}

export interface RosterEntry {
  student: StudentLite;
  attendance: AttendanceRecord | null;
}

export interface AttendanceMarkEntry {
  student: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface DivisionStatRow {
  studentId: string;
  name: string;
  rollNumber?: string;
  total: number;
  present: number;
  pct: number;
}

export interface SubjectAverageRow {
  subjectId: string;
  code: string;
  name: string;
  total: number;
  present: number;
  pct: number;
}

export interface StudentSubjectSummary {
  subject: string;
  total: number;
  present: number;
  pct: number;
}

export interface EligibilitySubject {
  subjectId: string;
  code: string;
  name: string;
  total: number;
  present: number;
  pct: number;
  threshold: number;
  eligible: boolean;
}

export interface EligibilityRow {
  studentId: string;
  name: string;
  rollNumber?: string;
  subjects: EligibilitySubject[];
  overallEligible: boolean;
}

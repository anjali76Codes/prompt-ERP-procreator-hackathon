import { apiRequest, API_BASE, getToken, ApiError } from '../api';
import type {
  AttendanceMarkEntry, AttendanceRecord, Division, DivisionStatRow,
  EligibilityRow, Lecture, RosterEntry, Schedule, StudentLite,
  StudentSubjectSummary, Subject, SubjectAverageRow,
} from './types';

const qs = (params: Record<string, string | number | boolean | undefined>): string => {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') usp.set(k, String(v));
  const s = usp.toString();
  return s ? `?${s}` : '';
};

const yyyyMmDd = (d: Date): string => d.toISOString().slice(0, 10);

/* ---------------------------------------------------------------- */
/*  Academic                                                          */
/* ---------------------------------------------------------------- */

export const fetchMyDivisions = async (): Promise<Division[]> => {
  const data = await apiRequest<{ divisions: Division[] }>('/academic/divisions?mine=1');
  return data.divisions;
};

export const fetchAllDivisions = async (): Promise<Division[]> => {
  const data = await apiRequest<{ divisions: Division[] }>('/academic/divisions');
  return data.divisions;
};

export const fetchDivisionStudents = async (divisionId: string): Promise<StudentLite[]> => {
  const data = await apiRequest<{ students: StudentLite[] }>(
    `/academic/divisions/${divisionId}/students`
  );
  return data.students;
};

export const fetchSubjects = async (): Promise<Subject[]> => {
  const data = await apiRequest<{ subjects: Subject[] }>('/academic/subjects');
  return data.subjects;
};

export const fetchMySubjects = async (): Promise<Subject[]> => {
  const data = await apiRequest<{ subjects: Subject[] }>('/academic/subjects?mine=1');
  return data.subjects;
};

/* ---------------------------------------------------------------- */
/*  Schedules                                                         */
/* ---------------------------------------------------------------- */

export const fetchSchedules = async (
  filter: { divisionId?: string; mine?: boolean } = {}
): Promise<Schedule[]> => {
  const data = await apiRequest<{ schedules: Schedule[] }>(
    `/schedules${qs({ divisionId: filter.divisionId, mine: filter.mine ? '1' : undefined })}`
  );
  return data.schedules;
};

export interface CreateSchedulePayload {
  division: string;
  subject: string;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startTime: string;
  endTime: string;
  room: string;
}

export const createSchedule = async (payload: CreateSchedulePayload): Promise<Schedule> => {
  const data = await apiRequest<{ schedule: Schedule }>('/schedules', {
    method: 'POST', body: payload,
  });
  return data.schedule;
};

export const deleteSchedule = (id: string): Promise<unknown> =>
  apiRequest(`/schedules/${id}`, { method: 'DELETE' });

/* ---------------------------------------------------------------- */
/*  Lectures                                                          */
/* ---------------------------------------------------------------- */

export const fetchLectures = async (filter: {
  divisionId?: string; mine?: boolean; date?: string | Date;
  from?: string | Date; to?: string | Date;
}): Promise<Lecture[]> => {
  const data = await apiRequest<{ lectures: Lecture[] }>(
    `/lectures${qs({
      divisionId: filter.divisionId,
      mine: filter.mine ? '1' : undefined,
      date: filter.date instanceof Date ? yyyyMmDd(filter.date) : filter.date,
      from: filter.from instanceof Date ? yyyyMmDd(filter.from) : filter.from,
      to: filter.to instanceof Date ? yyyyMmDd(filter.to) : filter.to,
    })}`
  );
  return data.lectures;
};

export const fetchLecture = async (id: string): Promise<Lecture> => {
  const data = await apiRequest<{ lecture: Lecture }>(`/lectures/${id}`);
  return data.lecture;
};

export const fetchLectureRoster = async (id: string): Promise<RosterEntry[]> => {
  const data = await apiRequest<{ roster: RosterEntry[] }>(`/lectures/${id}/roster`);
  return data.roster;
};

export interface CreateLecturePayload {
  division: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
}

export const createLecture = async (payload: CreateLecturePayload): Promise<Lecture> => {
  const data = await apiRequest<{ lecture: Lecture }>('/lectures', {
    method: 'POST', body: payload,
  });
  return data.lecture;
};

/** Generate concrete lectures from the schedule template for a given day. */
export const materialiseDay = (date: string | Date): Promise<unknown> => {
  const d = date instanceof Date ? yyyyMmDd(date) : date;
  return apiRequest('/schedules/materialise', { method: 'POST', body: { date: d } });
};

/* ---------------------------------------------------------------- */
/*  Attendance                                                        */
/* ---------------------------------------------------------------- */

export const markAttendance = (
  lectureId: string, entries: AttendanceMarkEntry[]
): Promise<{ count: number; lectureId: string }> =>
  apiRequest(`/lectures/${lectureId}/attendance`, {
    method: 'POST', body: { entries },
  });

export const fetchAttendanceForLecture = async (
  lectureId: string
): Promise<AttendanceRecord[]> => {
  const data = await apiRequest<{ attendance: AttendanceRecord[] }>(
    `/lectures/${lectureId}/attendance`
  );
  return data.attendance;
};

export const fetchDivisionStats = async (divisionId: string): Promise<DivisionStatRow[]> => {
  const data = await apiRequest<{ stats: DivisionStatRow[] }>(
    `/divisions/${divisionId}/attendance/stats`
  );
  return data.stats;
};

export const fetchDivisionSubjectAverages = async (divisionId: string): Promise<SubjectAverageRow[]> => {
  const data = await apiRequest<{ averages: SubjectAverageRow[] }>(
    `/divisions/${divisionId}/attendance/subjects`
  );
  return data.averages;
};

export const fetchMyAttendance = async (): Promise<StudentSubjectSummary[]> => {
  const data = await apiRequest<{ summary: StudentSubjectSummary[] }>('/me/attendance');
  return data.summary;
};

export const fetchStudentAttendance = async (
  studentId: string
): Promise<StudentSubjectSummary[]> => {
  const data = await apiRequest<{ summary: StudentSubjectSummary[] }>(
    `/students/${studentId}/attendance`
  );
  return data.summary;
};

/* ---------------------------------------------------------------- */
/*  Eligibility (per-subject minimum %)                              */
/* ---------------------------------------------------------------- */

export const fetchDivisionEligibility = async (
  divisionId: string
): Promise<EligibilityRow[]> => {
  const data = await apiRequest<{ eligibility: EligibilityRow[] }>(
    `/divisions/${divisionId}/attendance/eligibility`
  );
  return data.eligibility;
};

/* ---------------------------------------------------------------- */
/*  Lecture cancellation                                             */
/* ---------------------------------------------------------------- */

export const cancelLecture = async (lectureId: string, note?: string): Promise<Lecture> => {
  const data = await apiRequest<{ lecture: Lecture }>(
    `/lectures/${lectureId}/cancel`,
    { method: 'POST', body: { note } }
  );
  return data.lecture;
};

export const restoreLecture = async (lectureId: string): Promise<Lecture> => {
  const data = await apiRequest<{ lecture: Lecture }>(
    `/lectures/${lectureId}/restore`,
    { method: 'POST' }
  );
  return data.lecture;
};

/* ---------------------------------------------------------------- */
/*  PDF downloads — auth-aware, triggers a browser save              */
/* ---------------------------------------------------------------- */

const downloadPdf = async (path: string, filename: string): Promise<void> => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || `PDF download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const downloadLectureRosterPdf = (lectureId: string): Promise<void> =>
  downloadPdf(`/lectures/${lectureId}/report.pdf`, `lecture-${lectureId}.pdf`);

export const downloadDivisionReportPdf = (
  divisionId: string,
  divisionCode = 'division',
  studentIds?: string[],
): Promise<void> => {
  const qs = studentIds && studentIds.length > 0
    ? `?studentIds=${encodeURIComponent(studentIds.join(','))}`
    : '';
  const suffix = studentIds && studentIds.length > 0 ? '-filtered' : '';
  return downloadPdf(
    `/divisions/${divisionId}/attendance/report.pdf${qs}`,
    `${divisionCode}${suffix}-attendance.pdf`,
  );
};

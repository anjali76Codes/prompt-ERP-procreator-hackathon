import { apiRequest } from '../api';

export interface StudentSubjectAttendance {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  total: number;
  present: number;
  pct: number;
}

export interface StudentTodayLecture {
  lectureId: string;
  subjectCode: string;
  subjectName: string;
  startsAt: string;
  endsAt: string;
  room?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface StudentRecentAttempt {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  subjectLabel?: string;
  score?: number;
  maxMarks?: number;
  status: 'in_progress' | 'submitted' | 'graded';
  submittedAt?: string;
}

export interface StudentUpcomingAssignment {
  resourceId: string;
  title: string;
  subjectLabel?: string;
  dueDate?: string;
  status: 'pending' | 'submitted' | 'graded' | 'resubmit_requested';
}

export interface StudentOverview {
  greeting: { name: string };
  identity: {
    rollNumber?: string;
    division?: string;
    branch?: string;
  };
  metrics: {
    overallAttendancePct: number;
    avgQuizScorePct: number;
    pendingCount: number;
  };
  attendance: StudentSubjectAttendance[];
  todayLectures: StudentTodayLecture[];
  upcomingAssignments: StudentUpcomingAssignment[];
  recentAttempts: StudentRecentAttempt[];
}

export const fetchStudentOverview = (): Promise<StudentOverview> =>
  apiRequest<StudentOverview>('/me/student-overview');

export interface MyAttendanceRow {
  subject: string;
  total: number;
  present: number;
  pct: number;
}

export const fetchMyAttendance = (subjectId?: string): Promise<{ summary: MyAttendanceRow[] }> => {
  const qs = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : '';
  return apiRequest<{ summary: MyAttendanceRow[] }>(`/me/attendance${qs}`);
};

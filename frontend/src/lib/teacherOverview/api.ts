import { apiRequest } from '../api';

export interface TeacherOverview {
  greeting: { name: string };
  banner: {
    lecturesToday: number;
    pendingReviews: number;
    topEngagementSubject?: string;
  };
  courses: Array<{
    subjectId: string;
    name: string;
    code: string;
    studentCount: number;
    avgAttendancePct: number;
    progress: number;
  }>;
  engagementHeatmap: Array<Array<number | null>>; // 4 × 7 (oldest week first)
  averageEngagementPct: number;
  metrics: {
    attendancePct: number;
    attendanceDeltaPct: number;
    atRiskCount: number;
  };
  upcomingItems: Array<{
    id: string;
    kind: 'assignment' | 'quiz';
    title: string;
    dueDate: string;
    subjectLabel?: string;
  }>;
  atRiskStudents: Array<{
    studentId: string;
    name: string;
    rollNumber?: string;
    divisionLabel?: string;
    absences: number;
    attendancePct: number;
  }>;
  agendaTasks: Array<{
    id: string;
    text: string;
    done: boolean;
    link?: string;
  }>;
}

export const fetchTeacherOverview = () =>
  apiRequest<TeacherOverview>('/me/teacher-overview');

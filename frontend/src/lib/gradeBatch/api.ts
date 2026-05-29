import { apiRequest } from '../api';

export interface GradeBatchAssignment {
  resourceId: string;
  title: string;
  dueDate?: string;
  maxMarks?: number;
  divisionLabel?: string;
  subjectLabel?: string;
  rubricSet: boolean;
  studentCount: number;
  submissionCounts: {
    total: number;
    pending: number;
    proposed: number;
    approved: number;
    published: number;
  };
  updatedAt: string;
}

export const listGradeBatch = () =>
  apiRequest<{ assignments: GradeBatchAssignment[] }>('/grade-batch');

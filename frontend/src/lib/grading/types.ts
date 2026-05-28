import type { Resource, Submission } from '../resources/types';

export type GradeReviewStatus = 'none' | 'proposed' | 'approved' | 'published';

export type SubmissionFlag =
  | 'late'
  | 'blank'
  | 'plagiarism_suspected'
  | 'ai_generated_suspected'
  | 'unreadable';

export interface RubricCriterion {
  name: string;
  description?: string;
  maxPoints: number;
  weight: number;
  mandatory?: boolean;
}

export interface Rubric {
  criteria: RubricCriterion[];
  totalPoints: number;
  graderNotes?: string;
  updatedAt: string;
}

export interface CriterionScore {
  name: string;
  score: number;
  maxPoints: number;
  weight: number;
  feedback?: string;
  mandatorySatisfied?: boolean;
}

export interface GradeProposal {
  proposedScore: number;
  rubricBreakdown: CriterionScore[];
  feedback: string;
  strengths: string[];
  improvements: string[];
  flags: SubmissionFlag[];
  notes?: string;
  proposedAt: string;
  proposedBy?: 'ai' | 'teacher';
  model?: string;
}

/** Submission extended with the AI-grading fields the dashboard reads. */
export interface GradingSubmission extends Submission {
  reviewStatus: GradeReviewStatus;
  proposal?: GradeProposal;
}

export interface GradingReview {
  resource: Resource & { rubric?: Rubric };
  submissions: GradingSubmission[];
  counts: { total: number; proposed: number; approved: number; published: number; none: number };
}

export interface AiGradingRunSummary {
  resourceId: string;
  graded: number;
  failed: number;
  skipped: number;
  proposals: { submissionId: string; studentName: string; proposedScore: number; flags: SubmissionFlag[] }[];
  failures: { submissionId: string; studentName: string; error: string }[];
  nextSteps?: string;
}

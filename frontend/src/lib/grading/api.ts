import { apiRequest, ApiError, getToken } from '../api';
import { AI_BASE } from '../automation/agentApi';
import type {
  Rubric, RubricCriterion, GradingReview, GradingSubmission, AiGradingRunSummary,
} from './types';

export const fetchGradingReview = async (resourceId: string): Promise<GradingReview> =>
  apiRequest<GradingReview>(`/resources/${resourceId}/grading-review`);

export const fetchRubric = async (resourceId: string): Promise<Rubric | null> => {
  const data = await apiRequest<{ rubric: Rubric | null }>(
    `/resources/${resourceId}/rubric`
  );
  return data.rubric;
};

export interface SetRubricBody {
  criteria: RubricCriterion[];
  totalPoints: number;
  graderNotes?: string;
}

export const setRubric = async (
  resourceId: string,
  body: SetRubricBody,
): Promise<unknown> =>
  apiRequest(`/resources/${resourceId}/rubric`, {
    method: 'PATCH',
    body,
  });

export const publishOneGrade = async (
  submissionId: string,
  scoreOverride?: number,
): Promise<{ submission: GradingSubmission }> =>
  apiRequest(`/submissions/${submissionId}/publish-grade`, {
    method: 'POST',
    body: scoreOverride !== undefined ? { scoreOverride } : {},
  });

export const bulkPublishGrades = async (
  resourceId: string,
  submissionIds?: string[],
): Promise<{ resourceId: string; published: number }> =>
  apiRequest(`/resources/${resourceId}/publish-grades`, {
    method: 'POST',
    body: submissionIds ? { submissionIds } : {},
  });

/**
 * Trigger AI grading via the Python backend. Talks to FastAPI (port 8000),
 * which downloads each submission, calls Gemini, and posts back proposals.
 */
export const runAiGrading = async (
  resourceId: string,
  limit?: number,
): Promise<AiGradingRunSummary> => {
  const token = getToken();
  const qs = limit !== undefined ? `?limit=${limit}` : '';
  const res = await fetch(`${AI_BASE}/grading/run/${resourceId}${qs}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!res.ok) {
    const msg = (json && typeof json === 'object' && 'detail' in json)
      ? String((json as { detail: unknown }).detail)
      : `AI grading failed (HTTP ${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return json as AiGradingRunSummary;
};

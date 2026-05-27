import { API_BASE, ApiError, apiRequest, getToken } from '../api';
import type { Resource, ResourceKind, ResourceStatus, Submission } from './types';

interface ListFilter {
  kind?: ResourceKind;
  status?: ResourceStatus;
  divisionId?: string;
  subjectId?: string;
  mine?: boolean;
}

const qs = (params: Record<string, string | number | boolean | undefined>): string => {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '' || v === false) continue;
    usp.set(k, v === true ? '1' : String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
};

export const listResources = async (filter: ListFilter = {}): Promise<Resource[]> => {
  const data = await apiRequest<{ resources: Resource[] }>(
    `/resources${qs({
      kind: filter.kind,
      status: filter.status,
      divisionId: filter.divisionId,
      subjectId: filter.subjectId,
      mine: filter.mine,
    })}`
  );
  return data.resources;
};

export const fetchResource = async (id: string): Promise<Resource> => {
  const data = await apiRequest<{ resource: Resource }>(`/resources/${id}`);
  return data.resource;
};

export interface CreateResourceBody {
  kind: ResourceKind;
  division: string;
  subject: string;
  title: string;
  description: string;
  dueDate?: string;
  maxMarks?: number;
  unit?: string;
  files: File[];
}

/**
 * `fetch` is used directly here (not `apiRequest`) because the body is
 * multipart/form-data — the API helper sets `Content-Type: application/json`
 * unconditionally and would break boundary detection.
 */
const multipartRequest = async <T>(
  path: string,
  method: 'POST' | 'PATCH',
  form: FormData
): Promise<T> => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const text = await res.text();
  const json = text ? safeParse(text) : null;

  if (!res.ok) {
    const errObj =
      json && typeof json === 'object' && 'error' in json
        ? (json as { error?: { message?: string; details?: unknown } }).error
        : undefined;
    throw new ApiError(
      res.status,
      errObj?.message ?? `Request failed with status ${res.status}`,
      errObj?.details,
    );
  }
  return json as T;
};

const safeParse = (text: string): unknown => {
  try { return JSON.parse(text); } catch { return text; }
};

export const createResource = async (body: CreateResourceBody): Promise<Resource> => {
  const form = new FormData();
  form.set('kind', body.kind);
  form.set('division', body.division);
  form.set('subject', body.subject);
  form.set('title', body.title);
  form.set('description', body.description);
  if (body.dueDate)              form.set('dueDate', body.dueDate);
  if (body.maxMarks !== undefined) form.set('maxMarks', String(body.maxMarks));
  if (body.unit)                 form.set('unit', body.unit);
  for (const f of body.files) form.append('files', f, f.name);

  const data = await multipartRequest<{ resource: Resource }>('/resources', 'POST', form);
  return data.resource;
};

export interface UpdateResourceBody {
  title?: string;
  description?: string;
  dueDate?: string;
  maxMarks?: number;
  unit?: string;
}

export const updateResource = async (id: string, body: UpdateResourceBody): Promise<Resource> => {
  const data = await apiRequest<{ resource: Resource }>(`/resources/${id}`, {
    method: 'PATCH', body,
  });
  return data.resource;
};

export const addAttachments = async (id: string, files: File[]): Promise<Resource> => {
  const form = new FormData();
  for (const f of files) form.append('files', f, f.name);
  const data = await multipartRequest<{ resource: Resource }>(
    `/resources/${id}/attachments`, 'POST', form
  );
  return data.resource;
};

export const removeAttachment = async (id: string, attId: string): Promise<Resource> => {
  const data = await apiRequest<{ resource: Resource }>(
    `/resources/${id}/attachments/${attId}`, { method: 'DELETE' }
  );
  return data.resource;
};

export const publishResource = async (id: string): Promise<Resource> => {
  const data = await apiRequest<{ resource: Resource }>(`/resources/${id}/publish`, { method: 'POST' });
  return data.resource;
};

export const unpublishResource = async (id: string): Promise<Resource> => {
  const data = await apiRequest<{ resource: Resource }>(`/resources/${id}/unpublish`, { method: 'POST' });
  return data.resource;
};

export const deleteResource = (id: string): Promise<unknown> =>
  apiRequest(`/resources/${id}`, { method: 'DELETE' });

/* -------------------------- student feed -------------------------- */

export const fetchStudentResources = async (opts: {
  kind?: ResourceKind; subjectId?: string;
} = {}): Promise<Resource[]> => {
  const data = await apiRequest<{ resources: Resource[] }>(
    `/me/resources${qs({ kind: opts.kind, subjectId: opts.subjectId })}`
  );
  return data.resources;
};

/* ----------------------------- Submissions ------------------------------- */

/** Student: submit (or resubmit) files for an assignment. */
export const submitToResource = async (
  resourceId: string,
  files: File[]
): Promise<Submission> => {
  const form = new FormData();
  for (const f of files) form.append('files', f, f.name);
  const data = await multipartRequest<{ submission: Submission }>(
    `/resources/${resourceId}/submissions/mine`, 'POST', form
  );
  return data.submission;
};

/** Student: read their own submission for an assignment (null if not submitted). */
export const fetchMySubmission = async (resourceId: string): Promise<Submission | null> => {
  const data = await apiRequest<{ submission: Submission | null }>(
    `/resources/${resourceId}/submissions/mine`
  );
  return data.submission;
};

/** Student: list all their submissions (used for showing status across feed). */
export const fetchMySubmissions = async (): Promise<Submission[]> => {
  const data = await apiRequest<{ submissions: Submission[] }>(`/me/submissions`);
  return data.submissions;
};

/** Teacher: all submissions for an assignment. */
export const listSubmissionsForResource = async (
  resourceId: string
): Promise<Submission[]> => {
  const data = await apiRequest<{ submissions: Submission[] }>(
    `/resources/${resourceId}/submissions`
  );
  return data.submissions;
};

/** Teacher: assign a numeric score. */
export const gradeSubmission = async (
  submissionId: string,
  score: number
): Promise<Submission> => {
  const data = await apiRequest<{ submission: Submission }>(
    `/submissions/${submissionId}/grade`,
    { method: 'POST', body: { score } }
  );
  return data.submission;
};

/** Teacher: flag a submission as needing resubmission. */
export const requestResubmission = async (submissionId: string): Promise<Submission> => {
  const data = await apiRequest<{ submission: Submission }>(
    `/submissions/${submissionId}/request-resubmit`,
    { method: 'POST' }
  );
  return data.submission;
};

import { apiRequest } from '../api';

export const createQuiz = (payload: unknown) => apiRequest<{ quiz: unknown }>('/quizzes', { method: 'POST', body: payload });
export const updateQuiz = (id: string, payload: unknown) => apiRequest<{ quiz: unknown }>(`/quizzes/${id}`, { method: 'PATCH', body: payload });
export const publishQuiz = (id: string) => apiRequest<{ quiz: unknown }>(`/quizzes/${id}/publish`, { method: 'POST' });
export const unpublishQuiz = (id: string) => apiRequest<{ quiz: unknown }>(`/quizzes/${id}/unpublish`, { method: 'POST' });
export const listQuizzes = (params = '') => apiRequest<{ total?: number; quizzes: unknown[] }>(`/quizzes${params ? '?' + params : ''}`);
export const getQuiz = (id: string) => apiRequest<{ quiz: unknown }>(`/quizzes/${id}`);

// Student endpoints
export const listStudentQuizzes = () => apiRequest<{ quizzes: unknown[] }>(`/student/quizzes`);
export const startAttempt = (quizId: string) => apiRequest<{ attempt: unknown }>(`/quizzes/${quizId}/start`, { method: 'POST' });
export const submitAttempt = (payload: unknown) => apiRequest<{ attempt: unknown }>(`/quizzes/submit`, { method: 'POST', body: payload });

// Teacher endpoints for attempts/metrics
export const listAttempts = (quizId: string) => apiRequest<{ attempts: unknown[] }>(`/quizzes/${quizId}/attempts`);
export const getAttempt = (id: string) => apiRequest<{ attempt: unknown }>(`/quizzes/attempts/${id}`);
export const gradeAttempt = (id: string, perQuestion: Record<string, number>) => apiRequest<{ attempt: unknown }>(`/quizzes/attempts/${id}/grade`, { method: 'POST', body: { perQuestion } });
export const quizMetrics = (id: string) => apiRequest<{ metrics: unknown }>(`/quizzes/${id}/metrics`);

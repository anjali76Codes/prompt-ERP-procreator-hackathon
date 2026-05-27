import { apiRequest } from '../api';

export const createQuiz = (payload: unknown) => apiRequest<{ quiz: unknown }>('/quizzes', { method: 'POST', body: payload });
export const updateQuiz = (id: string, payload: unknown) => apiRequest<{ quiz: unknown }>(`/quizzes/${id}`, { method: 'PATCH', body: payload });
export const publishQuiz = (id: string) => apiRequest<{ quiz: unknown }>(`/quizzes/${id}/publish`, { method: 'POST' });
export const unpublishQuiz = (id: string) => apiRequest<{ quiz: unknown }>(`/quizzes/${id}/unpublish`, { method: 'POST' });
export const deleteQuiz = (id: string) => apiRequest<void>(`/quizzes/${id}`, { method: 'DELETE' });
export const listQuizzes = (params = '') => apiRequest<{ total?: number; quizzes: any[] }>(`/quizzes${params ? '?' + params : ''}`);
export const getQuiz = (id: string) => apiRequest<{ quiz: any }>(`/quizzes/${id}`);

// Student endpoints
export const listStudentQuizzes = () => apiRequest<{ quizzes: any[] }>(`/student/quizzes`);
export const startAttempt = (quizId: string) => apiRequest<{ attempt: any }>(`/quizzes/${quizId}/start`, { method: 'POST' });
export const submitAttempt = (payload: unknown) => apiRequest<{ attempt: any }>(`/quizzes/submit`, { method: 'POST', body: payload });

// Teacher endpoints for attempts/metrics
export const listAttempts = (quizId: string) => apiRequest<{ attempts: any[] }>(`/quizzes/${quizId}/attempts`);
export const getAttempt = (id: string) => apiRequest<{ attempt: any }>(`/quizzes/attempts/${id}`);
export const gradeAttempt = (id: string, perQuestion: Record<string, number>) => apiRequest<{ attempt: any }>(`/quizzes/attempts/${id}/grade`, { method: 'POST', body: { perQuestion } });
export const quizMetrics = (id: string) => apiRequest<{ metrics: any }>(`/quizzes/${id}/metrics`);

const RAW_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5000/api';
export const API_BASE = RAW_BASE.replace(/\/$/, '');

const TOKEN_KEY = 'auth:token';

export const getToken = (): string | null => {
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

export const setToken = (token: string | null): void => {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
};

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export const apiRequest = async <T>(path: string, opts: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = text ? safeParse(text) : null;

  if (!res.ok) {
    const errObj =
      json && typeof json === 'object' && 'error' in json
        ? (json as { error?: { message?: string; details?: unknown } }).error
        : undefined;
    const message: string = errObj?.message ?? `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, errObj?.details);
  }

  return json as T;
};

const safeParse = (text: string): unknown => {
  try { return JSON.parse(text); } catch { return text; }
};

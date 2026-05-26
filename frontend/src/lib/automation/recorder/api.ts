import { apiRequest } from '../../api';
import type {
  Automation, AutomationRun, RecordedStep, AutomationVariable, AutomationStatus,
} from './types';

export const listAutomations = async (): Promise<Automation[]> => {
  const data = await apiRequest<{ automations: Automation[] }>('/automations');
  return data.automations;
};

export const getAutomation = async (id: string): Promise<Automation> => {
  const data = await apiRequest<{ automation: Automation }>(`/automations/${id}`);
  return data.automation;
};

export interface CreateAutomationPayload {
  name: string;
  description?: string;
  steps?: RecordedStep[];
  variables?: AutomationVariable[];
}

export const createAutomation = async (payload: CreateAutomationPayload): Promise<Automation> => {
  const data = await apiRequest<{ automation: Automation }>('/automations', {
    method: 'POST',
    body: payload,
  });
  return data.automation;
};

export interface UpdateAutomationPayload {
  name?: string;
  description?: string;
  steps?: RecordedStep[];
  variables?: AutomationVariable[];
  status?: AutomationStatus;
  shared?: boolean;
}

export const updateAutomation = async (id: string, payload: UpdateAutomationPayload): Promise<Automation> => {
  const data = await apiRequest<{ automation: Automation }>(`/automations/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  return data.automation;
};

export const deleteAutomation = (id: string): Promise<unknown> =>
  apiRequest(`/automations/${id}`, { method: 'DELETE' });

export interface RecordRunPayload {
  status: 'running' | 'success' | 'failed' | 'cancelled';
  variables: Record<string, string>;
  stepResults: Array<{
    stepId: string;
    status: 'pending' | 'running' | 'success' | 'skipped' | 'failed';
    startedAt?: string;
    finishedAt?: string;
    errorMessage?: string;
    matchedSelectorKind?: string;
  }>;
  log: Array<{
    ts?: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    stepId?: string;
  }>;
  startedAt?: string;
  finishedAt?: string;
}

export const recordRun = async (automationId: string, payload: RecordRunPayload): Promise<AutomationRun> => {
  const data = await apiRequest<{ run: AutomationRun }>(`/automations/${automationId}/runs`, {
    method: 'POST',
    body: payload,
  });
  return data.run;
};

export const listRuns = async (automationId: string, limit = 20): Promise<AutomationRun[]> => {
  const data = await apiRequest<{ runs: AutomationRun[] }>(`/automations/${automationId}/runs?limit=${limit}`);
  return data.runs;
};

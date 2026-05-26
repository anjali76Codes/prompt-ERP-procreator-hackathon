import { Types } from 'mongoose';
import { Automation, type AutomationDoc } from '../models/Automation';
import { AutomationRun, type AutomationRunDoc, type StepResult, type RunLogEntry } from '../models/AutomationRun';
import { Forbidden, NotFound } from '../utils/http-errors';
import type {
  CreateAutomationInput,
  UpdateAutomationInput,
  RecordRunInput,
} from '../validators/automation.validator';

const toObjectId = (id: string): Types.ObjectId => new Types.ObjectId(id);

/** List automations visible to the caller: their own + shared ones. */
export const listAutomations = (userId: string): Promise<AutomationDoc[]> =>
  Automation.find({
    $or: [{ owner: toObjectId(userId) }, { shared: true }],
    status: { $ne: 'archived' },
  })
    .populate('owner', 'name email')
    .sort({ updatedAt: -1 });

export const findAutomation = async (id: string, userId: string): Promise<AutomationDoc> => {
  const a = await Automation.findById(id).populate('owner', 'name email');
  if (!a) throw NotFound('Automation not found');
  // Owners + admins always see it. Non-owners only if it is shared.
  if (a.owner._id.toString() !== userId && !a.shared) {
    throw Forbidden('Not authorised to view this automation');
  }
  return a;
};

export const createAutomation = (userId: string, input: CreateAutomationInput): Promise<AutomationDoc> =>
  Automation.create({
    owner: toObjectId(userId),
    name: input.name,
    description: input.description,
    steps: input.steps ?? [],
    variables: input.variables ?? [],
    status: 'draft',
    shared: false,
  });

export const updateAutomation = async (
  id: string,
  userId: string,
  input: UpdateAutomationInput,
): Promise<AutomationDoc> => {
  const a = await Automation.findById(id);
  if (!a) throw NotFound('Automation not found');
  if (a.owner.toString() !== userId) throw Forbidden('Only the owner can edit this automation');

  if (input.name !== undefined)        a.name        = input.name;
  if (input.description !== undefined) a.description = input.description;
  if (input.steps !== undefined)       a.steps       = input.steps;
  if (input.variables !== undefined)   a.variables   = input.variables;
  if (input.status !== undefined)      a.status      = input.status;
  if (input.shared !== undefined)      a.shared      = input.shared;

  await a.save();
  return a;
};

export const deleteAutomation = async (id: string, userId: string): Promise<void> => {
  const a = await Automation.findById(id);
  if (!a) throw NotFound('Automation not found');
  if (a.owner.toString() !== userId) throw Forbidden('Only the owner can delete this automation');
  await Promise.all([
    Automation.deleteOne({ _id: a._id }),
    AutomationRun.deleteMany({ automation: a._id }),
  ]);
};

/* ------------------------------------------------------------------ */
/*  Runs                                                              */
/* ------------------------------------------------------------------ */

export const recordRun = async (
  automationId: string,
  userId: string,
  input: RecordRunInput,
): Promise<AutomationRunDoc> => {
  const a = await Automation.findById(automationId);
  if (!a) throw NotFound('Automation not found');
  if (a.owner.toString() !== userId && !a.shared) {
    throw Forbidden('Not authorised to run this automation');
  }

  const stepResults: StepResult[] = input.stepResults.map((s) => ({
    stepId: s.stepId,
    status: s.status,
    startedAt: s.startedAt ? new Date(s.startedAt) : undefined,
    finishedAt: s.finishedAt ? new Date(s.finishedAt) : undefined,
    errorMessage: s.errorMessage,
    matchedSelectorKind: s.matchedSelectorKind,
  }));

  const log: RunLogEntry[] = input.log.map((l) => ({
    ts: l.ts ? new Date(l.ts) : new Date(),
    level: l.level,
    message: l.message,
    stepId: l.stepId,
  }));

  return AutomationRun.create({
    automation: a._id,
    runner: toObjectId(userId),
    status: input.status,
    variables: input.variables,
    stepResults,
    log,
    startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
    finishedAt: input.finishedAt ? new Date(input.finishedAt) : new Date(),
  });
};

export const listRuns = async (
  automationId: string,
  userId: string,
  limit = 20,
): Promise<AutomationRunDoc[]> => {
  await findAutomation(automationId, userId); // authz
  return AutomationRun.find({ automation: toObjectId(automationId) })
    .sort({ startedAt: -1 })
    .limit(limit)
    .populate('runner', 'name email');
};

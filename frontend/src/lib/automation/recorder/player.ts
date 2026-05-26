import { resolveSelectors, type ResolveResult } from './selectors';
import type { RecordedStep, RowBinding, Selector, StepResult, StepRunStatus } from './types';

/* Default retry window for selector resolution. Modern SPA routes mount
   async (data fetch, suspense boundaries, animations), so an element may
   not exist for a beat or two after the previous step. */
const DEFAULT_RESOLVE_TIMEOUT_MS = 5000;
const RESOLVE_POLL_MS = 120;
/* Visible pause between steps so a teacher can follow the playback in
   real-time. Each step's own postWaitMs overrides this when set. */
const DEFAULT_STEP_DELAY_MS = 500;
/* Extra gap between loop iterations — lets the previous modal/page close
   before the next iteration starts its first click. */
const LOOP_ITERATION_GAP_MS = 700;

const waitForElement = async (
  selectors: Selector[],
  timeoutMs: number,
  root?: Element | null,
): Promise<ResolveResult | null> => {
  const deadline = Date.now() + timeoutMs;
  let last: ResolveResult | null = null;
  while (Date.now() < deadline) {
    last = resolveSelectors(selectors, root);
    if (last) return last;
    await new Promise(r => setTimeout(r, RESOLVE_POLL_MS));
  }
  return last;
};

/** Resolve a per-row binding against a row element. */
const resolveBinding = (row: Element, b: RowBinding, index: number): string => {
  try {
    if (b.source === 'index') return String(index);
    const scope: Element = b.selector
      ? (row.querySelector(b.selector) ?? row)
      : row;
    if (b.source === 'text') {
      return (scope.textContent ?? '').trim().replace(/\s+/g, ' ');
    }
    if (b.source === 'attr' && b.attr) {
      return scope.getAttribute(b.attr) ?? '';
    }
  } catch { /* fall through */ }
  return '';
};

/* ----------------------------------------------------------------------
 *  Player — replays a step list inside the current browser tab.
 *
 *  Each step resolves its selectors, performs the action (native event
 *  dispatch + value mutation where appropriate), and reports back via
 *  the onStepUpdate callback. Variables are substituted at run time.
 *
 *  Navigation steps use `history.pushState` + a popstate dispatch so
 *  react-router picks them up.
 * ------------------------------------------------------------------- */

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

const substitute = (raw: string, variables: Record<string, string>): string =>
  raw.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, k: string) =>
    variables[k] !== undefined ? variables[k]! : `{{${k}}}`,
  );

const isInput = (el: Element): el is HTMLInputElement | HTMLTextAreaElement =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

/* React tracks its own value internally — assigning `.value` directly does
   NOT notify React's synthetic event system. Each element subclass has its
   own value descriptor on its prototype; calling the right one with the
   correct `this` is what makes React's onChange handlers fire. */
const setReactValue = (
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
): void => {
  const proto =
    el instanceof HTMLSelectElement   ? HTMLSelectElement.prototype
    : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
};

export interface PlayerOptions {
  variables: Record<string, string>;
  stepDelayMs?: number;
  /** Called whenever a step starts or finishes. */
  onStepUpdate: (update: { stepId: string; status: StepRunStatus; matchedSelectorKind?: string; errorMessage?: string }) => void;
  /** Receives every log entry for surfacing in the UI. */
  onLog?: (entry: { level: 'info' | 'warn' | 'error'; message: string; stepId?: string }) => void;
  /** Returns true to abort between steps. */
  shouldAbort?: () => boolean;
  /** Use react-router navigate() so navigation steps update the SPA cleanly. */
  navigate?: (path: string) => void;
}

export class Player {
  private opts: PlayerOptions;
  private results: StepResult[] = [];

  constructor(opts: PlayerOptions) {
    this.opts = opts;
  }

  getResults(): StepResult[] { return this.results; }

  /** Run a contiguous slice of steps. Default: all of them. */
  async run(steps: RecordedStep[], from = 0, to = steps.length): Promise<{ ok: boolean; results: StepResult[] }> {
    return this.runSegment(steps, from, to, null, this.opts.variables);
  }

  /**
   * Run a segment of steps, optionally scoped to a row element with
   * additional per-iteration variables merged on top of the base set.
   * Handles nested `loop-start` / `loop-end` blocks by recursing.
   */
  private async runSegment(
    steps: RecordedStep[],
    from: number,
    to: number,
    rowRoot: Element | null,
    variables: Record<string, string>,
  ): Promise<{ ok: boolean; results: StepResult[] }> {
    let ok = true;
    let i = from;
    while (i < to) {
      const step = steps[i]!;

      if (step.type === 'loop-start') {
        const endIdx = this.findLoopEnd(steps, i, to);
        if (endIdx === -1) {
          this.recordFailure(step, 'No matching loop-end found');
          return { ok: false, results: this.results };
        }
        const result = await this.runLoop(steps, i, endIdx, rowRoot, variables, step);
        if (!result.ok) ok = false;
        // Skip past loop-end. Inner steps were already accounted for inside runLoop.
        i = endIdx + 1;
        continue;
      }

      if (step.type === 'loop-end') {
        // Unmatched loop-end: surface as a failure and stop.
        this.recordFailure(step, 'Unexpected loop-end without matching loop-start');
        return { ok: false, results: this.results };
      }

      if (this.opts.shouldAbort?.()) {
        this.opts.onStepUpdate({ stepId: step.id, status: 'skipped' });
        this.results.push({ stepId: step.id, status: 'skipped' });
        i += 1;
        continue;
      }

      const startedAt = new Date().toISOString();
      this.opts.onStepUpdate({ stepId: step.id, status: 'running' });

      try {
        if (step.preWaitMs && step.preWaitMs > 0) await sleep(step.preWaitMs);
        const matched = await this.executeStep(step, rowRoot, variables);
        if (step.postWaitMs && step.postWaitMs > 0) await sleep(step.postWaitMs);
        else await sleep(this.opts.stepDelayMs ?? DEFAULT_STEP_DELAY_MS);

        const result: StepResult = {
          stepId: step.id,
          status: 'success',
          matchedSelectorKind: matched,
          startedAt,
          finishedAt: new Date().toISOString(),
        };
        this.results.push(result);
        this.opts.onStepUpdate({ stepId: step.id, status: 'success', matchedSelectorKind: matched });
        this.opts.onLog?.({ level: 'info', message: `${step.type} ${step.visibleText ?? step.value ?? step.url ?? ''}`.trim(), stepId: step.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const result: StepResult = {
          stepId: step.id,
          status: 'failed',
          errorMessage: message,
          startedAt,
          finishedAt: new Date().toISOString(),
        };
        this.results.push(result);
        this.opts.onStepUpdate({ stepId: step.id, status: 'failed', errorMessage: message });
        this.opts.onLog?.({ level: 'error', message, stepId: step.id });
        ok = false;
        break;
      }
      i += 1;
    }
    return { ok, results: this.results };
  }

  /** Find the index of the loop-end paired to the loop-start at `startIdx`. */
  private findLoopEnd(steps: RecordedStep[], startIdx: number, to: number): number {
    const start = steps[startIdx]!;
    let depth = 0;
    for (let j = startIdx + 1; j < to; j++) {
      const s = steps[j]!;
      if (s.type === 'loop-start') depth += 1;
      else if (s.type === 'loop-end') {
        if (depth === 0) {
          // Prefer matching by loopId when both have one; otherwise nearest end wins.
          if (start.loopId && s.loopId && start.loopId !== s.loopId) continue;
          return j;
        }
        depth -= 1;
      }
    }
    return -1;
  }

  private recordFailure(step: RecordedStep, message: string): void {
    const now = new Date().toISOString();
    this.results.push({
      stepId: step.id,
      status: 'failed',
      errorMessage: message,
      startedAt: now,
      finishedAt: now,
    });
    this.opts.onStepUpdate({ stepId: step.id, status: 'failed', errorMessage: message });
    this.opts.onLog?.({ level: 'error', message, stepId: step.id });
  }

  /**
   * Execute a `loop-start ... loop-end` block: find rows, replay the inner
   * segment once per row with row-scoped resolution and per-row variables
   * merged on top of the surrounding scope.
   */
  private async runLoop(
    steps: RecordedStep[],
    startIdx: number,
    endIdx: number,
    parentRoot: Element | null,
    parentVars: Record<string, string>,
    startStep: RecordedStep,
  ): Promise<{ ok: boolean }> {
    const rowSelector = startStep.rowSelector?.trim();
    if (!rowSelector) {
      this.recordFailure(startStep, 'loop-start has no rowSelector');
      return { ok: false };
    }
    const scope: ParentNode = parentRoot ?? document;
    const rows = Array.from(scope.querySelectorAll(rowSelector)) as Element[];
    if (rows.length === 0) {
      this.opts.onLog?.({ level: 'warn', message: `No rows matched ${rowSelector}`, stepId: startStep.id });
      this.opts.onStepUpdate({ stepId: startStep.id, status: 'success' });
      this.results.push({ stepId: startStep.id, status: 'success' });
      return { ok: true };
    }

    this.opts.onStepUpdate({ stepId: startStep.id, status: 'running' });
    this.opts.onLog?.({ level: 'info', message: `loop over ${rows.length} rows (${rowSelector})`, stepId: startStep.id });

    let allOk = true;
    for (let idx = 0; idx < rows.length; idx++) {
      if (this.opts.shouldAbort?.()) break;
      const row = rows[idx]!;
      const rowVars: Record<string, string> = { ...parentVars };
      for (const b of startStep.rowBindings ?? []) {
        rowVars[b.name] = resolveBinding(row, b, idx);
      }
      this.opts.onLog?.({ level: 'info', message: `iteration ${idx + 1}/${rows.length}`, stepId: startStep.id });
      // Replay the inner segment scoped to this row.
      const { ok } = await this.runSegment(steps, startIdx + 1, endIdx, row, rowVars);
      if (!ok) { allOk = false; break; }
      // Space iterations so any modal/animation from this iteration finishes
      // closing before the next one starts looking for elements.
      if (idx < rows.length - 1) await sleep(LOOP_ITERATION_GAP_MS);
    }

    const now = new Date().toISOString();
    this.results.push({
      stepId: startStep.id,
      status: allOk ? 'success' : 'failed',
      startedAt: now,
      finishedAt: new Date().toISOString(),
    });
    this.opts.onStepUpdate({ stepId: startStep.id, status: allOk ? 'success' : 'failed' });
    return { ok: allOk };
  }

  private async executeStep(
    step: RecordedStep,
    rowRoot: Element | null,
    vars: Record<string, string>,
  ): Promise<string | undefined> {
    switch (step.type) {
      case 'loop-start':
      case 'loop-end':
        // Handled by runSegment / runLoop; never executed directly.
        return undefined;

      case 'wait':
        await sleep(parseInt(step.value ?? '500', 10));
        return undefined;

      case 'navigate': {
        const target = substitute(step.url ?? '/', vars);
        if (this.opts.navigate) this.opts.navigate(target);
        else {
          window.history.pushState({}, '', target);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
        // Give the new route time to mount + fetch its initial data.
        await sleep(step.postWaitMs ?? 600);
        return undefined;
      }

      case 'click': {
        const r = await waitForElement(step.selectors, DEFAULT_RESOLVE_TIMEOUT_MS, rowRoot);
        if (!r) throw new Error(`No element matched any selector for click (was “${step.visibleText ?? step.tagName}”)`);
        // Walk up to a clickable HTML ancestor if we resolved to an inner
        // node — e.g. the SVG/path inside a Lucide icon inside a <button>.
        const target: HTMLElement | null =
          r.element instanceof HTMLElement
            ? r.element
            : ((r.element as Element).closest('button, a, [role="button"], input, label, [onclick]') as HTMLElement | null)
              ?? (r.element.parentElement as HTMLElement | null);
        if (!target) throw new Error('Resolved element has no clickable HTML ancestor');
        target.scrollIntoView({ block: 'center', inline: 'center' });
        if (typeof target.click === 'function') {
          target.click();
        } else {
          // Final fallback — synthesize a bubbling mouse event.
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        }
        return r.matchedKind;
      }

      case 'input': {
        const r = await waitForElement(step.selectors, DEFAULT_RESOLVE_TIMEOUT_MS, rowRoot);
        if (!r || !isInput(r.element)) throw new Error('No matching input element');
        const value = substitute(step.value ?? '', vars);
        setReactValue(r.element, value);
        r.element.dispatchEvent(new Event('input', { bubbles: true }));
        r.element.dispatchEvent(new Event('change', { bubbles: true }));
        return r.matchedKind;
      }

      case 'change': {
        const r = await waitForElement(step.selectors, DEFAULT_RESOLVE_TIMEOUT_MS, rowRoot);
        if (!r) throw new Error('No matching select/checkbox');
        const value = substitute(step.value ?? '', vars);
        if (r.element instanceof HTMLSelectElement) {
          setReactValue(r.element, value);
        } else if (r.element instanceof HTMLInputElement) {
          if (r.element.type === 'checkbox' || r.element.type === 'radio') {
            r.element.checked = value === 'true';
          } else {
            setReactValue(r.element, value);
          }
        }
        r.element.dispatchEvent(new Event('change', { bubbles: true }));
        return r.matchedKind;
      }

      case 'submit': {
        const r = await waitForElement(step.selectors, DEFAULT_RESOLVE_TIMEOUT_MS, rowRoot);
        if (!r) throw new Error('No matching form to submit');
        const form = r.element instanceof HTMLFormElement ? r.element : r.element.closest('form');
        if (!form) throw new Error('Resolved element is not inside a form');
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        return r.matchedKind;
      }

      case 'keypress': {
        const r = await waitForElement(step.selectors, DEFAULT_RESOLVE_TIMEOUT_MS, rowRoot);
        if (!r) throw new Error('No matching element for keypress');
        const key = step.value ?? 'Enter';
        r.element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        r.element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
        return r.matchedKind;
      }

      case 'assert': {
        const r = await waitForElement(step.selectors, DEFAULT_RESOLVE_TIMEOUT_MS, rowRoot);
        if (!r) throw new Error(`Assertion failed — could not find ${step.visibleText ?? 'element'}`);
        return r.matchedKind;
      }
    }
  }
}

import { buildSelectors } from './selectors';
import type { RecordedStep } from './types';

/* ----------------------------------------------------------------------
 *  Recorder — captures DOM events as RecordedSteps.
 *
 *  Listens at the document level in capture phase, so it sees events
 *  *before* the app's own React handlers (and crucially before the
 *  overlay's own clicks). Does NOT call preventDefault — the actual user
 *  interaction must still proceed so page state changes naturally.
 *
 *  The overlay itself is decorated with `data-recorder-overlay`; events
 *  originating inside it are ignored.
 * ------------------------------------------------------------------- */

const OVERLAY_ATTR = 'data-recorder-overlay';

const isInsideOverlay = (el: EventTarget | null): boolean => {
  if (!(el instanceof Element)) return false;
  return !!el.closest(`[${OVERLAY_ATTR}]`);
};

const uid = (): string =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `step_${Math.random().toString(36).slice(2)}_${Date.now()}`;

const visibleTextOf = (el: Element): string | undefined => {
  const t = (el.textContent ?? '').trim().replace(/\s+/g, ' ');
  return t && t.length <= 200 ? t : undefined;
};

export interface RecorderOptions {
  onStep: (step: RecordedStep) => void;
  /** Optional debounce for input events (ms). Default 350. */
  inputDebounceMs?: number;
}

export class Recorder {
  private opts: RecorderOptions;
  private listening = false;
  private inputTimers = new WeakMap<Element, number>();
  private lastUrl = '';
  private navTimer: number | null = null;

  constructor(opts: RecorderOptions) {
    this.opts = opts;
  }

  start(): void {
    if (this.listening) return;
    this.listening = true;
    this.lastUrl = window.location.pathname + window.location.search;
    document.addEventListener('click', this.onClick, true);
    document.addEventListener('input', this.onInput, true);
    document.addEventListener('change', this.onChange, true);
    document.addEventListener('submit', this.onSubmit, true);
    document.addEventListener('keydown', this.onKeyDown, true);
    this.navTimer = window.setInterval(this.onMaybeNavigate, 400);
  }

  stop(): void {
    if (!this.listening) return;
    this.listening = false;
    document.removeEventListener('click', this.onClick, true);
    document.removeEventListener('input', this.onInput, true);
    document.removeEventListener('change', this.onChange, true);
    document.removeEventListener('submit', this.onSubmit, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    if (this.navTimer !== null) {
      window.clearInterval(this.navTimer);
      this.navTimer = null;
    }
  }

  pause(): void { this.stop(); }
  resume(): void { this.start(); }
  isRunning(): boolean { return this.listening; }

  /* ------------------- handlers ------------------- */

  private onClick = (e: Event): void => {
    if (isInsideOverlay(e.target)) return;
    let el = e.target as Element | null;
    if (!el) return;
    // If the click landed on an inner node (SVG icon, <path>, <span>),
    // walk up to the nearest semantically clickable ancestor — that's
    // what the teacher actually intended to click, and it has stable
    // selectors (role, testid, label).
    if (!(el instanceof HTMLElement) || el.tagName === 'SVG' || el.tagName === 'PATH') {
      const up = el.closest('button, a, [role="button"], input, label, [onclick]');
      if (up) el = up;
    } else if (el.tagName === 'SPAN' || el.tagName === 'I') {
      const up = el.closest('button, a, [role="button"], input, label');
      if (up) el = up;
    }
    this.emit({
      id: uid(),
      type: 'click',
      selectors: buildSelectors(el),
      visibleText: visibleTextOf(el),
      tagName: el.tagName.toLowerCase(),
      url: window.location.pathname,
    });
  };

  private onInput = (e: Event): void => {
    if (isInsideOverlay(e.target)) return;
    const el = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (!el || !('value' in el)) return;
    // Skip native pickers handled by `change` (selects, checkboxes, etc.)
    if (el.tagName === 'SELECT') return;
    const prev = this.inputTimers.get(el);
    if (prev) window.clearTimeout(prev);
    const debounce = this.opts.inputDebounceMs ?? 350;
    const timer = window.setTimeout(() => {
      this.emit({
        id: uid(),
        type: 'input',
        selectors: buildSelectors(el),
        value: el.value,
        tagName: el.tagName.toLowerCase(),
        url: window.location.pathname,
      });
    }, debounce);
    this.inputTimers.set(el, timer);
  };

  private onChange = (e: Event): void => {
    if (isInsideOverlay(e.target)) return;
    const el = e.target as HTMLSelectElement | HTMLInputElement;
    if (!el) return;
    if (el.tagName !== 'SELECT' && (el as HTMLInputElement).type !== 'checkbox' && (el as HTMLInputElement).type !== 'radio') {
      return;
    }
    this.emit({
      id: uid(),
      type: 'change',
      selectors: buildSelectors(el),
      value: el.tagName === 'SELECT'
        ? (el as HTMLSelectElement).value
        : String((el as HTMLInputElement).checked),
      visibleText: el.tagName === 'SELECT'
        ? ((el as HTMLSelectElement).selectedOptions[0]?.textContent ?? '').trim()
        : undefined,
      tagName: el.tagName.toLowerCase(),
      url: window.location.pathname,
    });
  };

  private onSubmit = (e: Event): void => {
    if (isInsideOverlay(e.target)) return;
    const el = e.target as Element;
    this.emit({
      id: uid(),
      type: 'submit',
      selectors: buildSelectors(el),
      tagName: el.tagName.toLowerCase(),
      url: window.location.pathname,
    });
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isInsideOverlay(e.target)) return;
    // Only record meaningful keys — typing already produces input events.
    if (!['Enter', 'Escape', 'Tab'].includes(e.key)) return;
    const el = e.target as Element;
    this.emit({
      id: uid(),
      type: 'keypress',
      selectors: buildSelectors(el),
      value: e.key,
      tagName: el.tagName.toLowerCase(),
      url: window.location.pathname,
    });
  };

  private onMaybeNavigate = (): void => {
    const cur = window.location.pathname + window.location.search;
    if (cur !== this.lastUrl) {
      this.lastUrl = cur;
      this.emit({
        id: uid(),
        type: 'navigate',
        selectors: [],
        url: cur,
      });
    }
  };

  private emit(step: RecordedStep): void {
    this.opts.onStep(step);
  }
}

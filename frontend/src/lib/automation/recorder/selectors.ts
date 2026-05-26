import type { Selector } from './types';

/* ----------------------------------------------------------------------
 *  Selector generation — runs at record time.
 *
 *  Goal: produce a priority-ordered list of selectors so the player can
 *  fall back gracefully when the page changes a bit between record/replay.
 * ------------------------------------------------------------------- */

const STABLE_ATTRS = ['data-automation-id', 'data-testid', 'data-test', 'data-cy'];

const text = (el: Element): string => (el.textContent ?? '').trim().replace(/\s+/g, ' ');

const safeRoleName = (el: Element): { role: string; name: string } | null => {
  const role = el.getAttribute('role') ?? implicitRole(el);
  if (!role) return null;
  const name =
    el.getAttribute('aria-label')
    ?? (el as HTMLInputElement).placeholder
    ?? text(el).slice(0, 80);
  if (!name) return null;
  return { role, name };
};

const implicitRole = (el: Element): string | null => {
  const tag = el.tagName.toLowerCase();
  if (tag === 'button') return 'button';
  if (tag === 'a' && (el as HTMLAnchorElement).hasAttribute('href')) return 'link';
  if (tag === 'input') {
    const t = (el as HTMLInputElement).type;
    if (t === 'button' || t === 'submit' || t === 'reset') return 'button';
    if (t === 'checkbox') return 'checkbox';
    if (t === 'radio') return 'radio';
    return 'textbox';
  }
  if (tag === 'textarea') return 'textbox';
  if (tag === 'select') return 'combobox';
  return null;
};

const cssPath = (el: Element, maxDepth = 4): string => {
  const segments: string[] = [];
  let cur: Element | null = el;
  let depth = 0;
  while (cur && cur.nodeType === Node.ELEMENT_NODE && depth < maxDepth) {
    let seg = cur.tagName.toLowerCase();
    if (cur.id) {
      seg += `#${CSS.escape(cur.id)}`;
      segments.unshift(seg);
      break;
    }
    const className = (cur.getAttribute('class') ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (className.length) seg += '.' + className.map(c => CSS.escape(c)).join('.');
    const parent = cur.parentElement;
    if (parent) {
      const same = Array.from(parent.children).filter(c => c.tagName === cur!.tagName);
      if (same.length > 1) {
        const idx = same.indexOf(cur) + 1;
        seg += `:nth-of-type(${idx})`;
      }
    }
    segments.unshift(seg);
    cur = cur.parentElement;
    depth += 1;
  }
  return segments.join(' > ');
};

const xpath = (el: Element): string => {
  const segments: string[] = [];
  let cur: Element | null = el;
  while (cur && cur.nodeType === Node.ELEMENT_NODE) {
    let idx = 1;
    let sib = cur.previousElementSibling;
    while (sib) { if (sib.tagName === cur.tagName) idx += 1; sib = sib.previousElementSibling; }
    segments.unshift(`${cur.tagName.toLowerCase()}[${idx}]`);
    if (cur.parentElement === document.documentElement) break;
    cur = cur.parentElement;
  }
  return '/' + segments.join('/');
};

const labelFor = (el: HTMLElement): string | null => {
  if (el.id) {
    const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (lab) return text(lab);
  }
  const wrapping = el.closest('label');
  if (wrapping) return text(wrapping);
  return null;
};

export const buildSelectors = (el: Element): Selector[] => {
  const out: Selector[] = [];

  for (const a of STABLE_ATTRS) {
    const v = el.getAttribute(a);
    if (v) out.push({ kind: 'testid', value: v, detail: a });
  }

  if (el.id) out.push({ kind: 'id', value: el.id });

  const rn = safeRoleName(el);
  if (rn) out.push({ kind: 'role', value: rn.role, detail: rn.name });

  if (el instanceof HTMLElement) {
    const lab = labelFor(el);
    if (lab) out.push({ kind: 'label', value: lab });
  }

  const t = text(el);
  if (t && t.length <= 80) {
    out.push({ kind: 'text', value: t, detail: el.tagName.toLowerCase() });
  }

  out.push({ kind: 'css', value: cssPath(el) });
  out.push({ kind: 'xpath', value: xpath(el) });

  return out;
};

/* ----------------------------------------------------------------------
 *  Selector resolution — runs at replay time.
 *
 *  Walk the list in order; first selector that resolves to exactly one
 *  visible element wins. Returns `{ element, matchedKind }` or null.
 * ------------------------------------------------------------------- */

const isVisible = (el: Element): boolean => {
  if (!(el instanceof HTMLElement)) return true;
  if (el.hidden) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  return true;
};

const findByText = (text: string, tag: string | undefined, root: ParentNode): Element[] => {
  const candidates = Array.from(root.querySelectorAll(tag ?? '*'));
  return candidates.filter(el => {
    const own = (el.textContent ?? '').trim().replace(/\s+/g, ' ');
    return own === text;
  });
};

const findByRole = (role: string, name: string, root: ParentNode): Element[] => {
  const selector = `[role="${role}"], ` + (
    role === 'button' ? 'button, input[type=button], input[type=submit]'
    : role === 'link' ? 'a[href]'
    : role === 'textbox' ? 'input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea'
    : role === 'combobox' ? 'select'
    : role === 'checkbox' ? 'input[type=checkbox]'
    : role === 'radio' ? 'input[type=radio]'
    : '*'
  );
  return Array.from(root.querySelectorAll(selector)).filter(el => {
    const ariaName = el.getAttribute('aria-label');
    if (ariaName === name) return true;
    const ph = (el as HTMLInputElement).placeholder;
    if (ph === name) return true;
    return ((el.textContent ?? '').trim().replace(/\s+/g, ' ') === name);
  });
};

const xpathLookup = (expr: string, root: Node): Element | null => {
  try {
    const r = document.evaluate(expr, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return (r.singleNodeValue as Element | null) ?? null;
  } catch {
    return null;
  }
};

export interface ResolveResult {
  element: Element;
  matchedKind: Selector['kind'];
}

/**
 * Resolve a selector list to a single visible element.
 *
 * When `root` is provided, the search is scoped to descendants of that
 * element first; if nothing matches inside, we fall back to the whole
 * document so dialogs/portals (which render outside the row) still resolve.
 */
export const resolveSelectors = (
  selectors: Selector[],
  root?: Element | null,
): ResolveResult | null => {
  if (root) {
    for (const s of selectors) {
      const cs = trySelector(s, root).filter(isVisible);
      if (cs.length >= 1) return { element: cs[0]!, matchedKind: s.kind };
    }
  }
  for (const s of selectors) {
    const cs = trySelector(s, document).filter(isVisible);
    if (cs.length >= 1) return { element: cs[0]!, matchedKind: s.kind };
  }
  return null;
};

const trySelector = (s: Selector, root: ParentNode): Element[] => {
  try {
    switch (s.kind) {
      case 'testid': {
        const attr = s.detail ?? 'data-testid';
        return Array.from(root.querySelectorAll(`[${attr}="${CSS.escape(s.value)}"]`));
      }
      case 'id': {
        const el = root instanceof Document
          ? root.getElementById(s.value)
          : (root as Element).querySelector(`#${CSS.escape(s.value)}`);
        return el ? [el] : [];
      }
      case 'role':
        return findByRole(s.value, s.detail ?? '', root);
      case 'text':
        return findByText(s.value, s.detail, root);
      case 'label': {
        const labels = Array.from(root.querySelectorAll('label')).filter(
          l => (l.textContent ?? '').trim().replace(/\s+/g, ' ') === s.value,
        );
        const els: Element[] = [];
        for (const l of labels) {
          const forId = l.getAttribute('for');
          if (forId) {
            const t = document.getElementById(forId);
            if (t) els.push(t);
          } else {
            const inner = l.querySelector('input, textarea, select');
            if (inner) els.push(inner);
          }
        }
        return els;
      }
      case 'css':
        return Array.from(root.querySelectorAll(s.value));
      case 'xpath': {
        const el = xpathLookup(s.value, root as Node);
        return el ? [el] : [];
      }
    }
  } catch {
    return [];
  }
};

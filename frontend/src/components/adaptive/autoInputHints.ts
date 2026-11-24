import { useEffect } from 'react';

/**
 * Touch-device keyboard hints for every form field, without editing each page.
 * Only fills in attributes a field doesn't already declare, and only ones React never sets
 * itself, so explicit props on a field always win:
 *   number   → inputmode="decimal" (or "numeric" when step is a whole number) → number keypad
 *   email    → autocapitalize="none", autocorrect="off", autocomplete="email"
 *   tel      → inputmode="tel"
 *   search   → enterkeyhint="search"; other single-line fields → enterkeyhint="done"
 *   password → autocomplete="current-password"
 * Also scrolls a focused field on the page clear of the on-screen keyboard.
 */
export function useAutoInputHints(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const run = () => { frame = 0; document.querySelectorAll<HTMLInputElement>('input:not([data-hinted])').forEach(hint); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(run); };
    run();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (!el.matches?.('input, textarea, select') || el.closest('.sheet, .fsm')) return; // sheets handle their own
      window.setTimeout(() => {
        const vv = window.visualViewport;
        const bottom = el.getBoundingClientRect().bottom;
        const visible = vv ? vv.height + vv.offsetTop : window.innerHeight;
        // Leave room for the fixed tab bar / sticky action bar
        if (bottom > visible - 96) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 320);
    };
    document.addEventListener('focusin', onFocus);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('focusin', onFocus);
    };
  }, [enabled]);
}

const setIfMissing = (el: HTMLElement, name: string, value: string) => { if (!el.hasAttribute(name)) el.setAttribute(name, value); };

function hint(el: HTMLInputElement) {
  el.setAttribute('data-hinted', '');
  const type = (el.getAttribute('type') || 'text').toLowerCase();
  switch (type) {
    case 'number': {
      const step = el.getAttribute('step');
      const whole = step !== null && step !== 'any' && Number.isInteger(Number(step));
      setIfMissing(el, 'inputmode', whole ? 'numeric' : 'decimal');
      setIfMissing(el, 'enterkeyhint', 'done');
      break;
    }
    case 'email':
      setIfMissing(el, 'autocapitalize', 'none');
      setIfMissing(el, 'autocorrect', 'off');
      setIfMissing(el, 'autocomplete', 'email');
      setIfMissing(el, 'enterkeyhint', 'next');
      break;
    case 'tel':
      setIfMissing(el, 'inputmode', 'tel');
      setIfMissing(el, 'autocomplete', 'tel');
      break;
    case 'password':
      setIfMissing(el, 'autocomplete', 'current-password');
      setIfMissing(el, 'enterkeyhint', 'go');
      break;
    case 'search':
      setIfMissing(el, 'enterkeyhint', 'search');
      break;
    case 'text': {
      const isSearch = el.classList.contains('search-input') || /search/i.test(el.getAttribute('placeholder') || '');
      setIfMissing(el, 'enterkeyhint', isSearch ? 'search' : 'done');
      if (isSearch) { setIfMissing(el, 'autocorrect', 'off'); setIfMissing(el, 'autocapitalize', 'none'); }
      break;
    }
  }
}

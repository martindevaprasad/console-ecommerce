import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Renders children into document.body (sheets/modals escape transformed or clipped parents). */
export const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => createPortal(children, document.body);

let locks = 0;
let savedOverflow = '';

/** Locks page scroll while `active` (ref-counted, so stacked sheets unlock in order). */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (locks++ === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (--locks === 0) document.body.style.overflow = savedOverflow;
    };
  }, [active]);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab focus inside `ref` while active, closes on Escape, and returns focus
 * to whatever had it before (normally the trigger button) when it deactivates.
 */
export function useFocusTrap(ref: React.RefObject<HTMLElement>, active: boolean, onEscape?: () => void) {
  const escRef = useRef(onEscape);
  escRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    const previous = document.activeElement as HTMLElement | null;
    // Focus an explicit [data-autofocus] or [autofocus] field, else the dialog itself: screen readers
    // announce the dialog, Tab moves to the first control, and no stray focus ring appears on open.
    const first = node.querySelector<HTMLElement>('[data-autofocus], [autofocus]');
    (first || node).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && escRef.current) { e.stopPropagation(); escRef.current(); return; }
      if (e.key !== 'Tab') return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); return; }
      const [head, tail] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === head) { e.preventDefault(); tail.focus(); }
      else if (!e.shiftKey && document.activeElement === tail) { e.preventDefault(); head.focus(); }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [active, ref]);
}

/**
 * When a field inside `ref` gets focus on a touch device, scroll it into the middle of the
 * visible area once the on-screen keyboard has opened, so the keyboard never covers it.
 */
export function useKeyboardSafeFocus(ref: React.RefObject<HTMLElement>, active = true) {
  useEffect(() => {
    const node = ref.current;
    if (!active || !node) return;
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (!el.matches('input, textarea, select, [contenteditable="true"]')) return;
      window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320);
    };
    node.addEventListener('focusin', onFocus);
    return () => node.removeEventListener('focusin', onFocus);
  }, [ref, active]);
}

/**
 * Keeps an overlay mounted for its exit animation.
 * Returns `mounted` (render it) and `shown` (apply the "open" class).
 */
export function usePresence(open: boolean, exitMs = 280) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Two frames: mount closed, then flip to open so the CSS transition runs.
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => setMounted(false), reduce ? 0 : exitMs);
    return () => window.clearTimeout(t);
  }, [open, exitMs]);
  return { mounted, shown };
}

import React, { useId, useRef, useState } from 'react';
import { IconCheck, IconX } from '@tabler/icons-react';
import { Portal, useBodyScrollLock, useFocusTrap, usePresence } from './overlay';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Small text under the title */
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Sticky footer (primary actions) */
  footer?: React.ReactNode;
  /**
   * Snap points as fractions of the viewport height, smallest first, e.g. [0.4, 0.9].
   * Omit for a sheet that sizes to its content (up to 92% of the screen).
   */
  snapPoints?: number[];
  /** Show the ✕ button in the header (default: when there is a title) */
  showClose?: boolean;
  /** Prevent closing by backdrop tap / swipe (e.g. while saving) */
  dismissible?: boolean;
  className?: string;
  /** Accessible label when there is no visible title */
  ariaLabel?: string;
}

const CLOSE_DISTANCE = 0.28; // fraction of sheet height dragged down that dismisses
const CLOSE_VELOCITY = 0.6;  // px/ms flick that dismisses

/**
 * Native-style bottom sheet: drag handle, swipe-down to dismiss, optional snap
 * points, backdrop, focus trap, Esc to close and body scroll lock.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  open, onClose, title, description, children, footer, snapPoints, showClose, dismissible = true, className, ariaLabel,
}) => {
  const { mounted, shown } = usePresence(open);
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [snap, setSnap] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; t: number; scrollTop: number } | null>(null);

  const close = () => { if (dismissible) onClose(); };
  useBodyScrollLock(mounted);
  useFocusTrap(sheetRef, shown, close);

  // Snap geometry: the sheet is as tall as the largest snap; smaller snaps translate it down.
  const maxSnap = snapPoints?.length ? snapPoints[snapPoints.length - 1] : null;
  const snapOffset = (i: number) => (snapPoints && maxSnap ? (1 - snapPoints[i] / maxSnap) * 100 : 0); // % of sheet height

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const body = sheetRef.current?.querySelector('.sheet-body') as HTMLElement | null;
    // Inside the scrolling body, only start a sheet drag when the body is scrolled to the top.
    const inBody = body?.contains(e.target as Node);
    if (inBody && body && body.scrollTop > 0) return;
    start.current = { y: e.clientY, t: performance.now(), scrollTop: body?.scrollTop ?? 0 };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    if (drag === null && Math.abs(dy) < 6) return; // ignore taps
    if (drag === null && dy < 0 && !snapPoints) { start.current = null; return; } // let content scroll up
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag(dy);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (drag === null || !s) { setDrag(null); return; }
    const height = sheetRef.current?.offsetHeight || 1;
    const velocity = (e.clientY - s.y) / Math.max(1, performance.now() - s.t);
    const currentPct = snapOffset(snap) + (drag / height) * 100;
    setDrag(null);

    if (snapPoints && snapPoints.length > 1) {
      if (velocity > CLOSE_VELOCITY && snap === 0) return close();
      if (velocity > CLOSE_VELOCITY) return setSnap(Math.max(0, snap - 1));
      if (velocity < -CLOSE_VELOCITY) return setSnap(Math.min(snapPoints.length - 1, snap + 1));
      // nearest snap, or close when dragged well below the lowest one
      if (currentPct > snapOffset(0) + CLOSE_DISTANCE * 100) return close();
      let best = 0;
      snapPoints.forEach((_, i) => { if (Math.abs(snapOffset(i) - currentPct) < Math.abs(snapOffset(best) - currentPct)) best = i; });
      return setSnap(best);
    }
    if (drag > height * CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) close();
  };

  if (!mounted) return null;

  const base = shown ? snapOffset(snap) : 100;
  const height = sheetRef.current?.offsetHeight || 1;
  // Never drag above fully open (0%).
  const translate = drag !== null ? Math.max(0, base + (drag / height) * 100) : base;

  return (
    <Portal>
      <div className={`sheet-root${shown ? ' open' : ''}`}>
        <div className="sheet-backdrop" onClick={close} aria-hidden />
        <div
          ref={sheetRef}
          className={`sheet${drag !== null ? ' dragging' : ''}${className ? ` ${className}` : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : ariaLabel}
          tabIndex={-1}
          style={{
            transform: `translateY(${translate}%)`,
            height: maxSnap ? `calc(var(--vh) * ${maxSnap * 100})` : undefined,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="sheet-handle" aria-hidden><span /></div>
          {(title || showClose) && (
            <div className="sheet-head">
              <div className="sheet-head-text">
                {title && <h2 className="sheet-title" id={titleId}>{title}</h2>}
                {description && <p className="sheet-desc">{description}</p>}
              </div>
              {(showClose ?? !!title) && dismissible && (
                <button type="button" className="sheet-close" onClick={onClose} aria-label="Close"><IconX size={18} /></button>
              )}
            </div>
          )}
          <div className="sheet-body">{children}</div>
          {footer && <div className="sheet-foot">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
};

/* ───────────────────────── Action sheet ───────────────────────── */

export interface SheetAction {
  key?: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Secondary text under the label */
  hint?: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Shows a checkmark (for "pick one" groups) */
  checked?: boolean;
  /** Keep the sheet open after selecting */
  keepOpen?: boolean;
}

export interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  message?: React.ReactNode;
  /** One list, or several groups separated visually */
  actions?: SheetAction[];
  groups?: { label?: string; actions: SheetAction[] }[];
  /** Content shown above the actions (e.g. an account header) */
  header?: React.ReactNode;
  cancelLabel?: string;
}

/** iOS-style action list with a separate Cancel button. Replaces "…" menus and popovers on phones. */
export const ActionSheet: React.FC<ActionSheetProps> = ({ open, onClose, title, message, actions, groups, header, cancelLabel = 'Cancel' }) => {
  const all = groups || (actions ? [{ actions }] : []);
  return (
    <BottomSheet open={open} onClose={onClose} className="action-sheet" ariaLabel={typeof title === 'string' ? title : 'Actions'} showClose={false}>
      {header}
      {(title || message) && (
        <div className="as-intro">
          {title && <div className="as-title">{title}</div>}
          {message && <div className="as-message">{message}</div>}
        </div>
      )}
      {all.map((g, gi) => (
        <div className="as-group" key={g.label || gi} role="group" aria-label={g.label}>
          {g.label && <div className="as-group-label">{g.label}</div>}
          {g.actions.map((a, i) => (
            <button
              key={a.key || i}
              type="button"
              className={`as-item${a.destructive ? ' danger' : ''}`}
              disabled={a.disabled}
              role={a.checked !== undefined ? 'menuitemradio' : undefined}
              aria-checked={a.checked}
              onClick={() => { a.onSelect(); if (!a.keepOpen) onClose(); }}
            >
              {a.icon && <span className="as-icon">{a.icon}</span>}
              <span className="as-label">{a.label}{a.hint && <small>{a.hint}</small>}</span>
              {a.checked && <IconCheck size={18} className="as-check" />}
            </button>
          ))}
        </div>
      ))}
      <button type="button" className="as-cancel" onClick={onClose}>{cancelLabel}</button>
    </BottomSheet>
  );
};

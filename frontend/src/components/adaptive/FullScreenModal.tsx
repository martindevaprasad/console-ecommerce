import React, { useId, useRef } from 'react';
import { IconX } from '@tabler/icons-react';
import { Portal, useBodyScrollLock, useFocusTrap, useKeyboardSafeFocus, usePresence } from './overlay';

export interface FullScreenModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  /** Sticky bottom action bar (the existing modal/drawer footer buttons) */
  footer?: React.ReactNode;
  /** Optional primary action in the top bar, e.g. <button>Save</button> */
  primaryAction?: React.ReactNode;
  /** Label for the dismiss button; an ✕ icon is shown when omitted */
  closeLabel?: string;
}

/**
 * Phone pattern for large dialogs, forms and drawers: slides up to cover the screen with a
 * top bar (Close · Title · optional action), a scrolling body and a sticky action bar.
 */
export const FullScreenModal: React.FC<FullScreenModalProps> = ({ open, onClose, title, children, footer, primaryAction, closeLabel }) => {
  const { mounted, shown } = usePresence(open, 320);
  const ref = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useBodyScrollLock(mounted);
  useFocusTrap(ref, shown, onClose);
  useKeyboardSafeFocus(bodyRef, shown);

  if (!mounted) return null;
  return (
    <Portal>
      <div ref={ref} className={`fsm${shown ? ' open' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="fsm-bar">
          <button type="button" className={closeLabel ? 'fsm-text-btn' : 'm-icon-btn fsm-close'} onClick={onClose} aria-label={closeLabel ? undefined : 'Close'}>
            {closeLabel || <IconX size={22} />}
          </button>
          <h2 className="fsm-title" id={titleId}>{title}</h2>
          <div className="fsm-action">{primaryAction}</div>
        </header>
        <div className="fsm-body" ref={bodyRef}>{children}</div>
        {footer && <div className="fsm-foot">{footer}</div>}
      </div>
    </Portal>
  );
};

export default FullScreenModal;

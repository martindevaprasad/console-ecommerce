import React, { useId, useRef } from 'react';
import { useDevice } from '../adaptive/device';
import { BottomSheet } from '../adaptive/BottomSheet';
import { FullScreenModal } from '../adaptive/FullScreenModal';
import { useBodyScrollLock, useFocusTrap } from '../adaptive/overlay';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

/**
 * Adaptive dialog. Same API everywhere; the presentation follows the device:
 *   desktop – centered dialog (unchanged)
 *   tablet  – centered dialog, plus focus trap / Esc / scroll lock
 *   mobile  – sm/md: bottom sheet · lg/xl: full-screen with a sticky action bar
 */
export const Modal: React.FC<ModalProps> = (props) => {
  const { device } = useDevice();
  if (device === 'mobile') return <MobileModal {...props} />;
  if (device === 'tablet') return <CenteredModal {...props} trap />;
  return <CenteredModal {...props} />;
};

const MobileModal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', footer }) =>
  size === 'lg' || size === 'xl'
    ? <FullScreenModal open={isOpen} onClose={onClose} title={title} footer={footer}>{children}</FullScreenModal>
    : <BottomSheet open={isOpen} onClose={onClose} title={title} footer={footer}>{children}</BottomSheet>;

const CenteredModal: React.FC<ModalProps & { trap?: boolean }> = ({ isOpen, onClose, title, children, size = 'md', footer, trap }) => {
  if (!isOpen) return null;
  return trap
    ? <TrappedDialog onClose={onClose} title={title} size={size} footer={footer}>{children}</TrappedDialog>
    : <Dialog onClose={onClose} title={title} size={size} footer={footer}>{children}</Dialog>;
};

type DialogProps = Omit<ModalProps, 'isOpen'> & { dialogRef?: React.Ref<HTMLDivElement> };

/** The original centered dialog markup (desktop renders exactly this). */
const Dialog: React.FC<DialogProps> = ({ onClose, title, children, size = 'md', footer, dialogRef }) => {
  const titleId = useId();
  const sizeClass = size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : '';

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div ref={dialogRef} className={`modal ${sizeClass}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={dialogRef ? -1 : undefined}>
        <div className="modal-header">
          <h2 className="modal-title" id={titleId}>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <div>{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

/** Tablet: same dialog with focus trap, Esc to close and page scroll lock. */
const TrappedDialog: React.FC<DialogProps> = (props) => {
  const ref = useRef<HTMLDivElement>(null);
  useBodyScrollLock(true);
  useFocusTrap(ref, true, props.onClose);
  return <Dialog {...props} dialogRef={ref} />;
};

export default Modal;

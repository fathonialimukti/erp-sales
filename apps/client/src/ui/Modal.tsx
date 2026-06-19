import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Icon } from "./";
import "./Modal.css";

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
}

const SIZE_CLASS: Record<string, string> = {
  sm: "modal-content--sm",
  md: "modal-content--md",
  lg: "modal-content--lg",
  xl: "modal-content--xl",
};

export const Modal = ({
  isOpen,
  onClose,
  children,
  size = "md",
  closeOnBackdrop = true,
}: ModalProps) => {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [isOpen]);

  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdrop) return;
    if (e.target === ref.current) onClose?.();
  };

  return (
    <dialog
      ref={ref}
      onClick={handleClick}
      onCancel={(e) => { e.preventDefault(); onClose?.(); }}
      onClose={onClose}
      className="modal-overlay"
    >
      <div className={`modal-content ${SIZE_CLASS[size]}`}>
        {children}
      </div>
    </dialog>
  );
};

interface ModalHeaderProps { children: ReactNode; onClose?: () => void; }
export const ModalHeader = ({ children, onClose }: ModalHeaderProps) => (
  <div className="modal-header">
    <h2 className="modal-header__title">{children}</h2>
    {onClose && (
      <button type="button" aria-label="Close dialog" onClick={onClose} className="modal-header__close">
        <Icon icon="solar:close-circle-linear" />
      </button>
    )}
  </div>
);

export const ModalBody = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`modal-body ${className ?? ""}`}>{children}</div>
);

export const ModalContent = ModalBody;

export const ModalFooter = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`modal-footer ${className ?? ""}`}>{children}</div>
);

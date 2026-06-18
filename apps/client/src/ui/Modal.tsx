import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Icon } from "./";
import { cn } from "./cn";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
}

const SIZE: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
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

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdrop) return;
    if (e.target === ref.current) onClose();
  };

  return (
    <dialog
      ref={ref}
      onClick={handleClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
      className="m-0 max-h-[100dvh] max-w-[100vw] bg-transparent p-0 backdrop:bg-slate-900/40"
    >
      <div
        className={cn(
          "relative w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-surface-1 shadow-lg",
          "dark:border-slate-800",
          SIZE[size],
        )}
      >
        {children}
      </div>
    </dialog>
  );
};

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
}
export const ModalHeader = ({ children, onClose }: ModalHeaderProps) => (
  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{children}</h2>
    {onClose && (
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
      >
        <Icon icon="solar:close-circle-linear" className="h-5 w-5" />
      </button>
    )}
  </div>
);

export const ModalBody = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("px-5 py-4 text-sm text-slate-700 dark:text-slate-200", className)}>{children}</div>
);

export const ModalFooter = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800", className)}>
    {children}
  </div>
);

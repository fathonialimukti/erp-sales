import type { ReactNode } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
}

const SIZE_CLASS: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export const Modal = ({
  isOpen,
  onClose,
  children,
  size = "md",
  closeOnBackdrop = true,
}: ModalProps) => (
  <Dialog
    open={isOpen}
    onOpenChange={(open) => {
      if (!open) onClose?.();
    }}
  >
    <DialogContent
      showCloseButton={false}
      className={cn("gap-0 p-0", SIZE_CLASS[size])}
      onInteractOutside={(e) => {
        if (!closeOnBackdrop) e.preventDefault();
      }}
      onEscapeKeyDown={(e) => {
        if (!onClose) e.preventDefault();
      }}
    >
      {children}
    </DialogContent>
  </Dialog>
);

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
}
export const ModalHeader = ({ children, onClose }: ModalHeaderProps) => (
  <DialogHeader className="relative flex-row items-center justify-between space-y-0 border-b px-6 py-4 text-left">
    <DialogTitle className="pr-8 text-base font-semibold">{children}</DialogTitle>
    {onClose ? (
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute top-3.5 right-4 rounded-md p-1 text-muted-foreground transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" />
      </button>
    ) : null}
  </DialogHeader>
);

export const ModalBody = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <div className={cn("px-6 py-4", className)}>{children}</div>;

export const ModalContent = ModalBody;

export const ModalFooter = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <DialogFooter className={cn("border-t px-6 py-4 sm:justify-end", className)}>
    {children}
  </DialogFooter>
);

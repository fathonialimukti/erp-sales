import type { ReactNode } from "react";
import { Icon } from "./";
import { cn } from "./cn";

type Tone = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  tone: Tone;
}

const TONE: Record<Tone, { icon: string; border: string; iconColor: string }> = {
  success: {
    icon: "solar:check-circle-bold",
    border: "border-l-state-success",
    iconColor: "text-state-success",
  },
  error: {
    icon: "solar:close-circle-bold",
    border: "border-l-state-danger",
    iconColor: "text-state-danger",
  },
  info: {
    icon: "solar:info-circle-bold",
    border: "border-l-state-info",
    iconColor: "text-state-info",
  },
  warning: {
    icon: "solar:shield-warning-bold",
    border: "border-l-state-warning",
    iconColor: "text-state-warning",
  },
};

const ToastItem = ({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) => {
  const tone = TONE[toast.tone];
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-80 items-start gap-3 rounded-md border border-slate-200 border-l-4 bg-surface-1 px-4 py-3 shadow-md",
        "dark:border-slate-800",
        tone.border,
      )}
    >
      <Icon icon={tone.icon} className={cn("mt-0.5 h-5 w-5 shrink-0", tone.iconColor)} />
      <p className="flex-1 text-sm text-slate-800 dark:text-slate-100">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
      </button>
    </div>
  );
};

interface ToastProviderProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export const ToastProvider = ({ toasts, onDismiss }: ToastProviderProps) => (
  <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end">
    {toasts.map((toast) => (
      <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
    ))}
  </div>
);

export type { Toast };

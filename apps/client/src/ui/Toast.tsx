import { Icon } from "./";
import "./Toast.css";

type Tone = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  tone: Tone;
}

const TONE_ICON: Record<Tone, string> = {
  success: "solar:check-circle-bold",
  error: "solar:close-circle-bold",
  info: "solar:info-circle-bold",
  warning: "solar:shield-warning-bold",
};

const ToastItem = ({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) => (
  <div className={`toast toast--${toast.tone}`}>
    <Icon icon={TONE_ICON[toast.tone]} className={`toast__icon toast__icon--${toast.tone}`} />
    <p className="toast__message">{toast.message}</p>
    <button type="button" aria-label="Dismiss" onClick={() => onDismiss(toast.id)} className="toast__dismiss">
      <Icon icon="solar:close-circle-linear" />
    </button>
  </div>
);

interface ToastProviderProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export const ToastProvider = ({ toasts, onDismiss }: ToastProviderProps) => (
  <div className="toast-container">
    {toasts.map((toast) => (
      <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
    ))}
  </div>
);

export type { Toast };
export { useToast } from "./useToast";

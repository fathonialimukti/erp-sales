import { atom, useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import { ToastProvider, type Toast } from "./Toast";

const toastsAtom = atom<Toast[]>([]);
let nextId = 1;

interface ShowToastOptions {
  message: string;
  tone?: Toast["tone"];
  durationMs?: number;
}

const useToastStore = () => {
  const [toasts, setToasts] = useAtom(toastsAtom);

  const dismiss = useCallback(
    (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    [setToasts],
  );

  const show = useCallback(
    ({ message, tone = "info", durationMs = 3500 }: ShowToastOptions) => {
      const id = `t${nextId++}`;
      setToasts((prev) => [...prev, { id, message, tone }]);
      if (durationMs > 0) {
        window.setTimeout(() => dismiss(id), durationMs);
      }
    },
    [setToasts, dismiss],
  );

  return { toasts, dismiss, show };
};

const ToastContainer = () => {
  const { toasts, dismiss } = useToastStore();
  return <ToastProvider toasts={toasts} onDismiss={dismiss} />;
};

export const useToast = () => {
  const { show } = useToastStore();
  return {
    success: (message: string) => show({ message, tone: "success" }),
    error: (message: string) => show({ message, tone: "error" }),
    info: (message: string) => show({ message, tone: "info" }),
    warning: (message: string) => show({ message, tone: "warning" }),
  };
};

export { ToastContainer };

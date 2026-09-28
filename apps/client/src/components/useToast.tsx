import { toast as sonnerToast } from "sonner";

import { getFriendlyErrorMessage } from "@/lib/friendlyError";

interface ShowToastOptions {
  message: string;
  tone?: "success" | "error" | "info" | "warning";
  durationMs?: number;
}

// Canonical toast: sonner via useToast. ui/sonner.tsx mounts <Toaster/>.
// This module stays the single import site — pages never import "sonner"
// directly (only this file + ui/sonner.tsx do).

const show = ({ message, tone = "info", durationMs = 3500 }: ShowToastOptions) => {
  // id + testId lets ui/sonner.tsx's delegated click handler dismiss this toast
  const id = crypto.randomUUID();
  const opts = { duration: durationMs, id, testId: id };
  if (tone === "success") sonnerToast.success(message, opts);
  else if (tone === "error") sonnerToast.error(message, opts);
  else if (tone === "warning") sonnerToast.warning(message, opts);
  else sonnerToast.info(message, opts);
};

export const useToast = () => ({
  success: (message: string) => show({ message, tone: "success" }),
  error: (messageOrError: unknown, fallback?: string) =>
    show({
      // Accepts a plain string or a thrown value; thrown values get DB-error translation.
      message:
        typeof messageOrError === "string"
          ? messageOrError
          : getFriendlyErrorMessage(messageOrError, fallback),
      tone: "error",
    }),
  info: (message: string) => show({ message, tone: "info" }),
  warning: (message: string) => show({ message, tone: "warning" }),
});

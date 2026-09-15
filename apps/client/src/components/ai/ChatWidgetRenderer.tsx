import { motion, useReducedMotion } from "motion/react";
import { Puzzle } from "lucide-react";
import { useIntl } from "react-intl";
import type { ReactNode } from "react";

import type {
  ChatActionResult,
  ChatConfirmActionWidget,
  ChatFormResponse,
  ChatWidget,
} from "@repo/schemas/chatWidget";
import { getMotionProps, pageEnter } from "@/lib/motion";
import { ChatConfirmCard } from "./ChatConfirmCard";
import { ChatFormRequestCard } from "./ChatFormRequestCard";

export interface ChatWidgetRendererProps {
  widget: ChatWidget;
  chatId: string;
  /** Freeze interaction (e.g. while an AI turn is streaming) without locking the card. */
  disabled?: boolean;
  /** Pass-through seam (Task 8): form card callbacks — undefined keeps the cards inert. */
  onSubmitted?: (response: ChatFormResponse) => void;
  onCancelled?: (widgetId: string) => void;
  /** Pass-through seam (Task 8): confirm card callbacks. */
  onStatusChange?: (status: ChatConfirmActionWidget["status"]) => void;
  onResult?: (result: ChatActionResult) => void;
  /**
   * Reload-path result (SPEC §7 re-show): persisted `action_result` for the
   * confirm widget's `confirmationId`, resolved by the wiring from the thread.
   * Backward-compatible — undefined keeps the card purely in-session.
   */
  result?: ChatActionResult;
}

/**
 * Renders the widget stored on an assistant message (SPEC §7). Switches on
 * `widget.type`; unknown/future types degrade to a graceful fallback card.
 * Owns the shared enter animation so both card types stay motion-agnostic.
 */
export const ChatWidgetRenderer = ({
  widget,
  chatId,
  disabled,
  onSubmitted,
  onCancelled,
  onStatusChange,
  onResult,
  result,
}: ChatWidgetRendererProps) => {
  const intl = useIntl();
  const reduced = useReducedMotion();

  let card: ReactNode;
  if (widget.type === "form-request") {
    card = (
      <ChatFormRequestCard
        widget={widget}
        chatId={chatId}
        disabled={disabled}
        onSubmitted={onSubmitted}
        onCancelled={onCancelled}
      />
    );
  } else if (widget.type === "confirm-action") {
    card = (
      <ChatConfirmCard
        widget={widget}
        chatId={chatId}
        disabled={disabled}
        onStatusChange={onStatusChange}
        onResult={onResult}
        result={result}
      />
    );
  } else {
    // Unknown/future widget type (SPEC §11) — never a broken card.
    card = (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
        <Puzzle aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">
          {intl.formatMessage({
            id: "ai.widget.error.unsupported",
            defaultMessage: "Unsupported widget",
          })}
        </span>
      </div>
    );
  }

  return (
    <motion.div variants={pageEnter} {...getMotionProps(reduced)} className="w-full max-w-md">
      {card}
    </motion.div>
  );
};

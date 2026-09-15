import { chatActionResultSchema, chatWidgetSchema, type ChatActionResult, type ChatConfirmActionWidget, type ChatFormResponse, type ChatWidget } from "@repo/schemas/chatWidget";
import type { UIMessage } from "ai";

import { ChatWidgetRenderer } from "./ChatWidgetRenderer";

/** One part of a UIMessage (this SDK version types UIMessagePart generically). */
type MessagePart = UIMessage["parts"][number];

/**
 * Task 8 wiring — the glue between the chat surfaces and the widget cards
 * (SPEC §5.3, §7). Widgets arrive as SERVER tool parts on assistant UIMessages
 * (`tool-request_form_input` / `tool-request_confirmation`); when a part reaches
 * `output-available` its output is the widget JSON. Everything here is
 * defensive: malformed payloads never render, widget tool calls are never
 * "executed" client-side, and structured user turns are built exactly as the
 * AI pipeline's `renderStructuredTurns` expects.
 */

/** Server widget tools (mirrors apps/server/src/lib/ai-widgets.ts WIDGET_TOOL_NAMES). */
export const WIDGET_TOOL_NAMES: ReadonlySet<string> = new Set([
  "request_form_input",
  "request_confirmation",
]);

/** True when a UIMessage part belongs to a widget tool (typed or dynamic). */
export const isWidgetToolPart = (part: { type: string; toolName?: unknown }): boolean => {
  if (part.type === "dynamic-tool") return WIDGET_TOOL_NAMES.has(String(part.toolName ?? ""));
  return part.type.startsWith("tool-") && WIDGET_TOOL_NAMES.has(part.type.slice("tool-".length));
};

/**
 * Parse a widget tool part into a validated ChatWidget. Returns null unless the
 * part is a widget tool in `output-available` state whose output passes
 * `chatWidgetSchema` — malformed payloads never render (never a broken card).
 * Returns the ORIGINAL output (not the parsed result): zod strips unknown keys,
 * and the stashed `values` on a submitted form widget must survive to the card.
 */
export const resolveWidgetPartWidget = (part: unknown): ChatWidget | null => {
  if (!part || typeof part !== "object") return null;
  const p = part as { type?: unknown; toolName?: unknown; state?: unknown; output?: unknown };
  if (typeof p.type !== "string" || !isWidgetToolPart(p as { type: string; toolName?: unknown })) {
    return null;
  }
  if (p.state !== "output-available") return null;
  if (!p.output || typeof p.output !== "object") return null;
  const parsed = chatWidgetSchema.safeParse(p.output);
  return parsed.success ? (p.output as ChatWidget) : null;
};

export interface ChatWidgetPartProps {
  /** A tool part of the assistant message being rendered. */
  part: MessagePart;
  chatId: string;
  disabled?: boolean;
  /**
   * The full thread — enables the confirm card's reload-path result
   * (SPEC §7 re-show): the wiring resolves the most recent matching
   * `action_result` turn and passes it down as the card's `result` prop.
   */
  messages?: readonly UIMessage[];
  /** Form card callbacks (Task 8 surface handlers). */
  onSubmitted?: (response: ChatFormResponse) => void;
  onCancelled?: (widgetId: string) => void;
  /** Confirm card callbacks. Receives the widget so the surface can build structured turns. */
  onStatusChange?: (widget: ChatConfirmActionWidget, status: ChatConfirmActionWidget["status"]) => void;
  onResult?: (result: ChatActionResult) => void;
}

/**
 * Renders one widget tool part as a card via ChatWidgetRenderer (below the
 * message text, in part order). Valid payload → card; malformed → nothing.
 * Never renders for non-terminal tool states (streaming chips stay native).
 * Single-render ownership: the card itself mounts the result block; this
 * component only RESOLVES the persisted result and hands it down as a prop.
 */
export const ChatWidgetPart = ({
  part,
  chatId,
  disabled,
  messages,
  onSubmitted,
  onCancelled,
  onStatusChange,
  onResult,
}: ChatWidgetPartProps) => {
  const widget = resolveWidgetPartWidget(part);
  if (!widget) return null;

  const persistedResult =
    widget.type === "confirm-action" && messages
      ? resolveActionResultForConfirmation(messages, widget.confirmationId) ?? undefined
      : undefined;

  return (
    <ChatWidgetRenderer
      widget={widget}
      chatId={chatId}
      disabled={disabled}
      onSubmitted={onSubmitted}
      onCancelled={onCancelled}
      onStatusChange={
        widget.type === "confirm-action"
          ? (status) => onStatusChange?.(widget, status)
          : undefined
      }
      onResult={onResult}
      result={persistedResult}
    />
  );
};

/**
 * Auto-continuation exclusion (SPEC §5.2): a widget tool call in the last
 * assistant step ENDS the turn — the user's structured response resumes it, so
 * `sendAutomaticallyWhen` must never fire. Mirrors the shape of the SDK's
 * `lastAssistantMessageIsCompleteWithToolCalls` predicate.
 */
export const lastAssistantStepHasWidgetTool = (messages: readonly UIMessage[]): boolean => {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") return false;
  let lastStepStartIndex = -1;
  last.parts.forEach((part, index) => {
    if (part.type === "step-start") lastStepStartIndex = index;
  });
  return last.parts.slice(lastStepStartIndex + 1).some((part) => {
    const state = String((part as { state?: unknown }).state ?? "");
    return (
      isWidgetToolPart(part as { type: string; toolName?: unknown }) &&
      (state === "output-available" || state === "output-error")
    );
  });
};

/**
 * Persist state onto every matching widget tool-part output (by widget id) so
 * reloaded history renders the right read-only card. Functional form for
 * useChat's setMessages updater.
 */
export const updateWidgetPartOutput = (
  messages: UIMessage[],
  widgetId: string,
  patch: Record<string, unknown>,
): UIMessage[] => {
  let changed = false;
  const next = messages.map((message) => {
    if (message.role !== "assistant") return message;
    const parts = message.parts.map((part) => {
      const widget = resolveWidgetPartWidget(part);
      if (!widget || widget.id !== widgetId) return part;
      changed = true;
      return { ...(part as Record<string, unknown>), output: { ...widget, ...patch } };
    });
    if (!changed) return message;
    return { ...message, parts: parts as UIMessage["parts"] };
  });
  // Nothing matched → keep the original array reference (no needless
  // setMessages re-render; "Unknown widget id → no change anywhere").
  return changed ? next : messages;
};

/**
 * Structured user turns (Task 4 `renderStructuredTurns` shapes) — appended via
 * sendMessage so the AI re-analyzes. Built exactly; malformed shapes would be
 * passed through as plain text server-side and the AI could not re-analyze.
 */

/** Form submitted → `metadata.form_response`. */
export const formResponseTurn = (response: ChatFormResponse) => ({
  text: "",
  metadata: {
    form_response: { widgetId: response.widgetId, values: response.values },
  },
});

/** Rejected → `metadata.confirmation` (the only decision that needs its own turn). */
export const rejectConfirmationTurn = (widget: ChatConfirmActionWidget) => ({
  text: "",
  metadata: {
    confirmation: {
      widgetId: widget.id,
      confirmationId: widget.confirmationId,
      decision: "reject" as const,
    },
  },
});

/** Executed (or failed) → `metadata.action_result`, verbatim. */
export const actionResultTurn = (result: ChatActionResult) => ({
  text: "",
  metadata: { action_result: result },
});

/**
 * Reload path (SPEC §7 re-show): find the most recent `action_result` snapshot
 * in the thread whose `confirmationId` matches the confirm widget. These live
 * on user turns built by `actionResultTurn` (persisted with the thread, e.g.
 * localStorage). Scanned tail-first so the newest match wins; malformed
 * payloads never render (zod-validated); `null` when nothing matches.
 */
export const resolveActionResultForConfirmation = (
  messages: readonly UIMessage[],
  confirmationId: string,
): ChatActionResult | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    const candidate = (message.metadata as { action_result?: unknown } | undefined)
      ?.action_result;
    if (candidate === undefined || candidate === null) continue;
    const parsed = chatActionResultSchema.safeParse(candidate);
    if (parsed.success && parsed.data.confirmationId === confirmationId) {
      return parsed.data;
    }
  }
  return null;
};

export interface WidgetTurnHandlers {
  onSubmitted: (response: ChatFormResponse) => void;
  onCancelled: (widgetId: string) => void;
  onStatusChange: (widget: ChatConfirmActionWidget, status: ChatConfirmActionWidget["status"]) => void;
  onResult: (result: ChatActionResult) => void;
}

/**
 * The structured-turn flow (SPEC §5.3) as one reusable unit for every chat
 * surface. `setMessages`/`sendMessage` come from useChat. Plain factory (no
 * React hooks inside) so it is directly unit-testable.
 */
export const createWidgetTurnHandlers = (
  setMessages: (updater: (prev: UIMessage[]) => UIMessage[]) => void,
  sendMessage: (message: { text: string; metadata?: unknown }) => Promise<void> | void,
): WidgetTurnHandlers => ({
  // 1. Form submit: stash status + entered values on the widget output so a
  //    reloaded card renders locked with values, then append the structured
  //    `form_response` turn and trigger the next AI turn.
  onSubmitted: (response) => {
    setMessages((prev) =>
      updateWidgetPartOutput(prev, response.widgetId, {
        status: "submitted",
        values: response.values,
      }),
    );
    void sendMessage(formResponseTurn(response));
  },
  // 2. Form cancel: flip the widget status locally — no message, no server mutation.
  onCancelled: (widgetId) => {
    setMessages((prev) => updateWidgetPartOutput(prev, widgetId, { status: "cancelled" }));
  },
  // 3. Confirm card: persist every status change onto the widget output so
  //    reloads render the right read-only state. A `confirmed` status with no
  //    result yet renders as "Confirmed / executing" until onResult lands.
  onStatusChange: (widget, status) => {
    setMessages((prev) => updateWidgetPartOutput(prev, widget.id, { status }));
    // Rejection is the only decision the AI hears through its own structured
    // turn; confirm/execute outcomes arrive via the action_result turn (onResult).
    if (status === "rejected") void sendMessage(rejectConfirmationTurn(widget));
  },
  // 4. Confirm+execute success (or failure): append `metadata.action_result`
  //    verbatim and trigger the AI re-analysis turn. The 'confirm' decision is
  //    implied by the executed result — no separate confirmation turn is sent.
  onResult: (result) => {
    void sendMessage(actionResultTurn(result));
  },
});

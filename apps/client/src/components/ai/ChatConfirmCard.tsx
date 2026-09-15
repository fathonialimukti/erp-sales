import { useMutation } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle2,
  Clock,
  DatabaseBackup,
  Eye,
  Loader2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { useIntl } from "react-intl";
import type { ChatActionResult, ChatConfirmActionWidget } from "@repo/schemas/chatWidget";

import { useToast } from "@/components/useToast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChatActionResultBlock } from "./ChatActionResultBlock";
import { trpcClient } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export interface ChatConfirmCardProps {
  /** The confirm-action widget payload stored on the assistant message. */
  widget: ChatConfirmActionWidget;
  /** Owning conversation (kept for symmetry + the backup shortcut note). */
  chatId: string;
  /** External lock (e.g. while an AI turn is streaming) — freezes all card actions. */
  disabled?: boolean;
  /**
   * Fired after confirm/reject/execute lands so the caller can persist the
   * widget status back into the client-owned thread (localStorage).
   */
  onStatusChange?: (status: ChatConfirmActionWidget["status"]) => void;
  /** Fired with the execution result (also on failure) so the caller can append the action_result turn. */
  onResult?: (result: ChatActionResult) => void;
  /**
   * Reload-path result (SPEC §7 re-show): the persisted `action_result` snapshot
   * for this `confirmationId`, resolved from the thread by the wiring. Undefined
   * in-session — the freshest result (own execution, else this prop) is rendered.
   */
  result?: ChatActionResult;
}

interface ChipStyle {
  icon: typeof Clock;
  className: string;
}

/** Design-law status chips: icon + label on soft semantic plates — never color-only. */
const STATUS_CHIPS: Record<ChatConfirmActionWidget["status"], ChipStyle> = {
  pending: {
    icon: Clock,
    className: "border-primary/25 bg-primary/12 text-primary",
  },
  confirmed: {
    icon: ShieldCheck,
    className: "border-primary/25 bg-primary/12 text-primary",
  },
  executed: {
    icon: CheckCircle2,
    className: "border-success/30 bg-success/15 text-success",
  },
  failed: {
    icon: TriangleAlert,
    className: "border-destructive/30 bg-destructive/12 text-destructive",
  },
  rejected: {
    icon: Ban,
    className: "border-destructive/30 bg-destructive/12 text-destructive",
  },
};

const STATUS_MESSAGE_IDS: Record<ChatConfirmActionWidget["status"], string> = {
  pending: "ai.widget.status.pending",
  confirmed: "ai.widget.status.confirmed",
  executed: "ai.widget.status.executed",
  failed: "ai.widget.status.failed",
  rejected: "ai.widget.status.rejected",
};

const STATUS_DEFAULT_MESSAGES: Record<ChatConfirmActionWidget["status"], string> = {
  pending: "Waiting for your input",
  confirmed: "Confirmed",
  executed: "Executed",
  failed: "Failed",
  rejected: "Rejected",
};

/** Typed replay/refusal errors (SPEC §11) → expired state instead of a raw error. */
const isReplayError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const code = (error as { data?: { code?: unknown } }).data?.code;
  return code === "BAD_REQUEST" || code === "NOT_FOUND";
};

/**
 * SQL confirmation gate (SPEC §7) — the human checkpoint before any SQL runs:
 * exact SQL verbatim, mandatory backup ack for writes, one-time-use confirm.
 *
 * Presentational w.r.t. persistence: widget `status` in; mutations plus
 * `onStatusChange` / `onResult` callbacks out (the caller owns the thread).
 * Consumed statuses always render read-only, so a reload can never resurrect
 * a live Confirm button on an already-used confirmation.
 */
export const ChatConfirmCard = ({
  widget,
  chatId,
  disabled = false,
  onStatusChange,
  onResult,
  result,
}: ChatConfirmCardProps) => {
  const intl = useIntl();
  const toast = useToast();

  // Live-session status mirror — the caller persists the authoritative status;
  // this keeps the chip/actions consistent within the current session even
  // before (or without) the write-back.
  const [liveStatus, setLiveStatus] = useState<ChatConfirmActionWidget["status"]>(widget.status);
  // In-session result mirror (SPEC §7 re-show): set when our own execution
  // resolves; always fresher than the reload-path `result` prop when present.
  const [liveResult, setLiveResult] = useState<ChatActionResult | null>(null);
  const [backupAcked, setBackupAcked] = useState(false);
  const [expired, setExpired] = useState(false);

  const status = liveStatus;
  const consumed = status !== "pending";
  const isWrite = !widget.action.readOnly;

  // Single-render ownership: the CARD mounts the result block — freshest known
  // snapshot for this confirmationId (own execution, else the reload prop).
  const resultForWidget =
    (liveResult ?? result)?.confirmationId === widget.confirmationId
      ? (liveResult ?? result)
      : undefined;

  const confirmMutation = useMutation({
    mutationFn: (input: { confirmationId: string; backupAck: boolean }) =>
      trpcClient.aiChat.confirmAction.mutate(input),
  });
  const rejectMutation = useMutation({
    mutationFn: (input: { confirmationId: string }) =>
      trpcClient.aiChat.rejectAction.mutate(input),
  });
  const executeMutation = useMutation({
    mutationFn: (input: { confirmationId: string }) =>
      trpcClient.aiChat.executeConfirmedAction.mutate(input),
  });
  const backupMutation = useMutation({
    mutationFn: () =>
      trpcClient.backup.create.mutate({
        note: `Created from AI Admin chat (${chatId}) before SQL execution`,
      }),
  });

  const busy = confirmMutation.isPending || rejectMutation.isPending || executeMutation.isPending;
  const locked = disabled || busy || consumed;
  const confirmPending = confirmMutation.isPending || executeMutation.isPending;

  const handleConfirm = async (): Promise<void> => {
    setExpired(false);
    try {
      // SPEC §5 — two calls, strictly in order. The server executes exactly the
      // snapshot SQL behind the gate; an execution failure does NOT throw, it
      // arrives as a `failed` result and is handed to the caller via onResult.
      const gate = await confirmMutation.mutateAsync({
        confirmationId: widget.confirmationId,
        backupAck: isWrite,
      });
      setLiveStatus(gate.status as ChatConfirmActionWidget["status"]);
      onStatusChange?.(gate.status as ChatConfirmActionWidget["status"]);

      const actionResult = await executeMutation.mutateAsync({
        confirmationId: widget.confirmationId,
      });
      setLiveStatus(actionResult.status);
      setLiveResult(actionResult);
      onStatusChange?.(actionResult.status);
      onResult?.(actionResult);
    } catch (error) {
      if (isReplayError(error)) {
        setExpired(true);
        toast.error(
          intl.formatMessage({
            id: "ai.widget.error.expired",
            defaultMessage: "This action was already handled or expired.",
          }),
        );
        return;
      }
      toast.error(error);
    }
  };

  const handleReject = async (): Promise<void> => {
    setExpired(false);
    try {
      const gate = await rejectMutation.mutateAsync({ confirmationId: widget.confirmationId });
      setLiveStatus(gate.status as ChatConfirmActionWidget["status"]);
      onStatusChange?.(gate.status as ChatConfirmActionWidget["status"]);
    } catch (error) {
      if (isReplayError(error)) {
        setExpired(true);
        toast.error(
          intl.formatMessage({
            id: "ai.widget.error.expired",
            defaultMessage: "This action was already handled or expired.",
          }),
        );
        return;
      }
      toast.error(error);
    }
  };

  const handleBackupNow = async (): Promise<void> => {
    try {
      await backupMutation.mutateAsync();
      toast.success(
        intl.formatMessage({ id: "backup.createSuccess", defaultMessage: "Backup created" }),
      );
    } catch (error) {
      toast.error(error);
    }
  };

  const chip = STATUS_CHIPS[status];
  const ChipIcon = chip.icon;

  return (
    <div
      className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm"
      data-ai-context={JSON.stringify({
        section: "ai-chat-widget",
        widgetType: "confirm-action",
        widgetId: widget.id,
        chatId,
        status,
        readOnly: widget.action.readOnly,
        sql: widget.action.sql,
      })}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{widget.title}</p>
          {widget.description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{widget.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isWrite ? (
            <Badge variant="destructive" className="gap-1 font-semibold">
              <TriangleAlert aria-hidden className="size-3" />
              <span>{intl.formatMessage({ id: "ai.widget.confirm.writeBadge", defaultMessage: "Write" })}</span>
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 font-semibold">
              <Eye aria-hidden className="size-3" />
              <span>{intl.formatMessage({ id: "ai.widget.confirm.readOnlyBadge", defaultMessage: "Read only" })}</span>
            </Badge>
          )}
          {/* SPEC §7: one status chip — while the result block is rendered it
              carries the executed/failed chip itself; no duplicate. */}
          {!resultForWidget ? (
            <Badge
              variant="outline"
              className={cn("gap-1 font-semibold shadow-sm", chip.className)}
              data-status={status}
            >
              <ChipIcon aria-hidden className="size-3" />
              <span>
                {intl.formatMessage({
                  id: STATUS_MESSAGE_IDS[status],
                  defaultMessage: STATUS_DEFAULT_MESSAGES[status],
                })}
              </span>
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Exact SQL, verbatim — the server executes only this confirmed snapshot. */}
      <pre className="mt-2.5 overflow-x-auto rounded-lg bg-muted p-2.5 font-mono text-xs leading-relaxed text-foreground">
        <code>{widget.action.sql}</code>
      </pre>

      {expired ? (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-2 text-xs font-medium text-destructive">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          {intl.formatMessage({
            id: "ai.widget.error.expired",
            defaultMessage: "This action was already handled or expired.",
          })}
        </p>
      ) : null}

      {/* Once expired the gate is dead server-side — no more live actions. */}
      {isWrite && !consumed && !expired ? (
        <>
          <p className="mt-2.5 flex items-start gap-1.5 text-xs font-medium text-destructive">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            {intl.formatMessage({
              id: "ai.widget.confirm.writeWarning",
              defaultMessage: "This will run a write SQL statement against the database.",
            })}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`ai-confirm-backup-ack-${widget.id}`}
                checked={backupAcked}
                onCheckedChange={(checked) => setBackupAcked(checked === true)}
                disabled={locked}
              />
              <Label
                htmlFor={`ai-confirm-backup-ack-${widget.id}`}
                className="cursor-pointer text-xs font-semibold text-foreground"
              >
                {intl.formatMessage({
                  id: "ai.widget.confirm.backupAck",
                  defaultMessage: "I have verified the backup",
                })}
              </Label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => void handleBackupNow()}
              disabled={locked || backupMutation.isPending}
            >
              {backupMutation.isPending ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <DatabaseBackup className="size-3" aria-hidden />
              )}
              {intl.formatMessage({
                id: "ai.widget.confirm.backupRunNow",
                defaultMessage: "Create backup now",
              })}
            </Button>
          </div>
        </>
      ) : null}

      {!consumed && !expired ? (
        <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-2.5">
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={() => void handleConfirm()}
            disabled={locked || (isWrite && !backupAcked)}
          >
            {confirmPending ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="size-3" aria-hidden />
            )}
            {intl.formatMessage({ id: "ai.widget.confirm.confirm", defaultMessage: "Confirm & run" })}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => void handleReject()}
            disabled={locked}
          >
            {rejectMutation.isPending ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              <Ban className="size-3" aria-hidden />
            )}
            {intl.formatMessage({ id: "ai.widget.confirm.reject", defaultMessage: "Reject" })}
          </Button>
        </div>
      ) : null}

      {/* SPEC §7 re-show: chip + row count + collapsible table, in-session and after reload. */}
      {resultForWidget ? (
        <div className="mt-2.5">
          <ChatActionResultBlock result={resultForWidget} />
        </div>
      ) : null}
    </div>
  );
};

import { type FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { Check, CheckCircle2, Clock, Loader2, Minus, Send } from "lucide-react";

import type {
  ChatFormResponse,
  ChatFormRequestWidget,
  ChatWidgetField,
} from "@repo/schemas/chatWidget";
import { trpcClient } from "@/lib/trpc";
import { useToast } from "@/components/useToast";
import { FormField } from "@/components/FormField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * Widget JSON as persisted in the client-side chat thread. When the caller
 * (Task 8 wiring) flips the status to `submitted` it stashes the entered
 * values on the widget JSON so a reloaded history card can render them
 * read-only without any server-side message store.
 */
export type ChatFormRequestWidgetPayload = ChatFormRequestWidget & {
  values?: ChatFormResponse["values"];
};

export interface ChatFormRequestCardProps {
  widget: ChatFormRequestWidgetPayload;
  /** Conversation the widget belongs to (symmetry with ChatWidgetRenderer / ChatConfirmCard). */
  chatId: string;
  /** Freeze interaction (e.g. while an AI turn is streaming) without locking the card. */
  disabled?: boolean;
  /**
   * Fired after `aiChat.submitFormResponse` succeeds. The caller owns the thread:
   * append the structured `form_response` user message, flip the widget status to
   * `submitted` (stashing `response.values` on the widget JSON), trigger the next
   * AI turn, and hand the values back via `widget.values` for the locked render.
   */
  onSubmitted?: (response: ChatFormResponse) => void;
  /** Fired when the user cancels a pending card — the caller may persist status `cancelled` in the thread. */
  onCancelled?: (widgetId: string) => void;
}

type FieldValue = string | number | boolean;

const isFilled = (field: ChatWidgetField, value: FieldValue | undefined): boolean => {
  if (field.type === "checkbox") return value === true;
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim() !== ""
    : false;
};

/** Locked read-only cell for one field. */
const LockedValue = ({ field, value }: { field: ChatWidgetField; value: FieldValue | undefined }) => {
  if (field.type === "checkbox") {
    return value === true ? (
      <Check className="size-3.5 shrink-0 text-success" aria-hidden />
    ) : (
      <Minus className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
    );
  }
  if (value === undefined || (typeof value === "string" && value.trim() === "")) {
    return <span className="text-muted-foreground">—</span>;
  }
  return <>{String(value)}</>;
};

/**
 * Inline generative-UI form card (SPEC §7). Stateless w.r.t. persistence:
 * widget status + stashed values come in through props, the submit mutation and
 * `onSubmitted`/`onCancelled` callbacks go out; the caller owns the thread state.
 */
export const ChatFormRequestCard = ({
  widget,
  chatId,
  disabled,
  onSubmitted,
  onCancelled,
}: ChatFormRequestCardProps) => {
  const intl = useIntl();
  const toast = useToast();
  const [values, setValues] = useState<ChatFormResponse["values"]>(() => widget.values ?? {});
  const [cancelled, setCancelled] = useState(false);

  const locked = widget.status !== "pending" || cancelled;
  const submitted = widget.status === "submitted";
  const lockedValues = widget.values ?? values;

  const submitMutation = useMutation({
    mutationFn: (input: ChatFormResponse) => trpcClient.aiChat.submitFormResponse.mutate(input),
    onSuccess: (response) => {
      onSubmitted?.(response);
    },
    onError: (error) => {
      // Replay / unknown widget: server answers with typed NOT_FOUND / BAD_REQUEST.
      const code = (error as { data?: { code?: string } }).data?.code;
      if (code === "BAD_REQUEST" || code === "NOT_FOUND") {
        toast.error(
          intl.formatMessage({
            id: "ai.widget.error.expired",
            defaultMessage: "This action was already handled or expired.",
          }),
        );
      } else {
        toast.error(error);
      }
    },
  });

  const setField = (key: string, value: FieldValue) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const allRequiredFilled = widget.fields.every(
    (f) => !f.required || isFilled(f, values[f.key]),
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (locked || disabled || submitMutation.isPending || !allRequiredFilled) return;
    // Prune empty strings so the structured turn carries only real answers.
    const payload = Object.fromEntries(
      Object.entries(values).filter(([, v]) => !(typeof v === "string" && v.trim() === "")),
    );
    submitMutation.mutate({ widgetId: widget.id, values: payload });
  };

  const handleCancel = () => {
    setCancelled(true);
    onCancelled?.(widget.id);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm"
      data-ai-context={JSON.stringify({
        section: "ai-chat-widget",
        widgetType: "form-request",
        widgetId: widget.id,
        chatId,
        status: widget.status,
      })}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{widget.title}</p>
          {widget.description ? (
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
              {widget.description}
            </p>
          ) : null}
        </div>
        {submitted ? (
          <Badge
            variant="outline"
            className="shrink-0 gap-1 border-success/30 bg-success/15 font-semibold text-success shadow-sm"
          >
            <CheckCircle2 aria-hidden className="size-3" />
            {intl.formatMessage({ id: "ai.widget.form.submitted", defaultMessage: "Submitted" })}
          </Badge>
        ) : !locked ? (
          <Badge
            variant="outline"
            className="shrink-0 gap-1 border-primary/25 bg-primary/12 font-semibold text-primary"
          >
            <Clock aria-hidden className="size-3" />
            {intl.formatMessage({
              id: "ai.widget.status.pending",
              defaultMessage: "Waiting for your input",
            })}
          </Badge>
        ) : null}
      </div>

      {locked ? (
        <div className="mt-2.5">
          {widget.fields.map((f) => (
            <div
              key={f.key}
              className="flex items-start justify-between gap-3 border-b border-border/60 py-1.5 last:border-b-0"
            >
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                {f.label}
              </span>
              <span className="text-right text-sm font-medium break-words text-foreground">
                <LockedValue field={f} value={lockedValues[f.key]} />
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2.5 grid gap-2.5">
          {widget.fields.map((f) => {
            const id = `widget-${widget.id}-${f.key}`;
            const raw = values[f.key];
            const shown = raw === undefined ? "" : String(raw);

            if (f.type === "checkbox") {
              return (
                <div key={f.key} className="flex items-center gap-2 py-0.5">
                  <Checkbox
                    id={id}
                    checked={raw === true}
                    onCheckedChange={(checked) => setField(f.key, checked === true)}
                    disabled={disabled}
                    required={f.required}
                  />
                  <Label htmlFor={id} className="cursor-pointer text-xs font-semibold">
                    {f.label}
                    {f.required ? <span aria-hidden="true" className="text-destructive"> *</span> : null}
                  </Label>
                </div>
              );
            }

            if (f.type === "textarea") {
              return (
                <FormField key={f.key} id={id} label={f.label} isRequired={f.required}>
                  <Textarea
                    id={id}
                    value={shown}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    disabled={disabled}
                    required={f.required}
                  />
                </FormField>
              );
            }

            if (f.type === "select") {
              return (
                <FormField key={f.key} id={id} label={f.label} isRequired={f.required}>
                  <Select
                    value={shown}
                    onValueChange={(value) => setField(f.key, value)}
                    disabled={disabled}
                    required={f.required}
                  >
                    <SelectTrigger id={id} className="w-full">
                      <SelectValue placeholder={f.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              );
            }

            return (
              <FormField key={f.key} id={id} label={f.label} isRequired={f.required}>
                <Input
                  id={id}
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  value={shown}
                  onChange={(e) =>
                    setField(
                      f.key,
                      f.type === "number"
                        ? e.target.value === ""
                          ? ""
                          : Number(e.target.value)
                        : e.target.value,
                    )
                  }
                  placeholder={f.placeholder}
                  disabled={disabled}
                  required={f.required}
                />
              </FormField>
            );
          })}
        </div>
      )}

      {!locked ? (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/60 pt-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleCancel}
            disabled={submitMutation.isPending}
          >
            {intl.formatMessage({ id: "ai.widget.form.cancel", defaultMessage: "Cancel" })}
          </Button>
          <Button
            type="submit"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            disabled={disabled || !allRequiredFilled || submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              <Send aria-hidden className="size-3" />
            )}
            {submitMutation.isPending
              ? intl.formatMessage({ id: "ai.widget.form.submitting", defaultMessage: "Submitting…" })
              : intl.formatMessage({ id: "ai.widget.form.submit", defaultMessage: "Submit" })}
          </Button>
        </div>
      ) : null}
    </form>
  );
};

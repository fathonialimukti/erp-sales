"use client";

import { useState } from "react";
import { useIntl } from "react-intl";
import { useSetAtom } from "jotai";
import { AlertTriangle, Loader2, Sparkles, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { API_BASE_URL } from "@/lib/api-base";
import { aiFormFillAtom } from "../lib/atoms";

interface AiFillButtonProps {
  /** Form section identifier sent to the AI (e.g. "region-form"). */
  section: string;
  /** Selectable options for the AI (e.g. { outletList: [...], skuList: [...] }). */
  options?: Record<string, unknown[]>;
  /** Current form values / extra context to help the AI. */
  context?: Record<string, unknown>;
}

/**
 * In-page AI form fill. A trigger button reveals a hidden text box where the
 * user types an instruction (e.g. "create a region for Jakarta"). Clicking
 * "AI Suggest" calls POST /api/ai/form-fill and applies the returned fields
 * to the form via the shared aiFormFillAtom (consumed by useAiFillForm).
 */
export function AiFillButton({ section, options, context }: AiFillButtonProps) {
  const intl = useIntl();
  const setFillData = useSetAtom(aiFormFillAtom);
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/form-fill`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          instruction: instruction.trim() || undefined,
          contextJson: JSON.stringify(context ?? {}),
          options: options ?? {},
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `AI fill failed (${res.status})`);
      }
      const data = (await res.json()) as { fields?: Record<string, unknown> };
      const fieldsData = data.fields ?? {};
      if (Object.keys(fieldsData).length === 0) {
        setError(
          intl.formatMessage({
            id: "ai.fill.empty",
            defaultMessage: "AI returned no fields to fill.",
          }),
        );
        return;
      }
      // Publish to the shared atom — useAiFillForm on the page applies it.
      setFillData(fieldsData);
      setOpen(false);
      setInstruction("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI fill failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="flex size-5 items-center justify-center rounded-md bg-module-ai/12 text-module-ai">
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          {intl.formatMessage({
            id: "ai.fill.assistant",
            defaultMessage: "AI Assistant",
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          className="gap-1.5"
        >
          {open ? <X className="size-3.5" aria-hidden /> : <Wand2 className="size-3.5" aria-hidden />}
          {intl.formatMessage({ id: "ai.fill", defaultMessage: "AI Fill" })}
        </Button>
      </div>

      {open && (
        <div className="w-full rounded-xl border border-module-ai/30 bg-module-ai/4 p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Sparkles className="size-3.5 text-module-ai" aria-hidden />
            {intl.formatMessage({
              id: "ai.fill.suggest_label",
              defaultMessage: "Describe what to fill",
            })}
          </div>
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
            placeholder={intl.formatMessage({
              id: "ai.fill.placeholder",
              defaultMessage: "Describe what to fill, e.g. create a region for Jakarta…",
            })}
            className="min-h-20 resize-y bg-background text-sm"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {intl.formatMessage({
              id: "ai.fill.hint",
              defaultMessage: "Tip: mention field names or values for better results.",
            })}
          </p>
          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertTriangle className="size-3.5" aria-hidden />
              {error}
            </p>
          )}
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setInstruction("");
                setError(null);
              }}
            >
              {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSuggest}
              disabled={loading}
              className="gap-1.5"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-3.5" aria-hidden />
              )}
              {intl.formatMessage({ id: "ai.fill.suggest", defaultMessage: "AI Suggest" })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
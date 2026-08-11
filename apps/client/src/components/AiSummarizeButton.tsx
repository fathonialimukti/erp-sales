"use client";

import { useState } from "react";
import { useIntl } from "react-intl";
import { Loader2, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api-base";

interface AiSummarizeButtonProps {
  /** One of: sales-order | customer | visit-log | action-program | event-proposal. */
  module: string;
  /** Record id. */
  id: string;
  /** Extra context to help the AI (e.g. current field values). */
  context?: Record<string, unknown>;
}

/**
 * In-page AI record summarizer. A trigger button reveals a hidden panel where
 * the user clicks "Generate" to get a 3-5 line executive brief for the record.
 * Follows the same button → hidden box → inline result pattern as AiFillButton.
 */
export function AiSummarizeButton({ module, id, context }: AiSummarizeButtonProps) {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setSummary("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/summarize-record`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module,
          id,
          contextJson: JSON.stringify(context ?? {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Summarize failed (${res.status})`);
      }
      const data = (await res.json()) as { summary?: string };
      setSummary(data.summary ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Summarize failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen((v) => !v);
          if (open) {
            setSummary("");
            setError(null);
          }
        }}
        className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
      >
        {open ? <X className="size-3.5" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
        {intl.formatMessage({ id: "ai.summarize.button", defaultMessage: "Summarize" })}
      </Button>

      {open && (
        <div className="w-full max-w-lg rounded-xl border border-border bg-muted/60 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {intl.formatMessage({
                id: "ai.summarize.label",
                defaultMessage: "Executive brief",
              })}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={handleGenerate}
              disabled={loading}
              className="gap-1.5"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-3.5" aria-hidden />
              )}
              {intl.formatMessage({ id: "ai.summarize.generate", defaultMessage: "Generate" })}
            </Button>
          </div>
          {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
          {summary ? (
            <div className="rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
            </div>
          ) : loading ? (
            <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
              {intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}
            </div>
          ) : (
            <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "ai.summarize.hint",
                defaultMessage: "Generate a quick executive brief for this record.",
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
"use client";

import { useState } from "react";
import { useIntl } from "react-intl";
import { Loader2, Sparkles, Wrench, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api-base";

interface AiRejectionFixButtonProps {
  /** Sales order id. */
  salesOrderId: string;
}

/**
 * In-page "AI Fix suggestions" for a rejected sales order. A trigger button
 * reveals a hidden panel; clicking "Generate fixes" calls POST /api/ai/rejection-fix
 * and renders a Markdown checklist of concrete actions to fix and resubmit.
 */
export function AiRejectionFixButton({ salesOrderId }: AiRejectionFixButtonProps) {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fixes, setFixes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setFixes("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/rejection-fix`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesOrderId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Fix suggestions failed (${res.status})`);
      }
      const data = (await res.json()) as { fixes?: string };
      setFixes(data.fixes ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fix suggestions failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen((v) => !v);
          if (open) {
            setFixes("");
            setError(null);
          }
        }}
        className="h-8 gap-1.5 px-2.5"
      >
        {open ? <X className="size-3.5" aria-hidden /> : <Wrench className="size-3.5" aria-hidden />}
        {intl.formatMessage({
          id: "ai.rejection_fix.button",
          defaultMessage: "AI Fix suggestions",
        })}
      </Button>

      {open && (
        <div className="w-full max-w-lg rounded-xl border border-border bg-muted/60 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              {intl.formatMessage({
                id: "ai.rejection_fix.label",
                defaultMessage: "How to fix this order",
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
              {intl.formatMessage({
                id: "ai.rejection_fix.generate",
                defaultMessage: "Generate fixes",
              })}
            </Button>
          </div>
          {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
          {fixes ? (
            <div className="rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{fixes}</ReactMarkdown>
            </div>
          ) : loading ? (
            <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
              {intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}
            </div>
          ) : (
            <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "ai.rejection_fix.hint",
                defaultMessage: "Get a concrete checklist to fix this rejected order.",
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
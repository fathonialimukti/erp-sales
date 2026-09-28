"use client";

import { useState } from "react";
import { useIntl } from "react-intl";
import { Loader2, MessageSquareText, Sparkles, X } from "lucide-react";
import { AiMarkdown } from "@/components/ai/AiMarkdown";
import { AiPanel, AiPanelTitle } from "@/components/ai/AiPanel";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api-base";
import { getFriendlyErrorMessage } from "@/lib/friendlyError";

interface AiReportNarrateProps {
  /** Report type: sales | field | collection | promo. */
  reportType: string;
  /** Report filter values (for context). */
  filters?: unknown;
  /** The report summary object (KPIs + deltas). */
  summary: unknown;
}

/**
 * In-page AI report narrator. A trigger button reveals a hidden panel; clicking
 * "Explain" calls POST /api/ai/report-narrate and renders a Markdown narrative
 * (what's up / what's down / what to watch) using the actual report numbers.
 */
export function AiReportNarrate({ reportType, filters, summary }: AiReportNarrateProps) {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [narrative, setNarrative] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleExplain = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setNarrative("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/report-narrate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          filters: filters ?? {},
          summaryJson: JSON.stringify(summary ?? {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        // The friendly-error mapper owns every user-facing AI failure; a raw
        // status code must never reach the screen.
        setError(getFriendlyErrorMessage(body?.message ?? body?.error));
        return;
      }
      const data = (await res.json()) as { narrative?: string };
      setNarrative(data.narrative ?? "");
    } catch (e) {
      setError(getFriendlyErrorMessage(e));
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
            setNarrative("");
            setError(null);
          }
        }}
        className="h-8 gap-1.5 px-2.5"
      >
        {open ? <X className="size-3.5" aria-hidden /> : <MessageSquareText className="size-3.5" aria-hidden />}
        {intl.formatMessage({ id: "ai.report.button", defaultMessage: "Explain report" })}
      </Button>

      {open && (
        <AiPanel
          label={
            <AiPanelTitle icon={<Sparkles className="size-3.5" />}>
              {intl.formatMessage({ id: "ai.report.label", defaultMessage: "Report narrative" })}
            </AiPanelTitle>
          }
          actions={
            <Button type="button" size="sm" onClick={handleExplain} disabled={loading} className="gap-1.5">
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-3.5" aria-hidden />
              )}
              {intl.formatMessage({ id: "ai.report.explain", defaultMessage: "Explain" })}
            </Button>
          }
        >
          {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
          {narrative ? (
            <div className="rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-foreground">
              <AiMarkdown>{narrative}</AiMarkdown>
            </div>
          ) : loading ? (
            <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
              {intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}
            </div>
          ) : (
            <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "ai.report.hint",
                defaultMessage: "Get a plain-language read on this report.",
              })}
            </div>
          )}
        </AiPanel>
      )}
    </div>
  );
}
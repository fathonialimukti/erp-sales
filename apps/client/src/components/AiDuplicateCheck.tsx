"use client";

import { useState } from "react";
import { useIntl } from "react-intl";
import { AlertTriangle, CopyCheck, Loader2, Sparkles, X } from "lucide-react";
import { AiPanel, AiPanelTitle } from "@/components/ai/AiPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/lib/api-base";
import { getFriendlyErrorMessage } from "@/lib/friendlyError";

interface AiDuplicateCheckProps {
  /** Which dataset to scan: customer | outlet. */
  dataset: "customer" | "outlet";
}

interface DuplicatePair {
  a: string;
  b: string;
  reason: string;
  confidence: number;
}

/**
 * In-page AI duplicate detector for the customer/outlet lists. A trigger button
 * reveals a hidden panel; clicking "Scan" calls POST /api/ai/duplicate-check
 * and renders the flagged duplicate pairs with reason + confidence.
 */
export function AiDuplicateCheck({ dataset }: AiDuplicateCheckProps) {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setDuplicates([]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/duplicate-check`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        // The friendly-error mapper owns every user-facing AI failure; a raw
        // status code must never reach the screen.
        setError(getFriendlyErrorMessage(body?.message ?? body?.error));
        return;
      }
      const data = (await res.json()) as { duplicates?: DuplicatePair[] };
      setDuplicates(data.duplicates ?? []);
    } catch (e) {
      setError(getFriendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const confidenceLabel = (c: number) =>
    c >= 0.85
      ? intl.formatMessage({ id: "ai.duplicate.high", defaultMessage: "High" })
      : c >= 0.6
        ? intl.formatMessage({ id: "ai.duplicate.medium", defaultMessage: "Medium" })
        : intl.formatMessage({ id: "ai.duplicate.low", defaultMessage: "Low" });

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen((v) => !v);
          if (open) {
            setDuplicates([]);
            setError(null);
          }
        }}
        className="h-8 gap-1.5 px-2.5"
      >
        {open ? <X className="size-3.5" aria-hidden /> : <CopyCheck className="size-3.5" aria-hidden />}
        {intl.formatMessage({ id: "ai.duplicate.button", defaultMessage: "Check duplicates" })}
      </Button>

      {open && (
        <AiPanel
          label={
            <AiPanelTitle icon={<Sparkles className="size-3.5" />}>
              {intl.formatMessage({
                id: "ai.duplicate.label",
                defaultMessage: "Likely duplicate records",
              })}
            </AiPanelTitle>
          }
          actions={
            <Button type="button" size="sm" onClick={handleScan} disabled={loading} className="gap-1.5">
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-3.5" aria-hidden />
              )}
              {intl.formatMessage({ id: "ai.duplicate.scan", defaultMessage: "Scan" })}
            </Button>
          }
        >
          {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
          {loading ? (
            <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
              {intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}
            </div>
          ) : duplicates.length > 0 ? (
            <ul className="space-y-2">
              {duplicates.map((d, idx) => (
                <li
                  key={idx}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <AlertTriangle className="size-3 shrink-0 text-warning" aria-hidden />
                      <span className="truncate">
                        {d.a} ↔ {d.b}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{d.reason}</p>
                  </div>
                  <Badge
                    variant={d.confidence >= 0.85 ? "destructive" : "secondary"}
                    className="shrink-0 text-[10px]"
                  >
                    {confidenceLabel(d.confidence)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "ai.duplicate.hint",
                defaultMessage: "Scan for likely duplicate records.",
              })}
            </div>
          )}
        </AiPanel>
      )}
    </div>
  );
}
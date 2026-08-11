"use client";

import { useState } from "react";
import { useIntl } from "react-intl";
import { Loader2, Sparkles, UserRound, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api-base";

interface AiCustomerBriefProps {
  /** Customer id. */
  customerId: string;
  /** Customer name for display. */
  name?: string;
}

/**
 * In-page AI customer 360 brief. A trigger button reveals a hidden panel;
 * clicking "Generate" calls POST /api/ai/customer-360 and renders a scannable
 * pre-meeting brief (profile, money, activity, risks & opportunities).
 */
export function AiCustomerBrief({ customerId, name }: AiCustomerBriefProps) {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setBrief("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/customer-360`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Brief failed (${res.status})`);
      }
      const data = (await res.json()) as { brief?: string };
      setBrief(data.brief ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Brief failed");
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
            setBrief("");
            setError(null);
          }
        }}
        className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
      >
        {open ? <X className="size-3.5" aria-hidden /> : <UserRound className="size-3.5" aria-hidden />}
        {intl.formatMessage({ id: "ai.customer360.button", defaultMessage: "Customer brief" })}
      </Button>

      {open && (
        <div className="w-full max-w-xl rounded-xl border border-border bg-muted/60 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              {name
                ? intl.formatMessage(
                    { id: "ai.customer360.label", defaultMessage: "Brief for {name}" },
                    { name },
                  )
                : intl.formatMessage({
                    id: "ai.customer360.label_plain",
                    defaultMessage: "Customer brief",
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
              {intl.formatMessage({ id: "ai.customer360.generate", defaultMessage: "Generate" })}
            </Button>
          </div>
          {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
          {brief ? (
            <div className="rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{brief}</ReactMarkdown>
            </div>
          ) : loading ? (
            <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
              {intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}
            </div>
          ) : (
            <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "ai.customer360.hint",
                defaultMessage: "Get a scannable pre-meeting brief for this customer.",
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
"use client";

import { useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import { useSetAtom } from "jotai";
import { Loader2, ShoppingCart, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { API_BASE_URL } from "@/lib/api-base";
import { aiFormFillAtom } from "../lib/atoms";

interface AiVisitOrderButtonProps {
  /** Visit log id. */
  visitLogId: string;
  /** Outlet name for display. */
  outletName?: string;
}

/**
 * In-page "Create order from visit". A trigger button reveals a hidden text box
 * where the user can add an instruction (optional). Clicking "Generate order"
 * calls POST /api/ai/visit-log-order, stores the extracted draft in
 * aiFormFillAtom, and navigates to /sales-order/create?visitLogId=<id> so the
 * Sales Order form prefills via useAiFillForm.
 */
export function AiVisitOrderButton({ visitLogId, outletName }: AiVisitOrderButtonProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const setFillData = useSetAtom(aiFormFillAtom);
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/visit-log-order`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitLogId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Extraction failed (${res.status})`);
      }
      const data = (await res.json()) as {
        data?: { outletId?: string; items?: unknown[]; notes?: string };
      };
      const draft = data.data;
      if (!draft || !draft.outletId || !Array.isArray(draft.items) || draft.items.length === 0) {
        setError(
          intl.formatMessage({
            id: "ai.visit_order.empty",
            defaultMessage: "No order could be extracted from this visit log.",
          }),
        );
        return;
      }
      // Store the draft so the Sales Order form can prefill via useAiFillForm.
      setFillData({
        outletId: draft.outletId,
        items: draft.items,
        notes: draft.notes ?? "",
      });
      navigate(`/sales-order/create?visitLogId=${encodeURIComponent(visitLogId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
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
            setInstruction("");
            setError(null);
          }
        }}
        className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
      >
        {open ? <X className="size-3.5" aria-hidden /> : <ShoppingCart className="size-3.5" aria-hidden />}
        {intl.formatMessage({
          id: "ai.visit_order.button",
          defaultMessage: "Create order from visit",
        })}
      </Button>

      {open && (
        <div className="w-full max-w-md rounded-xl border border-border bg-muted/60 p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            {outletName
              ? intl.formatMessage(
                  { id: "ai.visit_order.label", defaultMessage: "Extract order from {outlet}" },
                  { outlet: outletName },
                )
              : intl.formatMessage({
                  id: "ai.visit_order.label_plain",
                  defaultMessage: "Extract order from visit",
                })}
          </div>
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={2}
            placeholder={intl.formatMessage({
              id: "ai.visit_order.placeholder",
              defaultMessage: "Optional: add notes, e.g. 'apply promo P-12'…",
            })}
            className="min-h-14 resize-y text-sm"
          />
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
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
              onClick={handleGenerate}
              disabled={loading}
              className="gap-1.5"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <ShoppingCart className="size-3.5" aria-hidden />
              )}
              {intl.formatMessage({
                id: "ai.visit_order.generate",
                defaultMessage: "Generate order",
              })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
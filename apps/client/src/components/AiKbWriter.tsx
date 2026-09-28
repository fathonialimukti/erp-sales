"use client";

import { useState } from "react";
import { useIntl } from "react-intl";
import { useSetAtom } from "jotai";
import { FileText, Loader2, Sparkles, X } from "lucide-react";
import { AiPanel, AiPanelTitle } from "@/components/ai/AiPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { API_BASE_URL } from "@/lib/api-base";
import { getFriendlyErrorMessage } from "@/lib/friendlyError";
import { aiFormFillAtom } from "../lib/atoms";

/**
 * In-page AI knowledge-base writer. A trigger button reveals a hidden panel
 * with a textarea to paste raw text (support thread / conversation / notes).
 * Clicking "Generate" calls POST /api/ai/kb-writer and sets aiFormFillAtom
 * with { title, content, source } so the KB form's useAiFillForm fills the fields.
 */
export function AiKbWriter() {
  const intl = useIntl();
  const setFillData = useSetAtom(aiFormFillAtom);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (loading) return;
    if (!text.trim()) {
      setError(
        intl.formatMessage({
          id: "ai.kb_writer.required",
          defaultMessage: "Paste some text to draft from.",
        }),
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/kb-writer`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          instruction: instruction.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        // The friendly-error mapper owns every user-facing AI failure; a raw
        // status code must never reach the screen.
        setError(getFriendlyErrorMessage(body?.message ?? body?.error));
        return;
      }
      const data = (await res.json()) as { data?: { title?: string; content?: string; source?: string } };
      const entry = data.data;
      if (!entry?.title || !entry?.content) {
        setError(
          intl.formatMessage({
            id: "ai.kb_writer.empty",
            defaultMessage: "AI could not draft a knowledge entry from this text.",
          }),
        );
        return;
      }
      // Publish to the shared atom — the KB form's useAiFillForm applies it.
      setFillData({
        title: entry.title,
        content: entry.content,
        source: entry.source ?? "",
      });
      setOpen(false);
      setText("");
      setInstruction("");
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
            setText("");
            setInstruction("");
            setError(null);
          }
        }}
        className="flex items-center gap-1.5"
      >
        {open ? <X className="size-3.5" aria-hidden /> : <FileText className="size-3.5" aria-hidden />}
        {intl.formatMessage({ id: "ai.kb_writer.button", defaultMessage: "Draft from text" })}
      </Button>

      {open && (
        <AiPanel
          label={
            <AiPanelTitle icon={<Sparkles className="size-3.5" />}>
              {intl.formatMessage({
                id: "ai.kb_writer.label",
                defaultMessage: "Draft a knowledge entry",
              })}
            </AiPanelTitle>
          }
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={intl.formatMessage({
              id: "ai.kb_writer.placeholder",
              defaultMessage: "Paste a support thread, conversation, or notes…",
            })}
            className="min-h-24 resize-y text-sm"
          />
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={2}
            placeholder={intl.formatMessage({
              id: "ai.kb_writer.instruction_placeholder",
              defaultMessage: "Optional: e.g. 'write in Indonesian', 'focus on the return policy'…",
            })}
            className="mt-2 min-h-12 resize-y text-sm"
          />
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setText("");
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
                <Sparkles className="size-3.5" aria-hidden />
              )}
              {intl.formatMessage({ id: "ai.kb_writer.generate", defaultMessage: "Generate" })}
            </Button>
          </div>
        </AiPanel>
      )}
    </div>
  );
}
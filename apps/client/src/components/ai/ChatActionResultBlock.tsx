import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2, ChevronRight, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useIntl } from "react-intl";
import type { ChatActionResult } from "@repo/schemas/chatWidget";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fadeIn, getMotionProps } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface ChatActionResultBlockProps {
  /** The action_result snapshot (SPEC §6) — persisted or returned by executeConfirmedAction. */
  result: ChatActionResult;
}

interface ResultChipStyle {
  icon: typeof CheckCircle2;
  className: string;
}

/** Design-law chips: icon + label on soft semantic plates — never color-only. */
const RESULT_CHIPS: Record<ChatActionResult["status"], ResultChipStyle> = {
  executed: {
    icon: CheckCircle2,
    className: "border-success/30 bg-success/15 text-success",
  },
  failed: {
    icon: TriangleAlert,
    className: "border-destructive/30 bg-destructive/12 text-destructive",
  },
};

const RESULT_MESSAGE_IDS: Record<ChatActionResult["status"], string> = {
  executed: "ai.widget.status.executed",
  failed: "ai.widget.status.failed",
};

const RESULT_DEFAULT_MESSAGES: Record<ChatActionResult["status"], string> = {
  executed: "Executed",
  failed: "Failed",
};

export interface ResultTable {
  columns: string[];
  rows: Record<string, unknown>[];
}

/** Union of row keys (server sanitizes rows to flat objects; scalars wrap in { value }). */
export const toResultTable = (rows: unknown[] | undefined): ResultTable | null => {
  if (!rows || rows.length === 0) return null;
  const normalized = rows.map((row) =>
    row && typeof row === "object" ? (row as Record<string, unknown>) : { value: row },
  );
  const columns: string[] = [];
  for (const row of normalized) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  return columns.length > 0 ? { columns, rows: normalized } : null;
};

/** Cell display string; NULL for absent values, JSON for objects, bounded like the server snapshot. */
export const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return "NULL";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
};

/** Reads → "rows returned" (rows present), writes → "rows affected". */
export const resultCountMessage = (
  result: Pick<ChatActionResult, "rowCount" | "rows">,
): { id: string; defaultMessage: string; values: { count: number } } | null => {
  if (typeof result.rowCount !== "number") return null;
  return Array.isArray(result.rows)
    ? {
        id: "ai.widget.result.rowsReturned",
        defaultMessage: "{count} row(s) returned",
        values: { count: result.rowCount },
      }
    : {
        id: "ai.widget.result.rowsAffected",
        defaultMessage: "{count} row(s) affected",
        values: { count: result.rowCount },
      };
};

/**
 * Renders an action_result snapshot (SPEC §7): status chip, row count,
 * collapsible result table for SELECTs, and the rolled-back warning on failure.
 * Standalone — the chat thread renders it wherever the result is surfaced.
 */
export const ChatActionResultBlock = ({ result }: ChatActionResultBlockProps) => {
  const intl = useIntl();
  const reduced = useReducedMotion();
  const [tableOpen, setTableOpen] = useState(false);

  const chip = RESULT_CHIPS[result.status];
  const ChipIcon = chip.icon;
  const count = resultCountMessage(result);
  const table = toResultTable(result.rows);

  return (
    <motion.div
      variants={fadeIn}
      {...getMotionProps(reduced)}
      className="w-full max-w-md"
      data-ai-context={JSON.stringify({
        section: "ai-chat-widget",
        widgetType: "action-result",
        confirmationId: result.confirmationId,
        status: result.status,
        rowCount: result.rowCount ?? null,
      })}
    >
      <div className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={cn("gap-1 font-semibold shadow-sm", chip.className)}
            data-status={result.status}
          >
            <ChipIcon aria-hidden className="size-3" />
            <span>
              {intl.formatMessage({
                id: RESULT_MESSAGE_IDS[result.status],
                defaultMessage: RESULT_DEFAULT_MESSAGES[result.status],
              })}
            </span>
          </Badge>
          {count ? (
            <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
              {intl.formatMessage({ id: count.id, defaultMessage: count.defaultMessage }, count.values)}
            </span>
          ) : null}
        </div>

        {result.error ? (
          <div className="mt-2.5 rounded-lg bg-destructive/10 px-2.5 py-2">
            <p className="flex items-start gap-1.5 text-xs font-medium text-destructive">
              <TriangleAlert className="mt-px size-3.5 shrink-0" />
              {intl.formatMessage({
                id: "ai.widget.result.rolledBack",
                defaultMessage: "Transaction rolled back — no changes applied.",
              })}
            </p>
            <p className="mt-1 font-mono text-[0.6875rem] break-words text-destructive">
              {result.error.message}
            </p>
          </div>
        ) : null}

        {table ? (
          <Collapsible open={tableOpen} onOpenChange={setTableOpen} className="mt-2">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs font-semibold text-primary"
              >
                <ChevronRight
                  aria-hidden
                  className={cn("size-3.5 transition-transform", tableOpen && "rotate-90")}
                />
                {intl.formatMessage({
                  id: "ai.widget.result.showTable",
                  defaultMessage: "Show result table",
                })}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1.5 max-h-64 overflow-auto rounded-lg border border-border">
                <table className="min-w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      {table.columns.map((column) => (
                        <th
                          key={column}
                          scope="col"
                          className="border-b border-border px-2 py-1.5 text-left font-semibold whitespace-nowrap text-foreground"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {table.columns.map((column) => (
                          <td
                            key={column}
                            className="max-w-64 truncate border-b border-border px-2 py-1.5 whitespace-nowrap text-foreground"
                            title={formatCellValue(row[column])}
                          >
                            {formatCellValue(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.truncated ? (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-warning-foreground">
                  <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0 text-warning" />
                  {intl.formatMessage({
                    id: "ai.widget.result.truncated",
                    defaultMessage: "Results truncated",
                  })}
                </p>
              ) : null}
            </CollapsibleContent>
          </Collapsible>
        ) : result.truncated ? (
          <p className="mt-2.5 flex items-start gap-1.5 text-xs font-medium text-warning-foreground">
            <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0 text-warning" />
            {intl.formatMessage({
              id: "ai.widget.result.truncated",
              defaultMessage: "Results truncated",
            })}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
};

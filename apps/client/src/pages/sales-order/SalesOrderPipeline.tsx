import { useMemo } from "react";
import { useIntl } from "react-intl";
import { motion, useReducedMotion } from "motion/react";

import { StatusChip } from "../../components/StatusChip";
import { fadeIn, getMotionProps } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type PipelineOrder = {
  id: string;
  documentNumber: string | null;
  date: string;
  customer: { id: string; name: string };
  outlet: { id: string; name: string } | null;
  approvalStatus: string;
  grandTotal: number | null;
};

type StageKey = "DRAFT" | "PROPOSED" | "APPROVED" | "REJECTED";

const STAGES: StageKey[] = ["DRAFT", "PROPOSED", "APPROVED", "REJECTED"];

const STAGE_ACCENT: Record<StageKey, string> = {
  DRAFT: "border-t-foreground",
  PROPOSED: "border-t-primary",
  APPROVED: "border-t-success",
  REJECTED: "border-t-destructive",
};

const STAGE_COUNT: Record<StageKey, string> = {
  DRAFT: "bg-muted text-foreground",
  PROPOSED: "bg-primary/10 text-primary",
  APPROVED: "bg-success/15 text-success",
  REJECTED: "bg-destructive/10 text-destructive",
};

/** Map non-board statuses into a board column (v1). */
const toStage = (status: string): StageKey => {
  const s = status.toUpperCase();
  if (s === "PROPOSED") return "PROPOSED";
  if (s === "APPROVED") return "APPROVED";
  if (s === "REJECTED") return "REJECTED";
  return "DRAFT";
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

interface SalesOrderPipelineProps {
  items: PipelineOrder[];
  onOpen: (id: string) => void;
}

export const SalesOrderPipeline = ({ items, onOpen }: SalesOrderPipelineProps) => {
  const intl = useIntl();
  const reduced = useReducedMotion();

  const stageLabel = (stage: StageKey) => {
    switch (stage) {
      case "DRAFT":
        return intl.formatMessage({ id: "sales_order.detail.status.draft", defaultMessage: "Draft" });
      case "PROPOSED":
        return intl.formatMessage({ id: "sales_order.detail.status.proposed", defaultMessage: "Pending Approval" });
      case "APPROVED":
        return intl.formatMessage({ id: "sales_order.detail.status.approved", defaultMessage: "Approved" });
      case "REJECTED":
        return intl.formatMessage({ id: "sales_order.detail.status.rejected", defaultMessage: "Rejected" });
    }
  };

  const columns = useMemo(() => {
    const buckets: Record<StageKey, PipelineOrder[]> = {
      DRAFT: [],
      PROPOSED: [],
      APPROVED: [],
      REJECTED: [],
    };
    for (const item of items) {
      buckets[toStage(item.approvalStatus)].push(item);
    }
    return STAGES.map((stage) => {
      const list = buckets[stage];
      const sum = list.reduce((acc, row) => acc + (row.grandTotal ?? 0), 0);
      return { stage, list, sum };
    });
  }, [items]);

  return (
    <motion.div
      className="flex gap-3 overflow-x-auto pb-2"
      role="list"
      aria-label={intl.formatMessage({
        id: "sales_order.index.view_pipeline",
        defaultMessage: "Pipeline",
      })}
      variants={fadeIn}
      {...getMotionProps(reduced)}
    >
      {columns.map(({ stage, list, sum }) => (
        <section
          key={stage}
          className={cn(
            "flex min-h-70 w-72.5 shrink-0 flex-col overflow-hidden rounded-xl border border-t-[3px] bg-card shadow-sm",
            STAGE_ACCENT[stage],
          )}
          role="listitem"
          aria-label={stageLabel(stage)}
        >
          <header className="flex flex-col gap-1 border-b bg-card px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
                {stageLabel(stage)}
              </h3>
              <span
                className={cn(
                  "inline-flex min-w-5.5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                  STAGE_COUNT[stage],
                )}
              >
                {list.length}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {intl.formatMessage(
                {
                  id: "sales_order.pipeline.summary",
                  defaultMessage: "{count} orders · {total}",
                },
                {
                  count: list.length,
                  total: formatCurrency(sum),
                },
              )}
            </span>
          </header>

          <div className="flex flex-1 flex-col gap-2 p-2">
            {list.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                {intl.formatMessage({
                  id: "sales_order.pipeline.empty_stage",
                  defaultMessage: "No items",
                })}
              </p>
            ) : (
              list.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="flex cursor-pointer flex-col gap-1 rounded-lg border bg-background px-3 py-2.5 text-left shadow-xs transition-colors duration-150 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  onClick={() => onOpen(row.id)}
                >
                  <span className="truncate font-mono text-xs font-semibold text-foreground">
                    {row.documentNumber ?? row.id.slice(0, 8)}
                  </span>
                  <span className="truncate text-xs text-foreground">
                    {row.customer.name}
                    {row.outlet ? ` · ${row.outlet.name}` : ""}
                  </span>
                  {row.grandTotal != null && row.grandTotal > 0 ? (
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(row.grandTotal)}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-foreground">—</span>
                  )}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-foreground tabular-nums">
                      {formatDate(row.date)}
                    </span>
                    <StatusChip status={stage} />
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      ))}
    </motion.div>
  );
};

import { useMemo } from "react";
import { useIntl } from "react-intl";
import { Chip } from "../../ui/Chip";
import "./SalesOrderPipeline.css";

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

const STAGE_TONE: Record<StageKey, "neutral" | "info" | "success" | "danger"> = {
  DRAFT: "neutral",
  PROPOSED: "info",
  APPROVED: "success",
  REJECTED: "danger",
};

const STAGE_CLASS: Record<StageKey, string> = {
  DRAFT: "pipe__col--draft",
  PROPOSED: "pipe__col--proposed",
  APPROVED: "pipe__col--approved",
  REJECTED: "pipe__col--rejected",
};

/** Map non-board statuses into a board column (v1). */
const toStage = (status: string): StageKey => {
  const s = status.toUpperCase();
  if (s === "PROPOSED") return "PROPOSED";
  if (s === "APPROVED") return "APPROVED";
  if (s === "REJECTED") return "REJECTED";
  // DRAFT, VALIDATING, unknown → draft column
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
    <div className="pipe" role="list" aria-label={intl.formatMessage({ id: "sales_order.index.view_pipeline", defaultMessage: "Pipeline" })}>
      {columns.map(({ stage, list, sum }) => (
        <section
          key={stage}
          className={`pipe__col ${STAGE_CLASS[stage]}`}
          role="listitem"
          aria-label={stageLabel(stage)}
        >
          <header className="pipe__header">
            <div className="pipe__header-row">
              <h3 className="pipe__stage">{stageLabel(stage)}</h3>
              <span className="pipe__count">{list.length}</span>
            </div>
            <span className="pipe__sum">
              {intl.formatMessage(
                { id: "sales_order.pipeline.summary", defaultMessage: "{count} orders · {total}" },
                {
                  count: list.length,
                  total: formatCurrency(sum),
                },
              )}
            </span>
          </header>

          <div className="pipe__body">
            {list.length === 0 ? (
              <p className="pipe__empty">
                {intl.formatMessage({ id: "sales_order.pipeline.empty_stage", defaultMessage: "No items" })}
              </p>
            ) : (
              list.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="pipe__card"
                  onClick={() => onOpen(row.id)}
                >
                  <span className="pipe__card-title">
                    {row.documentNumber ?? row.id.slice(0, 8)}
                  </span>
                  <span className="pipe__card-sub">
                    {row.customer.name}
                    {row.outlet ? ` · ${row.outlet.name}` : ""}
                  </span>
                  {row.grandTotal != null && row.grandTotal > 0 ? (
                    <span className="pipe__card-amount">{formatCurrency(row.grandTotal)}</span>
                  ) : (
                    <span className="pipe__card-amount pipe__card-amount--muted">—</span>
                  )}
                  <div className="pipe__card-meta">
                    <span className="pipe__card-date">{formatDate(row.date)}</span>
                    <Chip tone={STAGE_TONE[stage]} size="sm">
                      {stageLabel(stage)}
                    </Chip>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
};

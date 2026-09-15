import { useMemo } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import { useQuery } from "@tanstack/react-query";

import { trpcClient } from "../../lib/trpc";
import type { ReportTableColumn } from "./ReportTable";
import "../../styles/report-print.css";

interface ReportPrintSheetProps {
  /** Translated report name (e.g. the tab label). */
  title: string;
  /** Report filter bounds (ISO date strings); the period line shows when present. */
  dateFrom?: string;
  dateTo?: string;
  /** On-screen column definitions, reused verbatim for the printed table. */
  columns: ReportTableColumn[];
  rows: Record<string, unknown>[];
  /** Translated empty-state message. */
  emptyMessage: string;
}

const alignClass = {
  left: "report-print-left",
  right: "report-print-right",
  center: "report-print-center",
} as const;

/**
 * Purpose-built print output for the report tabs (title block + company
 * letterhead + report table). Portaled to `document.body` so the print CSS can
 * drop the app shell (`#root`) entirely; invisible on screen. Consume via
 * `printReport()` from `components/reports/useReportExport.ts`, which toggles
 * the `printing-report` body class this sheet's stylesheet keys off.
 */
export const ReportPrintSheet = ({
  title,
  dateFrom,
  dateTo,
  columns,
  rows,
  emptyMessage,
}: ReportPrintSheetProps) => {
  const intl = useIntl();
  const generatedAt = useMemo(() => new Date(), []);

  const { data: identity } = useQuery({
    queryKey: ["settings.companyIdentity"],
    queryFn: () => trpcClient.settings.companyIdentity.query(),
    staleTime: 300_000,
  });

  const subtitleParts: string[] = [];
  if (dateFrom || dateTo) {
    subtitleParts.push(
      intl.formatMessage(
        { id: "reports.print.period", defaultMessage: "Period: {from} – {to}" },
        { from: dateFrom ?? "–", to: dateTo ?? "–" },
      ),
    );
  }
  subtitleParts.push(
    intl.formatMessage(
      { id: "reports.print.generated_at", defaultMessage: "Generated {datetime}" },
      {
        datetime: `${intl.formatDate(generatedAt, { dateStyle: "medium" })}, ${intl.formatTime(generatedAt)}`,
      },
    ),
  );

  return createPortal(
    <div className="report-print-sheet print-area">
      {identity ? (
        <header className="report-print-letterhead">
          <p className="report-print-company-name">{identity.name}</p>
          {identity.addressLines.length ? (
            <p className="report-print-company-meta">
              {identity.addressLines.map((line, i) => (
                <span key={i} className="report-print-address-line">
                  {line}
                </span>
              ))}
            </p>
          ) : null}
          {identity.phone || identity.taxId ? (
            <p className="report-print-company-meta">
              {identity.phone ? (
                <span>
                  {intl.formatMessage({
                    id: "reports.print.phone",
                    defaultMessage: "Phone",
                  })}
                  : {identity.phone}
                </span>
              ) : null}
              {identity.phone && identity.taxId ? <span> · </span> : null}
              {identity.taxId ? (
                <span>
                  {intl.formatMessage({
                    id: "reports.print.tax_id",
                    defaultMessage: "Tax ID",
                  })}
                  : {identity.taxId}
                </span>
              ) : null}
            </p>
          ) : null}
        </header>
      ) : null}

      <h1 className="report-print-title">{title}</h1>
      <p className="report-print-subtitle">{subtitleParts.join(" · ")}</p>

      {rows.length === 0 ? (
        <p className="report-print-empty">{emptyMessage}</p>
      ) : (
        <table className="report-print-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={alignClass[c.align ?? "left"]}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => {
                  const value: ReactNode = c.render
                    ? c.render(row)
                    : ((row[c.key] as ReactNode) ?? "");
                  return (
                    <td key={c.key} className={alignClass[c.align ?? "left"]}>
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>,
    document.body,
  );
};

import { useRef } from "react";
import { useIntl } from "react-intl";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ReportKpiCard } from "../../../components/reports/ReportKpiCard";
import {
  ReportTable,
  type ReportTableColumn,
} from "../../../components/reports/ReportTable";
import {
  exportExcel,
  printReport,
  type ExportColumn,
} from "../../../components/reports/useReportExport";
import { AiReportNarrate } from "../../../components/AiReportNarrate";
import type { ReportFilterValue } from "../../../components/reports/ReportFilters";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpcClient } from "../../../lib/trpc";
import { formatCurrency } from "@/lib/format";
import { useGeneralSettings } from "@/hooks/useGeneralSettings";

const chartColors = {
  primary: "var(--chart-4)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  tooltipBg: "var(--chart-tooltip-bg)",
  border: "var(--border)",
} as const;

const chartTooltipStyle = {
  background: chartColors.tooltipBg,
  border: `1px solid ${chartColors.border}`,
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  color: "var(--foreground)",
} as const;

interface CollectionReportProps {
  filters: ReportFilterValue;
}

export const CollectionReport = ({ filters }: CollectionReportProps) => {
  const intl = useIntl();
  const { currencyCode } = useGeneralSettings();
  const printRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ["reporting.collection", filters],
    queryFn: () => trpcClient.reporting.collection.query(filters),
    staleTime: 30_000,
  });

  const data = query.data;
  const aging = data?.aging ?? [];
  const byCustomer = data?.byCustomer ?? [];

  const tableColumns: ReportTableColumn[] = [
    {
      key: "name",
      header: intl.formatMessage({
        id: "report.table.customer",
        defaultMessage: "Customer",
      }),
    },
    {
      key: "outstanding",
      header: intl.formatMessage({
        id: "report.table.outstanding_col",
        defaultMessage: "Outstanding",
      }),
      align: "right",
      render: (r) => formatCurrency(Number(r.outstanding), currencyCode),
    },
    {
      key: "collected",
      header: intl.formatMessage({
        id: "report.table.collected_col",
        defaultMessage: "Collected",
      }),
      align: "right",
      render: (r) => formatCurrency(Number(r.collected), currencyCode),
    },
  ];

  const exportColumns: ExportColumn[] = [
    {
      key: "name",
      header: intl.formatMessage({
        id: "report.table.customer",
        defaultMessage: "Customer",
      }),
    },
    { key: "outstanding", header: "Outstanding", format: (v) => Number(v) },
    { key: "collected", header: "Collected", format: (v) => Number(v) },
  ];

  const onExport = () =>
    exportExcel(
      byCustomer as Record<string, unknown>[],
      exportColumns,
      "collections.xlsx",
    );
  const onPrint = () => printReport(printRef as React.RefObject<HTMLElement>);

  return (
    <div className="flex flex-col gap-5 print-area" ref={printRef}>
      <div className="no-print flex justify-end gap-2">
        <AiReportNarrate
          reportType="collection"
          filters={filters}
          summary={{
            outstandingTotal: data?.outstandingTotal,
            collectedTotal: data?.collectedTotal,
            collectionRatePercent: data?.collectionRatePercent,
            totalBilled: data?.totalBilled,
            aging,
            byCustomer,
          }}
        />
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-2.5" onClick={onExport}>
          <Download className="size-3.5" aria-hidden />
          {intl.formatMessage({
            id: "report.export.excel",
            defaultMessage: "Export Excel",
          })}
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-2.5" onClick={onPrint}>
          <Printer className="size-3.5" aria-hidden />
          {intl.formatMessage({
            id: "report.export.print",
            defaultMessage: "Print / PDF",
          })}
        </Button>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.kpi.outstanding",
                defaultMessage: "Outstanding AR",
              })}
              value={formatCurrency(data?.outstandingTotal ?? 0, currencyCode)}
            />
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.kpi.collected",
                defaultMessage: "Collected",
              })}
              value={formatCurrency(data?.collectedTotal ?? 0, currencyCode)}
            />
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.kpi.collection_rate",
                defaultMessage: "Collection rate",
              })}
              value={`${data?.collectionRatePercent ?? 0}%`}
            />
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.kpi.revenue",
                defaultMessage: "Revenue (approved)",
              })}
              value={formatCurrency(data?.totalBilled ?? 0, currencyCode)}
            />
          </div>

          <Card className="break-inside-avoid shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                {intl.formatMessage({
                  id: "report.chart.aging",
                  defaultMessage: "AR aging",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={aging}
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartColors.grid}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    stroke={chartColors.grid}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatCurrency(v, currencyCode)}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    width={80}
                    stroke={chartColors.grid}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v) => formatCurrency(Number(v), currencyCode)}
                  />
                  <Bar
                    dataKey="amount"
                    fill={chartColors.primary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                {intl.formatMessage({
                  id: "report.table.customer",
                  defaultMessage: "Customer",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable
                columns={tableColumns}
                rows={byCustomer as Record<string, unknown>[]}
                emptyMessage={intl.formatMessage({
                  id: "report.empty",
                  defaultMessage: "No data for the selected filters.",
                })}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

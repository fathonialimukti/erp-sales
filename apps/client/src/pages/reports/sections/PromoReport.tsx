import { useMemo, useRef } from "react";
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
const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID").format(value);

const chartColors = {
  primary: "var(--chart-1)",
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

interface PromoReportProps {
  filters: ReportFilterValue;
}

export const PromoReport = ({ filters }: PromoReportProps) => {
  const intl = useIntl();
  const { currencyCode } = useGeneralSettings();
  const printRef = useRef<HTMLDivElement>(null);

  const roiQuery = useQuery({
    queryKey: ["reporting.promoRoi", filters],
    queryFn: () => trpcClient.reporting.promoRoi.query(filters),
    staleTime: 30_000,
  });
  const funnelQuery = useQuery({
    queryKey: ["reporting.pipelineFunnel", filters],
    queryFn: () => trpcClient.reporting.pipelineFunnel.query(filters),
    staleTime: 30_000,
  });

  const items = roiQuery.data?.items ?? [];
  const funnel = funnelQuery.data;

  const tableColumns: ReportTableColumn[] = [
    {
      key: "name",
      header: intl.formatMessage({
        id: "report.table.promo",
        defaultMessage: "Promotion",
      }),
    },
    {
      key: "type",
      header: intl.formatMessage({
        id: "report.table.type",
        defaultMessage: "Type",
      }),
    },
    {
      key: "budget",
      header: intl.formatMessage({
        id: "report.table.budget",
        defaultMessage: "Budget",
      }),
      align: "right",
      render: (r) => formatCurrency(Number(r.budget), currencyCode),
    },
    {
      key: "cost",
      header: intl.formatMessage({
        id: "report.table.cost",
        defaultMessage: "Cost",
      }),
      align: "right",
      render: (r) => formatCurrency(Number(r.cost), currencyCode),
    },
    {
      key: "revenue",
      header: intl.formatMessage({
        id: "report.table.revenue_col",
        defaultMessage: "Revenue",
      }),
      align: "right",
      render: (r) => formatCurrency(Number(r.revenue), currencyCode),
    },
    {
      key: "roi",
      header: intl.formatMessage({
        id: "report.table.roi",
        defaultMessage: "ROI %",
      }),
      align: "right",
      render: (r) =>
        r.roi === null ? "—" : `${Number(r.roi).toFixed(1)}%`,
    },
  ];

  const exportColumns: ExportColumn[] = [
    {
      key: "name",
      header: intl.formatMessage({
        id: "report.table.promo",
        defaultMessage: "Promotion",
      }),
    },
    { key: "type", header: "Type" },
    { key: "budget", header: "Budget", format: (v) => Number(v) },
    { key: "cost", header: "Cost", format: (v) => Number(v) },
    { key: "revenue", header: "Revenue", format: (v) => Number(v) },
    {
      key: "roi",
      header: "ROI %",
      format: (v) => (v === null ? "" : Number(v)),
    },
  ];

  const onExport = () =>
    exportExcel(
      items as Record<string, unknown>[],
      exportColumns,
      "promo-roi.xlsx",
    );
  const onPrint = () => printReport(printRef as React.RefObject<HTMLElement>);

  const funnelData = useMemo(() => {
    if (!funnel) return [];
    return [
      {
        stage: intl.formatMessage({
          id: "report.funnel.visits",
          defaultMessage: "Visits",
        }),
        count: funnel.visits,
      },
      {
        stage: intl.formatMessage({
          id: "report.funnel.draft",
          defaultMessage: "Draft orders",
        }),
        count: funnel.draft,
      },
      {
        stage: intl.formatMessage({
          id: "report.funnel.proposed",
          defaultMessage: "Proposed",
        }),
        count: funnel.proposed,
      },
      {
        stage: intl.formatMessage({
          id: "report.funnel.approved",
          defaultMessage: "Approved",
        }),
        count: funnel.approved,
      },
      {
        stage: intl.formatMessage({
          id: "report.funnel.paid",
          defaultMessage: "Paid",
        }),
        count: funnel.paidOrders,
      },
    ];
  }, [funnel, intl]);

  return (
    <div className="flex flex-col gap-5 print-area" ref={printRef}>
      <div className="no-print flex justify-end gap-2">
        <AiReportNarrate
          reportType="promo"
          filters={filters}
          summary={{
            items,
            funnel,
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

      {roiQuery.isLoading || funnelQuery.isLoading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.kpi.avg_approval_days",
                defaultMessage: "Avg approval time (days)",
              })}
              value={funnel?.avgApprovalDays ?? 0}
            />
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.funnel.approved",
                defaultMessage: "Approved",
              })}
              value={formatNumber(funnel?.approved ?? 0)}
            />
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.funnel.paid",
                defaultMessage: "Paid",
              })}
              value={formatNumber(funnel?.paidOrders ?? 0)}
            />
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.funnel.visits",
                defaultMessage: "Visits",
              })}
              value={formatNumber(funnel?.visits ?? 0)}
            />
          </div>

          <Card className="break-inside-avoid shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                {intl.formatMessage({
                  id: "report.chart.funnel",
                  defaultMessage: "Pipeline funnel",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={funnelData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartColors.grid}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={formatNumber}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    stroke={chartColors.grid}
                  />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={140}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    stroke={chartColors.grid}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v) => formatNumber(Number(v))}
                  />
                  <Bar
                    dataKey="count"
                    fill={chartColors.primary}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                {intl.formatMessage({
                  id: "report.table.promo",
                  defaultMessage: "Promotion",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable
                columns={tableColumns}
                rows={items as Record<string, unknown>[]}
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

import { useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import {
  Area,
  AreaChart,
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
import type { ReportFilterValue } from "../../../components/reports/ReportFilters";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "../../../ui";
import { trpcClient } from "../../../lib/trpc";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
const formatCompact = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID").format(value);

const chartColors = {
  primary: "var(--chart-1)",
  secondary: "var(--chart-5)",
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

const DIMENSIONS = ["region", "area", "outlet", "customer", "sku"] as const;

interface SalesReportProps {
  filters: ReportFilterValue;
}

export const SalesReport = ({ filters }: SalesReportProps) => {
  const intl = useIntl();
  const printRef = useRef<HTMLDivElement>(null);
  const [dimension, setDimension] = useState<
    "region" | "area" | "outlet" | "customer" | "sku"
  >("region");

  const summaryQuery = useQuery({
    queryKey: ["reporting.salesSummary", filters],
    queryFn: () => trpcClient.reporting.salesSummary.query(filters),
    staleTime: 30_000,
  });
  const trendQuery = useQuery({
    queryKey: ["reporting.salesTrend", filters],
    queryFn: () =>
      trpcClient.reporting.salesTrend.query({ ...filters, period: "day" }),
    staleTime: 30_000,
  });
  const dimQuery = useQuery({
    queryKey: ["reporting.salesByDimension", filters, dimension],
    queryFn: () =>
      trpcClient.reporting.salesByDimension.query({ ...filters, dimension }),
    staleTime: 30_000,
  });

  const summary = summaryQuery.data;
  const trend = trendQuery.data ?? [];
  const dimRows = dimQuery.data ?? [];

  const tableColumns: ReportTableColumn[] = [
    {
      key: "label",
      header: intl.formatMessage({
        id: "report.table.dimension",
        defaultMessage: "Group",
      }),
    },
    {
      key: "revenue",
      header: intl.formatMessage({
        id: "report.table.revenue",
        defaultMessage: "Revenue",
      }),
      align: "right",
      render: (r) => formatCurrency(Number(r.revenue)),
    },
    {
      key: "orders",
      header: intl.formatMessage({
        id: "report.table.orders",
        defaultMessage: "Orders",
      }),
      align: "right",
      render: (r) => formatNumber(Number(r.orders)),
    },
    {
      key: "quantity",
      header: intl.formatMessage({
        id: "report.table.quantity",
        defaultMessage: "Quantity",
      }),
      align: "right",
      render: (r) => formatNumber(Number(r.quantity)),
    },
  ];

  const exportColumns: ExportColumn[] = [
    {
      key: "label",
      header: intl.formatMessage({
        id: "report.table.dimension",
        defaultMessage: "Group",
      }),
    },
    { key: "revenue", header: "Revenue", format: (v) => Number(v) },
    { key: "orders", header: "Orders", format: (v) => Number(v) },
    { key: "quantity", header: "Quantity", format: (v) => Number(v) },
  ];

  const dimensionLabel = intl.formatMessage({
    id: `report.dimension.${dimension}`,
    defaultMessage: dimension,
  });

  const onExport = () =>
    exportExcel(
      dimRows as Record<string, unknown>[],
      exportColumns,
      `sales-by-${dimension}.xlsx`,
    );
  const onPrint = () => printReport(printRef as React.RefObject<HTMLElement>);

  const loading =
    summaryQuery.isLoading || trendQuery.isLoading || dimQuery.isLoading;

  return (
    <div className="flex flex-col gap-5 print-area" ref={printRef}>
      <div className="no-print flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onExport}>
          <Download className="size-4" aria-hidden />
          {intl.formatMessage({
            id: "report.export.excel",
            defaultMessage: "Export Excel",
          })}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onPrint}>
          <Printer className="size-4" aria-hidden />
          {intl.formatMessage({
            id: "report.export.print",
            defaultMessage: "Print / PDF",
          })}
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.kpi.revenue",
                defaultMessage: "Revenue (approved)",
              })}
              value={formatCurrency(summary?.revenue ?? 0)}
              delta={summary?.deltaPercent ?? null}
            />
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.kpi.orders",
                defaultMessage: "Orders",
              })}
              value={formatNumber(summary?.orderCount ?? 0)}
            />
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.kpi.aov",
                defaultMessage: "Avg order value",
              })}
              value={formatCurrency(summary?.aov ?? 0)}
            />
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.kpi.quantity",
                defaultMessage: "Quantity",
              })}
              value={formatNumber(summary?.quantity ?? 0)}
            />
          </div>

          <Card className="break-inside-avoid shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                {intl.formatMessage({
                  id: "report.chart.revenue_trend",
                  defaultMessage: "Revenue trend",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={trend}
                  margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={chartColors.primary}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor={chartColors.primary}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartColors.grid}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    stroke={chartColors.grid}
                  />
                  <YAxis
                    tickFormatter={formatCompact}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    width={64}
                    stroke={chartColors.grid}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke={chartColors.primary}
                    fill="url(#revGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="break-inside-avoid shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="font-heading text-base">
                {intl.formatMessage(
                  {
                    id: "report.chart.by_dimension",
                    defaultMessage: "Revenue by {dimension}",
                  },
                  { dimension: dimensionLabel },
                )}
              </CardTitle>
              <div className="no-print min-w-[10rem]">
                <Select
                  ariaLabel={intl.formatMessage({
                    id: "report.filter.dimension",
                    defaultMessage: "Group by",
                  })}
                  options={DIMENSIONS.map((d) => ({
                    value: d,
                    label: intl.formatMessage({
                      id: `report.dimension.${d}`,
                      defaultMessage: d,
                    }),
                  }))}
                  value={dimension}
                  onChange={(v) => setDimension(v as typeof dimension)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={dimRows}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartColors.grid}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={formatCompact}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    stroke={chartColors.grid}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={140}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    stroke={chartColors.grid}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={chartColors.secondary}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-0">
              <ReportTable
                columns={tableColumns}
                rows={dimRows as Record<string, unknown>[]}
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

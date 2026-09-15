import { useIntl } from "react-intl";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Printer } from "lucide-react";
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
import { printReport } from "../../../components/reports/useReportExport";
import {
  useWorkbookExport,
  type WorkbookColumn,
} from "../../../lib/export/useWorkbookExport";
import { ReportPrintSheet } from "../../../components/reports/ReportPrintSheet";
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
  primary: "var(--chart-positive)",
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

interface FieldReportProps {
  filters: ReportFilterValue;
}

export const FieldReport = ({ filters }: FieldReportProps) => {
  const intl = useIntl();
  const { currencyCode } = useGeneralSettings();

  const query = useQuery({
    queryKey: ["reporting.fieldActivity", filters],
    queryFn: () => trpcClient.reporting.fieldActivity.query(filters),
    staleTime: 30_000,
  });

  const data = query.data;
  const perSalesman = data?.perSalesman ?? [];

  const tableColumns: ReportTableColumn[] = [
    {
      key: "name",
      header: intl.formatMessage({
        id: "report.filter.salesman",
        defaultMessage: "Salesman",
      }),
    },
    {
      key: "visits",
      header: intl.formatMessage({
        id: "report.table.visits",
        defaultMessage: "Visits",
      }),
      align: "right",
      render: (r) => formatNumber(Number(r.visits)),
    },
    {
      key: "orders",
      header: intl.formatMessage({
        id: "report.table.orders_col",
        defaultMessage: "Orders",
      }),
      align: "right",
      render: (r) => formatNumber(Number(r.orders)),
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
  ];

  const exportColumns: WorkbookColumn[] = [
    {
      key: "name",
      header: intl.formatMessage({
        id: "report.filter.salesman",
        defaultMessage: "Salesman",
      }),
    },
    {
      key: "visits",
      header: intl.formatMessage({
        id: "report.table.visits",
        defaultMessage: "Visits",
      }),
      format: (v) => Number(v),
    },
    {
      key: "orders",
      header: intl.formatMessage({
        id: "report.table.orders_col",
        defaultMessage: "Orders",
      }),
      format: (v) => Number(v),
    },
    {
      key: "revenue",
      header: intl.formatMessage({
        id: "report.table.revenue_col",
        defaultMessage: "Revenue",
      }),
      format: (v) => Number(v),
    },
  ];

  const { exportWorkbook, isExporting } = useWorkbookExport();

  const onExport = () =>
    exportWorkbook({
      prefix: "field-activity",
      sheetName: intl.formatMessage({
        id: "report.tab.field",
        defaultMessage: "Field",
      }),
      columns: exportColumns,
      rows: perSalesman as Record<string, unknown>[],
      summary: {
        sheetName: intl.formatMessage({
          id: "reports.print.summary",
          defaultMessage: "Summary",
        }),
        rows: [
          {
            label: intl.formatMessage({
              id: "report.kpi.visits",
              defaultMessage: "Visits",
            }),
            value: data?.totalVisits ?? 0,
          },
          {
            label: intl.formatMessage({
              id: "report.kpi.coverage",
              defaultMessage: "Outlet coverage",
            }),
            value: data?.coveragePercent ?? 0,
          },
          {
            label: intl.formatMessage({
              id: "report.kpi.conversion",
              defaultMessage: "Visit→order conversion",
            }),
            value: data?.conversionPercent ?? 0,
          },
          {
            label: intl.formatMessage({
              id: "report.kpi.orders",
              defaultMessage: "Orders",
            }),
            value: perSalesman.reduce((s, r) => s + r.orders, 0),
          },
        ],
      },
    });
  const onPrint = () => printReport();

  return (
    <div className="flex flex-col gap-5">
      <div className="no-print flex justify-end gap-2">
        <AiReportNarrate
          reportType="field"
          filters={filters}
          summary={{
            totalVisits: data?.totalVisits,
            visitsWithOrder: data?.visitsWithOrder,
            outletCount: data?.outletCount,
            visitedOutletCount: data?.visitedOutletCount,
            coveragePercent: data?.coveragePercent,
            conversionPercent: data?.conversionPercent,
            perSalesman,
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2.5"
          onClick={onExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="size-3.5" aria-hidden />
          )}
          {intl.formatMessage(
            isExporting
              ? {
                  id: "reports.export.loading",
                  defaultMessage: "Preparing export…",
                }
              : {
                  id: "report.export.excel",
                  defaultMessage: "Export Excel",
                },
          )}
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
                id: "report.kpi.visits",
                defaultMessage: "Visits",
              })}
              value={formatNumber(data?.totalVisits ?? 0)}
            />
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.kpi.coverage",
                defaultMessage: "Outlet coverage",
              })}
              value={`${data?.coveragePercent ?? 0}%`}
              sub={`${data?.visitedOutletCount ?? 0} / ${data?.outletCount ?? 0}`}
            />
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.kpi.conversion",
                defaultMessage: "Visit→order conversion",
              })}
              value={`${data?.conversionPercent ?? 0}%`}
              sub={intl.formatMessage({
                id: "report.kpi.visits",
                defaultMessage: "Visits",
              })}
            />
            <ReportKpiCard
              label={intl.formatMessage({
                id: "report.kpi.orders",
                defaultMessage: "Orders",
              })}
              value={formatNumber(
                perSalesman.reduce((s, r) => s + r.orders, 0),
              )}
            />
          </div>

          <Card className="break-inside-avoid shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                {intl.formatMessage({
                  id: "report.chart.per_salesman",
                  defaultMessage: "Performance by salesman",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={perSalesman}
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartColors.grid}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    stroke={chartColors.grid}
                  />
                  <YAxis
                    tickFormatter={formatNumber}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    width={56}
                    stroke={chartColors.grid}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v) => formatCurrency(Number(v), currencyCode)}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={chartColors.primary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-0">
              <ReportTable
                columns={tableColumns}
                rows={perSalesman as Record<string, unknown>[]}
                emptyMessage={intl.formatMessage({
                  id: "report.empty",
                  defaultMessage: "No data for the selected filters.",
                })}
              />
            </CardContent>
          </Card>
        </>
      )}

      <ReportPrintSheet
        title={intl.formatMessage({
          id: "report.tab.field",
          defaultMessage: "Field",
        })}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        columns={tableColumns}
        rows={perSalesman as Record<string, unknown>[]}
        emptyMessage={intl.formatMessage({
          id: "report.empty",
          defaultMessage: "No data for the selected filters.",
        })}
      />
    </div>
  );
};

import { useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
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
} from 'recharts';
import { trpcClient } from '../../../lib/trpc';
import { Card, CardBody, CardHeader, CardTitle, Skeleton, Select, Button } from '../../../ui';
import { icons } from '../../../assets/icons';
import { ReportKpiCard } from '../../../components/reports/ReportKpiCard';
import { ReportTable, type ReportTableColumn } from '../../../components/reports/ReportTable';
import { exportExcel, printReport, type ExportColumn } from '../../../components/reports/useReportExport';
import type { ReportFilterValue } from '../../../components/reports/ReportFilters';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
const formatCompact = (value: number) =>
  new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const formatNumber = (value: number) => new Intl.NumberFormat('id-ID').format(value);

const DIMENSIONS = ['region', 'area', 'outlet', 'customer', 'sku'] as const;

interface SalesReportProps {
  filters: ReportFilterValue;
}

export const SalesReport = ({ filters }: SalesReportProps) => {
  const intl = useIntl();
  const printRef = useRef<HTMLDivElement>(null);
  const [dimension, setDimension] = useState<'region' | 'area' | 'outlet' | 'customer' | 'sku'>('region');

  const summaryQuery = useQuery({
    queryKey: ['reporting.salesSummary', filters],
    queryFn: () => trpcClient.reporting.salesSummary.query(filters),
    staleTime: 30_000,
  });
  const trendQuery = useQuery({
    queryKey: ['reporting.salesTrend', filters],
    queryFn: () => trpcClient.reporting.salesTrend.query({ ...filters, period: 'day' }),
    staleTime: 30_000,
  });
  const dimQuery = useQuery({
    queryKey: ['reporting.salesByDimension', filters, dimension],
    queryFn: () => trpcClient.reporting.salesByDimension.query({ ...filters, dimension }),
    staleTime: 30_000,
  });

  const summary = summaryQuery.data;
  const trend = trendQuery.data ?? [];
  const dimRows = dimQuery.data ?? [];

  const tableColumns: ReportTableColumn[] = [
    { key: 'label', header: intl.formatMessage({ id: 'report.table.dimension', defaultMessage: 'Group' }) },
    { key: 'revenue', header: intl.formatMessage({ id: 'report.table.revenue', defaultMessage: 'Revenue' }), align: 'right', render: (r) => formatCurrency(Number(r.revenue)) },
    { key: 'orders', header: intl.formatMessage({ id: 'report.table.orders', defaultMessage: 'Orders' }), align: 'right', render: (r) => formatNumber(Number(r.orders)) },
    { key: 'quantity', header: intl.formatMessage({ id: 'report.table.quantity', defaultMessage: 'Quantity' }), align: 'right', render: (r) => formatNumber(Number(r.quantity)) },
  ];

  const exportColumns: ExportColumn[] = [
    { key: 'label', header: intl.formatMessage({ id: 'report.table.dimension', defaultMessage: 'Group' }) },
    { key: 'revenue', header: 'Revenue', format: (v) => Number(v) },
    { key: 'orders', header: 'Orders', format: (v) => Number(v) },
    { key: 'quantity', header: 'Quantity', format: (v) => Number(v) },
  ];

  const dimensionLabel = intl.formatMessage({ id: `report.dimension.${dimension}`, defaultMessage: dimension });

  const onExport = () => exportExcel(dimRows as Record<string, unknown>[], exportColumns, `sales-by-${dimension}.xlsx`);
  const onPrint = () => printReport(printRef as React.RefObject<HTMLElement>);

  const loading = summaryQuery.isLoading || trendQuery.isLoading || dimQuery.isLoading;

  return (
    <div className="report-section" ref={printRef}>
      <div className="report-section__actions no-print">
        <Button variant="outline" size="sm" leftIcon={<img src={icons.actionEdit} alt="" width={16} height={16} />} onClick={onExport}>
          {intl.formatMessage({ id: 'report.export.excel', defaultMessage: 'Export Excel' })}
        </Button>
        <Button variant="outline" size="sm" leftIcon={<img src={icons.actionEye} alt="" width={16} height={16} />} onClick={onPrint}>
          {intl.formatMessage({ id: 'report.export.print', defaultMessage: 'Print / PDF' })}
        </Button>
      </div>

      {loading ? (
        <Skeleton style={{ height: 320 }} />
      ) : (
        <>
          <div className="report-kpi-grid">
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.kpi.revenue', defaultMessage: 'Revenue (approved)' })}
              value={formatCurrency(summary?.revenue ?? 0)}
              delta={summary?.deltaPercent ?? null}
            />
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.kpi.orders', defaultMessage: 'Orders' })}
              value={formatNumber(summary?.orderCount ?? 0)}
            />
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.kpi.aov', defaultMessage: 'Avg order value' })}
              value={formatCurrency(summary?.aov ?? 0)}
            />
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.kpi.quantity', defaultMessage: 'Quantity' })}
              value={formatNumber(summary?.quantity ?? 0)}
            />
          </div>

          <Card variant="default" className="report-chart-card">
            <CardHeader>
              <CardTitle>{intl.formatMessage({ id: 'report.chart.revenue_trend', defaultMessage: 'Revenue trend' })}</CardTitle>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#0A84FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} width={64} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Area type="monotone" dataKey="total" stroke="#0A84FF" fill="url(#revGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card variant="default" className="report-chart-card">
            <CardHeader className="report-chart-card__header">
              <CardTitle>
                {intl.formatMessage({ id: 'report.chart.by_dimension', defaultMessage: 'Revenue by {dimension}' }, { dimension: dimensionLabel })}
              </CardTitle>
              <Select
                ariaLabel={intl.formatMessage({ id: 'report.filter.dimension', defaultMessage: 'Group by' })}
                options={DIMENSIONS.map((d) => ({
                  value: d,
                  label: intl.formatMessage({ id: `report.dimension.${d}`, defaultMessage: d }),
                }))}
                value={dimension}
                onChange={(v) => setDimension(v as typeof dimension)}
              />
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dimRows} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tickFormatter={formatCompact} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="revenue" fill="#5E5CE6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card variant="default">
            <CardBody>
              <ReportTable columns={tableColumns} rows={dimRows as Record<string, unknown>[]} emptyMessage={intl.formatMessage({ id: 'report.empty', defaultMessage: 'No data for the selected filters.' })} />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};

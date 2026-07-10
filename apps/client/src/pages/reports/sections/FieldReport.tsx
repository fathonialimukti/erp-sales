import { useRef } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { trpcClient } from '../../../lib/trpc';
import { Card, CardBody, CardHeader, CardTitle, Skeleton, Button } from '../../../ui';
import { icons } from '../../../assets/icons';
import { ReportKpiCard } from '../../../components/reports/ReportKpiCard';
import { ReportTable, type ReportTableColumn } from '../../../components/reports/ReportTable';
import { exportExcel, printReport, type ExportColumn } from '../../../components/reports/useReportExport';
import type { ReportFilterValue } from '../../../components/reports/ReportFilters';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
const formatNumber = (value: number) => new Intl.NumberFormat('id-ID').format(value);

interface FieldReportProps {
  filters: ReportFilterValue;
}

export const FieldReport = ({ filters }: FieldReportProps) => {
  const intl = useIntl();
  const printRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ['reporting.fieldActivity', filters],
    queryFn: () => trpcClient.reporting.fieldActivity.query(filters),
    staleTime: 30_000,
  });

  const data = query.data;
  const perSalesman = data?.perSalesman ?? [];

  const tableColumns: ReportTableColumn[] = [
    { key: 'name', header: intl.formatMessage({ id: 'report.filter.salesman', defaultMessage: 'Salesman' }) },
    { key: 'visits', header: intl.formatMessage({ id: 'report.table.visits', defaultMessage: 'Visits' }), align: 'right', render: (r) => formatNumber(Number(r.visits)) },
    { key: 'orders', header: intl.formatMessage({ id: 'report.table.orders_col', defaultMessage: 'Orders' }), align: 'right', render: (r) => formatNumber(Number(r.orders)) },
    { key: 'revenue', header: intl.formatMessage({ id: 'report.table.revenue_col', defaultMessage: 'Revenue' }), align: 'right', render: (r) => formatCurrency(Number(r.revenue)) },
  ];

  const exportColumns: ExportColumn[] = [
    { key: 'name', header: intl.formatMessage({ id: 'report.filter.salesman', defaultMessage: 'Salesman' }) },
    { key: 'visits', header: 'Visits', format: (v) => Number(v) },
    { key: 'orders', header: 'Orders', format: (v) => Number(v) },
    { key: 'revenue', header: 'Revenue', format: (v) => Number(v) },
  ];

  const onExport = () => exportExcel(perSalesman as Record<string, unknown>[], exportColumns, 'field-activity.xlsx');
  const onPrint = () => printReport(printRef as React.RefObject<HTMLElement>);

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

      {query.isLoading ? (
        <Skeleton style={{ height: 320 }} />
      ) : (
        <>
          <div className="report-kpi-grid">
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.kpi.visits', defaultMessage: 'Visits' })}
              value={formatNumber(data?.totalVisits ?? 0)}
            />
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.kpi.coverage', defaultMessage: 'Outlet coverage' })}
              value={`${data?.coveragePercent ?? 0}%`}
              sub={`${data?.visitedOutletCount ?? 0} / ${data?.outletCount ?? 0}`}
            />
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.kpi.conversion', defaultMessage: 'Visit→order conversion' })}
              value={`${data?.conversionPercent ?? 0}%`}
              sub={intl.formatMessage({ id: 'report.kpi.visits', defaultMessage: 'Visits' })}
            />
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.kpi.orders', defaultMessage: 'Orders' })}
              value={formatNumber(perSalesman.reduce((s, r) => s + r.orders, 0))}
            />
          </div>

          <Card variant="default" className="report-chart-card">
            <CardHeader>
              <CardTitle>{intl.formatMessage({ id: 'report.chart.per_salesman', defaultMessage: 'Performance by salesman' })}</CardTitle>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={perSalesman} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11 }} width={56} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="revenue" fill="#30D158" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card variant="default">
            <CardBody>
              <ReportTable columns={tableColumns} rows={perSalesman as Record<string, unknown>[]} emptyMessage={intl.formatMessage({ id: 'report.empty', defaultMessage: 'No data for the selected filters.' })} />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};

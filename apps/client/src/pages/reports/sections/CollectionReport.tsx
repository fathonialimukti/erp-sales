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

interface CollectionReportProps {
  filters: ReportFilterValue;
}

export const CollectionReport = ({ filters }: CollectionReportProps) => {
  const intl = useIntl();
  const printRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ['reporting.collection', filters],
    queryFn: () => trpcClient.reporting.collection.query(filters),
    staleTime: 30_000,
  });

  const data = query.data;
  const aging = data?.aging ?? [];
  const byCustomer = data?.byCustomer ?? [];

  const tableColumns: ReportTableColumn[] = [
    { key: 'name', header: intl.formatMessage({ id: 'report.table.customer', defaultMessage: 'Customer' }) },
    { key: 'outstanding', header: intl.formatMessage({ id: 'report.table.outstanding_col', defaultMessage: 'Outstanding' }), align: 'right', render: (r) => formatCurrency(Number(r.outstanding)) },
    { key: 'collected', header: intl.formatMessage({ id: 'report.table.collected_col', defaultMessage: 'Collected' }), align: 'right', render: (r) => formatCurrency(Number(r.collected)) },
  ];

  const exportColumns: ExportColumn[] = [
    { key: 'name', header: intl.formatMessage({ id: 'report.table.customer', defaultMessage: 'Customer' }) },
    { key: 'outstanding', header: 'Outstanding', format: (v) => Number(v) },
    { key: 'collected', header: 'Collected', format: (v) => Number(v) },
  ];

  const onExport = () => exportExcel(byCustomer as Record<string, unknown>[], exportColumns, 'collections.xlsx');
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
              label={intl.formatMessage({ id: 'report.kpi.outstanding', defaultMessage: 'Outstanding AR' })}
              value={formatCurrency(data?.outstandingTotal ?? 0)}
            />
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.kpi.collected', defaultMessage: 'Collected' })}
              value={formatCurrency(data?.collectedTotal ?? 0)}
            />
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.kpi.collection_rate', defaultMessage: 'Collection rate' })}
              value={`${data?.collectionRatePercent ?? 0}%`}
            />
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.kpi.revenue', defaultMessage: 'Revenue (approved)' })}
              value={formatCurrency(data?.totalBilled ?? 0)}
            />
          </div>

          <Card variant="default" className="report-chart-card">
            <CardHeader>
              <CardTitle>{intl.formatMessage({ id: 'report.chart.aging', defaultMessage: 'AR aging' })}</CardTitle>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={aging} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="amount" fill="#FF9F0A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card variant="default">
            <CardHeader>
              <CardTitle>{intl.formatMessage({ id: 'report.table.customer', defaultMessage: 'Customer' })}</CardTitle>
            </CardHeader>
            <CardBody>
              <ReportTable columns={tableColumns} rows={byCustomer as Record<string, unknown>[]} emptyMessage={intl.formatMessage({ id: 'report.empty', defaultMessage: 'No data for the selected filters.' })} />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};

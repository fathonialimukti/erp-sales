import { useMemo } from 'react';
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

interface PromoReportProps {
  filters: ReportFilterValue;
}

export const PromoReport = ({ filters }: PromoReportProps) => {
  const intl = useIntl();
  const printRef = useMemo(() => ({ current: null }), []);

  const roiQuery = useQuery({
    queryKey: ['reporting.promoRoi', filters],
    queryFn: () => trpcClient.reporting.promoRoi.query(filters),
    staleTime: 30_000,
  });
  const funnelQuery = useQuery({
    queryKey: ['reporting.pipelineFunnel', filters],
    queryFn: () => trpcClient.reporting.pipelineFunnel.query(filters),
    staleTime: 30_000,
  });

  const items = roiQuery.data?.items ?? [];
  const funnel = funnelQuery.data;

  const tableColumns: ReportTableColumn[] = [
    { key: 'name', header: intl.formatMessage({ id: 'report.table.promo', defaultMessage: 'Promotion' }) },
    { key: 'type', header: intl.formatMessage({ id: 'report.table.type', defaultMessage: 'Type' }) },
    { key: 'budget', header: intl.formatMessage({ id: 'report.table.budget', defaultMessage: 'Budget' }), align: 'right', render: (r) => formatCurrency(Number(r.budget)) },
    { key: 'cost', header: intl.formatMessage({ id: 'report.table.cost', defaultMessage: 'Cost' }), align: 'right', render: (r) => formatCurrency(Number(r.cost)) },
    { key: 'revenue', header: intl.formatMessage({ id: 'report.table.revenue_col', defaultMessage: 'Revenue' }), align: 'right', render: (r) => formatCurrency(Number(r.revenue)) },
    { key: 'roi', header: intl.formatMessage({ id: 'report.table.roi', defaultMessage: 'ROI %' }), align: 'right', render: (r) => (r.roi === null ? '—' : `${Number(r.roi).toFixed(1)}%`) },
  ];

  const exportColumns: ExportColumn[] = [
    { key: 'name', header: intl.formatMessage({ id: 'report.table.promo', defaultMessage: 'Promotion' }) },
    { key: 'type', header: 'Type' },
    { key: 'budget', header: 'Budget', format: (v) => Number(v) },
    { key: 'cost', header: 'Cost', format: (v) => Number(v) },
    { key: 'revenue', header: 'Revenue', format: (v) => Number(v) },
    { key: 'roi', header: 'ROI %', format: (v) => (v === null ? '' : Number(v)) },
  ];

  const onExport = () => exportExcel(items as Record<string, unknown>[], exportColumns, 'promo-roi.xlsx');
  const onPrint = () => printReport(printRef as unknown as React.RefObject<HTMLElement>);

  const funnelData = useMemo(() => {
    if (!funnel) return [];
    return [
      { stage: intl.formatMessage({ id: 'report.funnel.visits', defaultMessage: 'Visits' }), count: funnel.visits },
      { stage: intl.formatMessage({ id: 'report.funnel.draft', defaultMessage: 'Draft orders' }), count: funnel.draft },
      { stage: intl.formatMessage({ id: 'report.funnel.proposed', defaultMessage: 'Proposed' }), count: funnel.proposed },
      { stage: intl.formatMessage({ id: 'report.funnel.approved', defaultMessage: 'Approved' }), count: funnel.approved },
      { stage: intl.formatMessage({ id: 'report.funnel.paid', defaultMessage: 'Paid' }), count: funnel.paidOrders },
    ];
  }, [funnel, intl]);

  return (
    <div className="report-section" ref={printRef as unknown as React.Ref<HTMLDivElement>}>
      <div className="report-section__actions no-print">
        <Button variant="outline" size="sm" leftIcon={<img src={icons.actionEdit} alt="" width={16} height={16} />} onClick={onExport}>
          {intl.formatMessage({ id: 'report.export.excel', defaultMessage: 'Export Excel' })}
        </Button>
        <Button variant="outline" size="sm" leftIcon={<img src={icons.actionEye} alt="" width={16} height={16} />} onClick={onPrint}>
          {intl.formatMessage({ id: 'report.export.print', defaultMessage: 'Print / PDF' })}
        </Button>
      </div>

      {roiQuery.isLoading || funnelQuery.isLoading ? (
        <Skeleton style={{ height: 320 }} />
      ) : (
        <>
          <div className="report-kpi-grid">
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.kpi.avg_approval_days', defaultMessage: 'Avg approval time (days)' })}
              value={funnel?.avgApprovalDays ?? 0}
            />
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.funnel.approved', defaultMessage: 'Approved' })}
              value={formatNumber(funnel?.approved ?? 0)}
            />
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.funnel.paid', defaultMessage: 'Paid' })}
              value={formatNumber(funnel?.paidOrders ?? 0)}
            />
            <ReportKpiCard
              label={intl.formatMessage({ id: 'report.funnel.visits', defaultMessage: 'Visits' })}
              value={formatNumber(funnel?.visits ?? 0)}
            />
          </div>

          <Card variant="default" className="report-chart-card">
            <CardHeader>
              <CardTitle>{intl.formatMessage({ id: 'report.chart.funnel', defaultMessage: 'Pipeline funnel' })}</CardTitle>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={funnelData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tickFormatter={formatNumber} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="stage" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatNumber(Number(v))} />
                  <Bar dataKey="count" fill="#0A84FF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card variant="default">
            <CardHeader>
              <CardTitle>{intl.formatMessage({ id: 'report.table.promo', defaultMessage: 'Promotion' })}</CardTitle>
            </CardHeader>
            <CardBody>
              <ReportTable columns={tableColumns} rows={items as Record<string, unknown>[]} emptyMessage={intl.formatMessage({ id: 'report.empty', defaultMessage: 'No data for the selected filters.' })} />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};

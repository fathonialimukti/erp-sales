import type { ReactNode } from 'react';
import { Card, CardBody } from '../../ui';

interface ReportKpiCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Optional delta indicator: positive (green) or negative (red). */
  delta?: number | null;
}

export const ReportKpiCard = ({ label, value, sub, delta }: ReportKpiCardProps) => (
  <Card variant="secondary" className="report-kpi">
    <CardBody>
      <span className="report-kpi__label">{label}</span>
      <span className="report-kpi__value">{value}</span>
      {sub && <span className="report-kpi__sub">{sub}</span>}
      {delta !== undefined && delta !== null && (
        <span className={`report-kpi__delta ${delta >= 0 ? 'is-up' : 'is-down'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
        </span>
      )}
    </CardBody>
  </Card>
);

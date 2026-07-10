import type { ReactNode } from 'react';
import { Table, THead, TBody, TR, TH, TD, EmptyState } from '../../ui';

export interface ReportTableColumn {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: Record<string, unknown>) => ReactNode;
}

interface ReportTableProps {
  columns: ReportTableColumn[];
  rows: Record<string, unknown>[];
  emptyMessage?: string;
}

export const ReportTable = ({ columns, rows, emptyMessage }: ReportTableProps) => {
  if (rows.length === 0) {
    return <EmptyState title={emptyMessage ?? 'No data'} />;
  }
  return (
    <div className="report-table-wrap">
      <Table>
        <THead>
          <TR>
            {columns.map((c) => (
              <TH key={c.key} style={{ textAlign: c.align ?? 'left' }}>{c.header}</TH>
            ))}
          </TR>
        </THead>
        <TBody>
          {rows.map((row, i) => (
            <TR key={i}>
              {columns.map((c) => (
                <TD key={c.key} style={{ textAlign: c.align ?? 'left' }}>
                  {c.render ? c.render(row) : (row[c.key] as ReactNode)}
                </TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
};

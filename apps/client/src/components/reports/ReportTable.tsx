import type { ReactNode } from "react";

import { EmptyState } from "@/components/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ReportTableColumn {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render?: (row: Record<string, unknown>) => ReactNode;
}

interface ReportTableProps {
  columns: ReportTableColumn[];
  rows: Record<string, unknown>[];
  emptyMessage?: string;
}

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export const ReportTable = ({
  columns,
  rows,
  emptyMessage,
}: ReportTableProps) => {
  if (rows.length === 0) {
    return <EmptyState module="report" title={emptyMessage ?? "No data"} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((c) => (
              <TableHead
                key={c.key}
                className={cn(
                  "h-10 bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase",
                  alignClass[c.align ?? "left"],
                  (c.align ?? "left") === "right" && "tabular-nums",
                )}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  className={cn(
                    "text-sm text-foreground",
                    alignClass[c.align ?? "left"],
                    (c.align ?? "left") === "right" && "tabular-nums",
                  )}
                >
                  {c.render ? c.render(row) : (row[c.key] as ReactNode)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

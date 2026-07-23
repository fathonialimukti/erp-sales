import type { ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { AlertCircle } from "lucide-react";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type DataTableDensity = "comfortable" | "crm" | "compact";

export type DataTableProps<T> = {
  density?: DataTableDensity;
  columns: ColumnDef<T, unknown>[];
  data: T[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  empty?: ReactNode;
  /**
   * Row click navigates / selects. Action cells must call
   * `event.stopPropagation()` so buttons/menus do not trigger the row handler.
   */
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  toolbar?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** e.g. selected → `bg-primary/5 border-l-[3px] border-l-primary` */
  getRowClassName?: (row: T) => string | undefined;
};

const DENSITY_HEAD: Record<DataTableDensity, string> = {
  comfortable: "h-[52px] px-3",
  crm: "h-[44px] px-3",
  compact: "h-9 px-2 text-xs",
};

const DENSITY_CELL: Record<DataTableDensity, string> = {
  comfortable: "h-[52px] px-3 py-0",
  crm: "h-[44px] px-3 py-0",
  compact: "h-9 px-2 py-0 text-xs",
};

const SKELETON_ROWS = 6;

export function DataTable<T>({
  density = "crm",
  columns,
  data,
  isLoading = false,
  isError = false,
  errorMessage,
  empty,
  onRowClick,
  stickyHeader = true,
  toolbar,
  footer,
  className,
  getRowClassName,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const colCount = Math.max(columns.length, 1);
  const headClass = DENSITY_HEAD[density];
  const cellClass = DENSITY_CELL[density];
  const rows = table.getRowModel().rows;

  // Single scroll container so sticky thead works (avoid nested overflow from shadcn Table).
  const shellClass = cn(
    "relative w-full overflow-auto rounded-xl border bg-card shadow-sm",
    stickyHeader && "max-h-[min(70vh,52rem)]",
  );

  return (
    <div
      className={cn("flex flex-col gap-3", className)}
      data-slot="data-table"
      data-density={density}
    >
      {toolbar}

      {isError ? (
        <Card className="border-destructive/30 shadow-none">
          <CardContent className="flex items-start gap-3 px-4 py-4">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
              aria-hidden
            >
              <AlertCircle className="size-4" />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">
                {errorMessage ?? "Something went wrong loading this table."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isError && isLoading ? (
        <div className={shellClass} aria-busy="true" aria-live="polite">
          <table className="w-full caption-bottom text-sm">
            <TableHeader
              className={cn(
                stickyHeader &&
                  "sticky top-0 z-10 bg-card/95 shadow-[0_1px_0_0_var(--border)] backdrop-blur-sm",
              )}
            >
              <TableRow className="hover:bg-transparent">
                {Array.from({ length: colCount }, (_, i) => (
                  <TableHead key={i} className={headClass}>
                    <Skeleton className="h-3 w-16" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: SKELETON_ROWS }, (_, r) => (
                <TableRow key={r} className="hover:bg-transparent">
                  {Array.from({ length: colCount }, (_, c) => (
                    <TableCell key={c} className={cellClass}>
                      <Skeleton
                        className={cn("h-3.5", c === 0 ? "w-24" : "w-32")}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </table>
        </div>
      ) : null}

      {!isError && !isLoading && data.length === 0 ? empty : null}

      {!isError && !isLoading && data.length > 0 ? (
        <div className={shellClass}>
          <table className="w-full caption-bottom text-sm">
            <TableHeader
              className={cn(
                stickyHeader &&
                  "sticky top-0 z-10 bg-card/95 shadow-[0_1px_0_0_var(--border)] backdrop-blur-sm",
              )}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        headClass,
                        "bg-transparent font-medium text-muted-foreground",
                      )}
                      style={
                        header.column.getCanSort()
                          ? { cursor: "pointer", userSelect: "none" }
                          : undefined
                      }
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                      {{
                        asc: " ▲",
                        desc: " ▼",
                      }[header.column.getIsSorted() as string] ?? null}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const selectedClass = getRowClassName?.(row.original);
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      onRowClick && "cursor-pointer",
                      selectedClass,
                    )}
                    data-state={selectedClass ? "selected" : undefined}
                    onClick={
                      onRowClick
                        ? () => onRowClick(row.original)
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={cellClass}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </table>
        </div>
      ) : null}

      {footer}
    </div>
  );
}

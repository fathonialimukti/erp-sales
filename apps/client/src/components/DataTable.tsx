import { useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

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
  /**
   * Controlled sorting. When omitted, table keeps internal sort state
   * (client-side via `getSortedRowModel` unless `manualSorting`).
   */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  /**
   * Server-driven sort: header clicks update `sorting` only;
   * parent refetches. Default false = sort current page client-side.
   */
  manualSorting?: boolean;
  /** Initial sort when uncontrolled. */
  initialSorting?: SortingState;
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

const SortGlyph = ({ sorted }: { sorted: false | "asc" | "desc" }) => {
  if (sorted === "asc") {
    return <ArrowUp className="size-3.5 shrink-0 text-primary" aria-hidden />;
  }
  if (sorted === "desc") {
    return <ArrowDown className="size-3.5 shrink-0 text-primary" aria-hidden />;
  }
  return (
    <ArrowUpDown
      className="size-3.5 shrink-0 text-muted-foreground/70 opacity-0 transition-opacity group-hover/th:opacity-100 group-focus-visible/th:opacity-100"
      aria-hidden
    />
  );
};

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
  sorting: controlledSorting,
  onSortingChange,
  manualSorting = false,
  initialSorting,
}: DataTableProps<T>) {
  const [uncontrolledSorting, setUncontrolledSorting] = useState<SortingState>(
    initialSorting ?? [],
  );

  const sorting = controlledSorting ?? uncontrolledSorting;
  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    if (onSortingChange) {
      onSortingChange(updater);
      return;
    }
    setUncontrolledSorting(updater);
  };

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    manualSorting,
    enableSortingRemoval: true,
    // Opt-in per column (`enableSorting: true` + accessorKey / accessorFn)
    defaultColumn: { enableSorting: false },
  });

  const colCount = Math.max(columns.length, 1);
  const headClass = DENSITY_HEAD[density];
  const cellClass = DENSITY_CELL[density];
  const rows = table.getRowModel().rows;

  const shellClass = cn(
    "relative w-full overflow-auto rounded-xl border border-border bg-card shadow-sm",
    stickyHeader && "max-h-[min(70vh,52rem)]",
  );

  const headerShellClass = cn(
    stickyHeader &&
      "sticky top-0 z-10 bg-muted shadow-[0_1px_0_0_color-mix(in_oklab,var(--primary)_18%,var(--border))]",
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
          <table className="w-full caption-bottom text-sm font-normal text-foreground">
            <TableHeader className={headerShellClass}>
              <TableRow className="hover:bg-transparent border-b border-border">
                {Array.from({ length: colCount }, (_, i) => (
                  <TableHead key={i} className={cn(headClass, "bg-transparent")}>
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
          <table className="w-full caption-bottom text-sm font-normal text-foreground">
            <TableHeader className={headerShellClass}>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="hover:bg-transparent border-b border-border"
                >
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          headClass,
                          "group/th bg-transparent font-semibold tracking-wide text-foreground",
                          canSort &&
                            "cursor-pointer select-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary focus-visible:outline-none",
                          sorted && "bg-primary/10 text-primary",
                        )}
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : canSort
                                ? "none"
                                : undefined
                        }
                        tabIndex={canSort ? 0 : undefined}
                        onClick={
                          canSort
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                        onKeyDown={
                          canSort
                            ? (event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  header.column.toggleSorting(sorted === "asc");
                                }
                              }
                            : undefined
                        }
                      >
                        {header.isPlaceholder ? null : (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5",
                              canSort && "min-h-8",
                            )}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {canSort ? <SortGlyph sorted={sorted} /> : null}
                          </span>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const selectedClass = getRowClassName?.(row.original);
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "border-b border-border transition-colors",
                      index % 2 === 1 && "bg-primary/[0.025]",
                      "hover:bg-primary/[0.06]",
                      onRowClick && "cursor-pointer",
                      selectedClass,
                    )}
                    data-state={selectedClass ? "selected" : undefined}
                    onClick={
                      onRowClick ? () => onRowClick(row.original) : undefined
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

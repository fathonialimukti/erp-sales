import type {
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import {
  Table as ShadTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type TableDensity = "comfortable" | "crm" | "compact";

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  density?: TableDensity;
}

const DENSITY_CLASS: Record<TableDensity, string> = {
  comfortable: "[&_th]:h-11 [&_td]:py-3",
  crm: "[&_th]:h-9 [&_td]:py-2 text-[13px]",
  compact: "[&_th]:h-8 [&_td]:py-1.5 text-xs",
};

export const Table = ({ className, density = "crm", ...rest }: TableProps) => (
  <ShadTable className={cn(DENSITY_CLASS[density], className)} {...rest} />
);

export const THead = ({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) => (
  <TableHeader className={cn("sticky top-0 z-10 bg-card", className)} {...rest} />
);

interface TBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  emptyContent?: ReactNode;
}

export const TBody = ({ className, emptyContent, children, ...rest }: TBodyProps) => {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <TableBody className={className} {...rest}>
      {hasChildren ? children : emptyContent}
    </TableBody>
  );
};

export const TR = ({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) => (
  <TableRow className={className} {...rest} />
);

export const TH = ({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <TableHead className={cn("bg-muted/40 font-semibold", className)} {...rest} />
);

export const TD = ({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <TableCell className={className} {...rest} />
);

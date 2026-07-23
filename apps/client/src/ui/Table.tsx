import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import "./Table.css";

export type TableDensity = "comfortable" | "crm" | "compact";

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** Row density. Opt in per page — CRM indexes use `"crm"`, line items `"compact"`. */
  density?: TableDensity;
}

export const Table = ({ className, density, ...rest }: TableProps) => (
  <div className="tbl-wrapper">
    <table
      className={["tbl", density ? `tbl--${density}` : null, className].filter(Boolean).join(" ")}
      {...rest}
    />
  </div>
);

export const THead = ({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={`tbl__head ${className ?? ""}`} {...rest} />
);

interface TBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  /** HeroUI-style empty-state slot rendered when there are no children. */
  emptyContent?: ReactNode;
}

export const TBody = ({ className, emptyContent, children, ...rest }: TBodyProps) => {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <tbody className={`tbl__body ${className ?? ""}`} {...rest}>
      {hasChildren ? children : emptyContent}
    </tbody>
  );
};

export const TR = ({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={`tbl__body-row ${className ?? ""}`} {...rest} />
);

export const TH = ({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={`tbl__head-cell ${className ?? ""}`} {...rest} />
);

export const TD = ({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`tbl__cell ${className ?? ""}`} {...rest} />
);

import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "./cn";

export const Table = ({ className, ...rest }: HTMLAttributes<HTMLTableElement>) => (
  <div className="overflow-x-auto">
    <table
      className={cn(
        "w-full border-collapse text-left text-sm",
        "[&_th]:px-4 [&_td]:px-4",
        "[&_th]:py-3 [&_td]:py-3",
        className,
      )}
      {...rest}
    />
  </div>
);

export const THead = ({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead
    className={cn(
      "border-b border-slate-200 bg-slate-50/50 text-xs uppercase tracking-wide text-slate-500",
      "dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
      className,
    )}
    {...rest}
  />
);

export const TBody = ({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody
    className={cn(
      "divide-y divide-slate-200 dark:divide-slate-800",
      className,
    )}
    {...rest}
  />
);

export const TR = ({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn(
      "transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/30",
      className,
    )}
    {...rest}
  />
);

export const TH = ({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn("text-left font-semibold", className)}
    {...rest}
  />
);

export const TD = ({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={cn("align-middle text-slate-700 dark:text-slate-200", className)}
    {...rest}
  />
);

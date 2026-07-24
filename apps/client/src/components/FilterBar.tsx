import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { useIntl } from "react-intl";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  /** Extra filter controls (selects, date range, …). */
  filters?: ReactNode;
  /** e.g. "12 customers". */
  countLabel?: string;
  /** Right-side actions (Create, export, …). */
  actions?: ReactNode;
  /** Search input placeholder override. */
  searchPlaceholder?: string;
  className?: string;
}

export const FilterBar = ({
  search,
  onSearchChange,
  filters,
  countLabel,
  actions,
  searchPlaceholder,
  className,
}: FilterBarProps) => {
  const intl = useIntl();
  const placeholder =
    searchPlaceholder ??
    intl.formatMessage({
      id: "common.search.placeholder",
      defaultMessage: "Search…",
    });

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border/70 bg-card/50 p-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      data-slot="filter-bar"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={placeholder}
            className="pl-9"
            aria-label={placeholder}
          />
        </div>

        {filters ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {filters}
          </div>
        ) : null}

        {countLabel ? (
          <p className="text-sm text-muted-foreground sm:ml-1">{countLabel}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
};

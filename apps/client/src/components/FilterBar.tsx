import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { useIntl } from "react-intl";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * WCAG 2.2 target size (minimum) for a 28px control that is already wider than
 * 44px: a transparent pseudo-element grows the height only, so a toolbar
 * control never claims space horizontally from the control beside it. Sized
 * from the padding box so the target is 44px on a bordered variant too.
 *
 * This lives on the wrapping `<label>`, not on the `<input>`: browsers do not
 * generate pseudo-elements on replaced elements, and a label forwards a click
 * anywhere on it to the input it wraps, so the growth is actually clickable.
 */
const HIT_TALL_44 =
  "relative after:absolute after:-left-px after:-right-px after:top-1/2 after:h-11 after:-mt-[22px] after:content-['']";

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
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      data-slot="filter-bar"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <label className={cn("block w-full sm:max-w-xs", HIT_TALL_44)}>
          <span className="pointer-events-none absolute top-1/2 left-2.5 block size-4 -translate-y-1/2 text-muted-foreground">
            <Search aria-hidden />
          </span>
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={placeholder}
            className="pl-9"
            aria-label={placeholder}
          />
        </label>

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
        // Actions are page-supplied, so the 44px height is granted here rather
        // than at 19 call sites. `gap-y-4` keeps a wrapped phone toolbar clear
        // of the 8px the hit areas reach above and below each control.
        <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-4 sm:justify-end [&_[data-slot=button]]:relative [&_[data-slot=button]]:after:absolute [&_[data-slot=button]]:after:-left-px [&_[data-slot=button]]:after:-right-px [&_[data-slot=button]]:after:top-1/2 [&_[data-slot=button]]:after:h-11 [&_[data-slot=button]]:after:-mt-[22px] [&_[data-slot=button]]:after:content-['']">
          {actions}
        </div>
      ) : null}
    </div>
  );
};

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIntl } from "react-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages?: number;
  onChange: (page: number) => void;
  className?: string;
}

export const Pagination = ({
  page,
  totalPages = 1,
  onChange,
  className,
}: PaginationProps) => {
  const intl = useIntl();

  if (totalPages <= 1) return null;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav
      aria-label={intl.formatMessage({
        id: "common.pagination.label",
        defaultMessage: "Pagination",
      })}
      className={cn("flex items-center justify-center gap-3", className)}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={!canPrev}
      >
        <ChevronLeft data-icon="inline-start" />
        {intl.formatMessage({
          id: "common.pagination.prev",
          defaultMessage: "Prev",
        })}
      </Button>
      <span className="text-sm text-muted-foreground">
        {intl.formatMessage(
          {
            id: "common.pagination.page_of",
            defaultMessage: "Page {page} of {totalPages}",
          },
          { page, totalPages },
        )}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={!canNext}
      >
        {intl.formatMessage({
          id: "common.pagination.next",
          defaultMessage: "Next",
        })}
        <ChevronRight data-icon="inline-end" />
      </Button>
    </nav>
  );
};

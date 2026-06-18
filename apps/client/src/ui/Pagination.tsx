import { Icon } from "./";
import { cn } from "./cn";
import { Button } from "./Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

export const Pagination = ({ page, totalPages, onChange, className }: PaginationProps) => {
  if (totalPages <= 1) return null;
  const canPrev = page > 1;
  const canNext = page < totalPages;
  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1 py-3", className)}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={!canPrev}
        leftIcon={<Icon icon="solar:alt-arrow-left-linear" className="h-4 w-4" />}
      >
        Prev
      </Button>
      <span className="px-3 text-sm text-slate-600 dark:text-slate-400">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={!canNext}
        rightIcon={<Icon icon="solar:alt-arrow-right-linear" className="h-4 w-4" />}
      >
        Next
      </Button>
    </nav>
  );
};

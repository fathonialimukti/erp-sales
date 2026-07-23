import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";
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
  if (totalPages <= 1) return null;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-3", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={!canPrev}
        leftIcon={<ChevronLeft className="size-4" />}
      >
        Prev
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={!canNext}
        rightIcon={<ChevronRight className="size-4" />}
      >
        Next
      </Button>
    </nav>
  );
};

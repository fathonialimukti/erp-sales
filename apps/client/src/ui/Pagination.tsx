import { Icon } from "./";
import { Button } from "./Button";
import "./Pagination.css";

interface PaginationProps {
  page: number;
  totalPages?: number;
  onChange: (page: number) => void;
  className?: string;
}

export const Pagination = ({ page, totalPages = 1, onChange, className }: PaginationProps) => {
  if (totalPages <= 1) return null;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav aria-label="Pagination" className={`pag ${className ?? ""}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={!canPrev}
        leftIcon={<Icon icon="solar:alt-arrow-left-linear" />}
      >
        Prev
      </Button>
      <span className="pag__info">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={!canNext}
        rightIcon={<Icon icon="solar:alt-arrow-right-linear" />}
      >
        Next
      </Button>
    </nav>
  );
};

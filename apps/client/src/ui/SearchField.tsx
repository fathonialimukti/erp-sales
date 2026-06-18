import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef, useId } from "react";
import { Icon } from "./";
import { cn } from "./cn";

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  onClear?: () => void;
  value?: string;
  leftIcon?: ReactNode;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ onClear, value, leftIcon, className, id, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const hasValue = Boolean(value);

    return (
      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-surface-1 px-3 transition-colors focus-within:border-accent-500 focus-within:ring-1 focus-within:ring-accent-500 dark:border-slate-700",
        )}
      >
        <span className="text-slate-400">
          {leftIcon ?? <Icon icon="solar:magnifer-linear" className="h-4 w-4" />}
        </span>
        <input
          ref={ref}
          id={inputId}
          type="search"
          value={value}
          className={cn(
            "h-full w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100",
            className,
          )}
          {...rest}
        />
        {hasValue && onClear && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={onClear}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
SearchField.displayName = "SearchField";

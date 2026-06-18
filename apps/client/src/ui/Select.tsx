import type { SelectHTMLAttributes, ReactNode } from "react";
import { forwardRef, useId } from "react";
import { cn } from "./cn";
import { Icon } from "./";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  isRequired?: boolean;
  children: ReactNode;
  leftIcon?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, isRequired, id, className, children, leftIcon, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const hasError = Boolean(error);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {label}
            {isRequired && <span className="ml-0.5 text-state-danger">*</span>}
          </label>
        )}
        <div
          className={cn(
            "relative flex items-center rounded-md border bg-surface-1 transition-colors",
            "focus-within:border-accent-500 focus-within:ring-1 focus-within:ring-accent-500",
            hasError
              ? "border-state-danger"
              : "border-slate-300 dark:border-slate-700",
            rest.disabled && "bg-slate-50 dark:bg-slate-800/50 opacity-70",
            leftIcon && "pl-2",
          )}
        >
          {leftIcon && <span className="text-slate-400">{leftIcon}</span>}
          <select
            ref={ref}
            id={inputId}
            className={cn(
              "h-10 w-full appearance-none bg-transparent px-3 pr-9 text-sm text-slate-900 focus:outline-none disabled:cursor-not-allowed dark:text-slate-100",
              className,
            )}
            {...rest}
          >
            {children}
          </select>
          <Icon
            icon="solar:alt-arrow-down-linear"
            className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400"
          />
        </div>
        {hasError ? (
          <p className="text-xs text-state-danger" role="alert">{error}</p>
        ) : hint ? (
          <p className="text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Select.displayName = "Select";

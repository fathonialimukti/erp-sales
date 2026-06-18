import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef, useId } from "react";
import { cn } from "./cn";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, id, className, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer items-start gap-2.5 text-sm"
        >
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-accent-500 transition-colors focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-surface-0",
              "dark:border-slate-600 dark:bg-slate-800",
              className,
            )}
            {...rest}
          />
          {(label || description) && (
            <span className="flex flex-col gap-0.5">
              {label && <span className="font-medium text-slate-900 dark:text-slate-100">{label}</span>}
              {description && <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span>}
            </span>
          )}
        </label>
        {error && <p className="text-xs text-state-danger">{error}</p>}
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";

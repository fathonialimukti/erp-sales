import type { TextareaHTMLAttributes } from "react";
import { forwardRef, useId } from "react";
import { cn } from "./cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  isRequired?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, isRequired, id, className, rows = 4, ...rest }, ref) => {
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
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            "w-full rounded-md border bg-surface-1 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-70 dark:text-slate-100",
            hasError
              ? "border-state-danger focus:border-state-danger focus:ring-state-danger"
              : "border-slate-300 focus:border-accent-500 focus:ring-accent-500 dark:border-slate-700",
            className,
          )}
          {...rest}
        />
        {hasError ? (
          <p className="text-xs text-state-danger">{error}</p>
        ) : hint ? (
          <p className="text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

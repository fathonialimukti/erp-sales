import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef, useId } from "react";
import { cn } from "./cn";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  startContent?: ReactNode;
  isClearable?: boolean;
  isRequired?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, startContent, isClearable, isRequired, id, className, ...rest }, ref) => {
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
            "flex items-center gap-2 rounded-md border bg-surface-1 px-3 transition-colors",
            "focus-within:border-accent-500 focus-within:ring-1 focus-within:ring-accent-500",
            hasError
              ? "border-state-danger"
              : "border-slate-300 dark:border-slate-700",
            rest.disabled && "bg-slate-50 dark:bg-slate-800/50 opacity-70",
          )}
        >
          {(leftIcon || startContent) && <span className="text-slate-400">{leftIcon ?? startContent}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-10 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed dark:text-slate-100",
              className,
            )}
            {...rest}
          />
          {rightIcon && <span className="text-slate-400">{rightIcon}</span>}
        </div>
        {hasError ? (
          <p className="text-xs text-state-danger">{error}</p>
        ) : hint ? (
          <p className="text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";

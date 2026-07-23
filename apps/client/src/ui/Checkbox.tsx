import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "checked"> {
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, id, className, indeterminate, onChange, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const innerRef = useRef<HTMLInputElement | null>(null);

    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };

    useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="flex cursor-pointer items-start gap-2.5">
          <input
            ref={setRefs}
            id={inputId}
            type="checkbox"
            className={cn(
              "mt-0.5 size-4 shrink-0 rounded border border-input text-primary accent-primary shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
            onChange={(e) => onChange?.(e.target.checked)}
            {...rest}
          />
          {(label || description) && (
            <span className="flex min-w-0 flex-col gap-0.5">
              {label ? <span className="text-sm font-medium leading-none">{label}</span> : null}
              {description ? (
                <span className="text-xs text-muted-foreground">{description}</span>
              ) : null}
            </span>
          )}
        </label>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";

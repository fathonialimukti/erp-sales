import type { SelectHTMLAttributes, ReactNode } from "react";
import { forwardRef, useId } from "react";
import { Icon } from "./";
import "./Select.css";

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  error?: string;
  hint?: string;
  isRequired?: boolean;
  children: ReactNode;
  leftIcon?: ReactNode;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, isRequired, id, className, children, leftIcon, disabled, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const hasError = Boolean(error);

    const boxClasses = [
      "sel-box",
      hasError ? "sel-box--error" : "",
      disabled ? "sel-box--disabled" : "",
      leftIcon ? "sel-box--has-icon" : "",
    ].filter(Boolean).join(" ");

    return (
      <div className="sel-wrapper">
        {label && (
          <label htmlFor={inputId} className="sel-label">
            {label}
            {isRequired && <span className="sel-label__required">*</span>}
          </label>
        )}
        <div className={boxClasses}>
          {leftIcon && <span className="sel-icon">{leftIcon}</span>}
          <select
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`sel-field ${className ?? ""}`}
            {...rest}
          >
            {children}
          </select>
          <Icon icon="solar:alt-arrow-down-linear" className="sel-arrow" />
        </div>
        {hasError && <p className="sel-error" role="alert">{error}</p>}
        {!hasError && hint && <p className="sel-hint">{hint}</p>}
      </div>
    );
  },
);
Select.displayName = "Select";

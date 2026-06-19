import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";
import { forwardRef, useId } from "react";
import "./Input.css";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isRequired?: boolean;
  onValueChange?: (value: string) => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, isRequired, id, onValueChange, onChange, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const hasError = Boolean(error);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);
      onValueChange?.(event.target.value);
    };

    const boxClasses = [
      "inp-box",
      hasError ? "inp-box--error" : "",
      rest.disabled ? "inp-box--disabled" : "",
    ].filter(Boolean).join(" ");

    return (
      <div className="inp-wrapper">
        {label && (
          <label htmlFor={inputId} className="inp-label">
            {label}
            {isRequired && <span className="inp-label__required">*</span>}
          </label>
        )}
        <div className={boxClasses}>
          {leftIcon && <span className="inp-icon">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className="inp-field"
            onChange={handleChange}
            {...rest}
          />
          {rightIcon && <span className="inp-icon">{rightIcon}</span>}
        </div>
        {hasError && <p className="inp-error">{error}</p>}
        {!hasError && hint && <p className="inp-hint">{hint}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";

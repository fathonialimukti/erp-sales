import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef, useId } from "react";
import "./Checkbox.css";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "checked"> {
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, id, className, onChange, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.checked);
    };

    return (
      <div className="chk-wrapper">
        <label htmlFor={inputId} className="chk-label">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className={`chk-input ${className ?? ""}`}
            onChange={handleChange}
            {...rest}
          />
          {(label || description) && (
            <span className="chk-text">
              {label && <span className="chk-text__label">{label}</span>}
              {description && <span className="chk-text__desc">{description}</span>}
            </span>
          )}
        </label>
        {error && <p className="chk-error">{error}</p>}
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";

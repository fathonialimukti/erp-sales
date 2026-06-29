import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef, useEffect, useId, useRef } from "react";
import "./Checkbox.css";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "checked"> {
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
  checked?: boolean;
  /** Show the indeterminate (dash) state — for "some selected" group toggles. */
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, id, className, indeterminate, onChange, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const innerRef = useRef<HTMLInputElement | null>(null);

    // Merge the forwarded ref and our inner ref so we can set .indeterminate
    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };

    // React doesn't support the `indeterminate` DOM property via props, so set it imperatively.
    useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.checked);
    };

    return (
      <div className="chk-wrapper">
        <label htmlFor={inputId} className="chk-label">
          <input
            ref={setRefs}
            id={inputId}
            type="checkbox"
            className={`chk-input ${className ?? ""}`}
            onChange={handleChange}
            {...rest}
          />
          <span className="chk-box" aria-hidden="true" />
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

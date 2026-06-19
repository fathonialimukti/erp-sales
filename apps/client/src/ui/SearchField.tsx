import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef, useId } from "react";
import { Icon } from "./";
import "./SearchField.css";

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
      <div className={`sf ${className ?? ""}`}>
        <span className="sf__icon">
          {leftIcon ?? <Icon icon="solar:magnifer-linear" />}
        </span>
        <input
          ref={ref}
          id={inputId}
          type="search"
          value={value}
          className="sf__input"
          {...rest}
        />
        {hasValue && onClear && (
          <button type="button" aria-label="Clear search" onClick={onClear} className="sf__clear">
            <Icon icon="solar:close-circle-linear" />
          </button>
        )}
      </div>
    );
  },
);
SearchField.displayName = "SearchField";

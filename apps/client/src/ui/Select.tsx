import "./Select.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  label?: string;
  ariaLabel?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  isRequired?: boolean;
  fullWidth?: boolean;
}

export const Select = ({
  options,
  value,
  onChange,
  multiple = false,
  placeholder,
  label,
  ariaLabel,
  isDisabled,
  isInvalid,
  errorMessage,
  isRequired,
  fullWidth = true,
}: SelectProps) => {
  const autoId = label ? `sel-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
      onChange?.(selected);
    } else {
      onChange?.(e.target.value);
    }
  };

  const wrapperClasses = ["sel-wrapper", fullWidth ? "sel-wrapper--full" : ""].filter(Boolean).join(" ");

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={autoId} className="sel-label">
          {label}
          {isRequired && <span className="sel-label__required">*</span>}
        </label>
      )}

      <select
        id={autoId}
        multiple={multiple}
        disabled={isDisabled}
        aria-label={ariaLabel ?? label}
        aria-invalid={isInvalid || undefined}
        className={`sel-native${isInvalid ? " sel-native--error" : ""}`}
        value={value as string | string[] | undefined}
        onChange={handleChange}
      >
        {placeholder && !multiple && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

      {isInvalid && errorMessage && (
        <p className="sel-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

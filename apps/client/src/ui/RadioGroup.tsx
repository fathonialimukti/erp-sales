import type { ChangeEvent } from "react";
import { useId } from "react";
import "./RadioGroup.css";

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
}

export const RadioGroup = ({
  name,
  value,
  onChange,
  options,
  disabled,
  orientation = "vertical",
}: RadioGroupProps) => {
  const groupId = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.value);
  };

  return (
    <div className={`rg rg--${orientation}`} role="radiogroup" aria-labelledby={groupId}>
      {options.map((option) => {
        const optionId = `${groupId}-${option.value}`;
        const isDisabled = disabled || option.disabled;

        return (
          <label
            key={option.value}
            htmlFor={optionId}
            className={`rg-option ${isDisabled ? "rg-option--disabled" : ""}`}
          >
            <input
              id={optionId}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={isDisabled}
              onChange={handleChange}
              className="rg-input"
            />
            <span className="rg-label">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
};

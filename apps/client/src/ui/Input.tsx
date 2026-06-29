import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import "./Input.css";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onValueChange?: (value: string) => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, rightIcon, id, onValueChange, onChange, ...rest }, ref) => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);
      onValueChange?.(event.target.value);
    };

    const boxClasses = [
      "inp-box",
      rest.disabled ? "inp-box--disabled" : "",
    ].filter(Boolean).join(" ");

    return (
      <div className={boxClasses}>
        {leftIcon && <span className="inp-icon">{leftIcon}</span>}
        <input
          ref={ref}
          id={id}
          className="inp-field"
          onChange={handleChange}
          {...rest}
        />
        {rightIcon && <span className="inp-icon">{rightIcon}</span>}
      </div>
    );
  },
);
Input.displayName = "Input";

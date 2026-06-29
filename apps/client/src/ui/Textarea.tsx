import type { ChangeEvent, TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";
import "./Textarea.css";

interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  onValueChange?: (value: string) => void;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id, className, rows = 4, onValueChange, onChange, ...rest }, ref) => {
    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(event);
      onValueChange?.(event.target.value);
    };

    return (
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={`txa ${className ?? ""}`}
        onChange={handleChange}
        {...rest}
      />
    );
  },
);
Textarea.displayName = "Textarea";

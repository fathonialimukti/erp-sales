import type { ChangeEvent, TextareaHTMLAttributes } from "react";
import { forwardRef, useId } from "react";
import "./Textarea.css";

interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  label?: string;
  error?: string;
  hint?: string;
  isRequired?: boolean;
  onValueChange?: (value: string) => void;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, isRequired, id, className, rows = 4, onValueChange, onChange, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const hasError = Boolean(error);

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(event);
      onValueChange?.(event.target.value);
    };

    const textareaClasses = [
      "txa",
      hasError ? "txa--error" : "",
      className ?? "",
    ].filter(Boolean).join(" ");

    return (
      <div className="txa-wrapper">
        {label && (
          <label htmlFor={inputId} className="txa-label">
            {label}
            {isRequired && <span className="txa-label__required">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={textareaClasses}
          onChange={handleChange}
          {...rest}
        />
        {hasError ? (
          <p className="txa-error">{error}</p>
        ) : hint ? (
          <p className="txa-hint">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

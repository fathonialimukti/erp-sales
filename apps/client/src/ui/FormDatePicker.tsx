import { useEffect, useId, useRef, useState } from "react";
import { format, isValid, parse } from "date-fns";
import { DayPicker } from "react-day-picker";
import { Icon } from "./";
import "./FormDatePicker.css";

interface FormDatePickerProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  placeholder?: string;
  "aria-label"?: string;
}

const toDate = (value: string | undefined): Date | undefined => {
  if (!value) return undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  if (isValid(parsed)) return parsed;
  const d = new Date(value);
  return isValid(d) ? d : undefined;
};

const toISODate = (date: Date): string => format(date, "yyyy-MM-dd");

export const FormDatePicker = ({
  label,
  value,
  onChange,
  isDisabled,
  isRequired,
  isInvalid,
  errorMessage,
  placeholder = "YYYY-MM-DD",
  "aria-label": ariaLabel,
}: FormDatePickerProps) => {
  const autoId = useId();
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [open, setOpen] = useState(false);
  const [textValue, setTextValue] = useState(value ?? "");

  useEffect(() => {
    setTextValue(value ?? "");
  }, [value]);

  const selected = toDate(value);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        setOpen(false);
        detailsRef.current.removeAttribute("open");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        detailsRef.current?.removeAttribute("open");
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const iso = toISODate(date);
    onChange(iso);
    setTextValue(iso);
    setOpen(false);
    detailsRef.current?.removeAttribute("open");
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTextValue(v);
    const d = toDate(v);
    if (d) onChange(toISODate(d));
  };

  const triggerClasses = [
    "dp-trigger",
    isInvalid ? "dp-trigger--error" : "",
    isDisabled ? "dp-trigger--disabled" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="dp-wrapper">
      {label && (
        <label htmlFor={autoId} className="dp-label">
          {label}
          {isRequired && <span className="dp-label__required">*</span>}
        </label>
      )}
      <details
        ref={detailsRef}
        className="dp-details"
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className={triggerClasses}>
          <input
            id={autoId}
            type="text"
            value={textValue}
            placeholder={placeholder}
            aria-label={ariaLabel ?? label}
            disabled={isDisabled}
            onChange={handleTextChange}
            onClick={(e) => e.stopPropagation()}
            className="dp-trigger__input"
          />
          <Icon icon="solar:calendar-mark-linear" className="dp-trigger__icon" />
        </summary>
        <div className="dp-popover">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            showOutsideDays
            classNames={{
              caption: "rdp-caption",
              nav: "rdp-nav",
              head_cell: "rdp-head_cell",
              cell: "rdp-cell",
              day: "rdp-day",
              day_selected: "rdp-day_selected",
              day_today: "rdp-day_today",
            }}
          />
        </div>
      </details>
      {isInvalid && errorMessage && <p className="dp-error">{errorMessage}</p>}
    </div>
  );
};

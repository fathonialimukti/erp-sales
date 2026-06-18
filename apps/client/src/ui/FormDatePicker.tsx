import { useEffect, useId, useRef, useState } from "react";
import { format, isValid, parse } from "date-fns";
import { DayPicker } from "react-day-picker";
import { Icon } from "./";
import { cn } from "./cn";

interface FormDatePickerProps {
  label?: string;
  value?: string; // ISO yyyy-MM-dd or ISO datetime
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

/**
 * Native <details> + react-day-picker. Single date, no time. Returns
 * ISO yyyy-MM-dd. Closes on selection or Escape.
 */
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

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={autoId}
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
          {isRequired && <span className="ml-0.5 text-state-danger">*</span>}
        </label>
      )}
      <details
        ref={detailsRef}
        className="relative"
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary
          className={cn(
            "flex h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-md border bg-surface-1 px-3 text-sm transition-colors",
            "[&::-webkit-details-marker]:hidden",
            isInvalid
              ? "border-state-danger"
              : "border-slate-300 focus-within:border-accent-500 dark:border-slate-700",
            isDisabled && "cursor-not-allowed bg-slate-50 opacity-70 dark:bg-slate-800/50",
          )}
        >
          <input
            id={autoId}
            type="text"
            value={textValue}
            placeholder={placeholder}
            aria-label={ariaLabel ?? label}
            disabled={isDisabled}
            onChange={handleTextChange}
            onClick={(e) => {
              // Prevent the <details> from toggling when interacting with the input
              e.stopPropagation();
            }}
            className="h-full w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
          />
          <Icon icon="solar:calendar-mark-linear" className="h-4 w-4 text-slate-400" />
        </summary>
        <div className="absolute left-0 z-50 mt-1.5 rounded-md border border-slate-200 bg-surface-1 p-3 shadow-md dark:border-slate-800">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            showOutsideDays
            classNames={{
              caption: "flex justify-between items-center mb-2 text-sm font-semibold",
              nav: "flex gap-1",
              head_cell: "text-xs font-medium text-slate-500 pb-1 w-9 text-center",
              cell: "text-center p-0",
              day: "h-9 w-9 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
              day_selected:
                "!bg-accent-500 !text-white hover:!bg-accent-600",
              day_today: "font-semibold text-accent-700",
            }}
          />
        </div>
      </details>
      {isInvalid && errorMessage && <p className="text-xs text-state-danger">{errorMessage}</p>}
    </div>
  );
};

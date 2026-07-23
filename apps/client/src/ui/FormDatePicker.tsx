import { useEffect, useId, useRef, useState } from "react";
import { format, isValid, parse } from "date-fns";
import { DayPicker } from "react-day-picker";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label htmlFor={autoId} className="text-sm font-medium">
          {label}
          {isRequired ? <span className="text-destructive">*</span> : null}
        </label>
      ) : null}
      <details
        ref={detailsRef}
        className="relative"
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary
          className={cn(
            "flex h-9 list-none cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs",
            "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
            isInvalid && "border-destructive ring-destructive/20",
            isDisabled && "pointer-events-none opacity-50",
            "[&::-webkit-details-marker]:hidden",
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
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          <Calendar className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </summary>
        <div className="absolute z-50 mt-1 rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            showOutsideDays
            className="rdp-root"
          />
        </div>
      </details>
      {isInvalid && errorMessage ? (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};

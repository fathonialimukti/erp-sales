import { useEffect, useId, useState } from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [open, setOpen] = useState(false);
  const [textValue, setTextValue] = useState(value ?? "");
  const [month, setMonth] = useState<Date | undefined>(() => toDate(value));

  useEffect(() => {
    setTextValue(value ?? "");
    const next = toDate(value);
    if (next) setMonth(next);
  }, [value]);

  const selected = toDate(value);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const iso = toISODate(date);
    onChange(iso);
    setTextValue(iso);
    setMonth(date);
    setOpen(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTextValue(v);
    const d = toDate(v);
    if (d) {
      onChange(toISODate(d));
      setMonth(d);
    }
  };

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label htmlFor={autoId} className="text-sm font-medium">
          {label}
          {isRequired ? <span className="text-destructive">*</span> : null}
        </label>
      ) : null}

      <Popover open={open} onOpenChange={setOpen}>
        <div
          className={cn(
            "flex h-9 items-center gap-1 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs",
            "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
            isInvalid && "border-destructive ring-destructive/20",
            isDisabled && "pointer-events-none opacity-50",
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
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
              }
            }}
            className="min-w-0 flex-1 bg-transparent px-1 outline-none placeholder:text-muted-foreground"
          />
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={isDisabled}
              aria-label={ariaLabel ?? label ?? "Select date"}
              className="shrink-0 text-muted-foreground"
            >
              <CalendarIcon className="size-4" aria-hidden />
            </Button>
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            month={month}
            onMonthChange={setMonth}
            onSelect={handleSelect}
            disabled={isDisabled}
          />
        </PopoverContent>
      </Popover>

      {isInvalid && errorMessage ? (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};

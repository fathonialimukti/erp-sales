import { useEffect, useMemo, useState } from "react";
import { format, isValid, parse, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerMode = "date" | "datetime" | "daterange";

interface DatePickerProps {
  value: string | [string, string] | null;
  onChange: (value: string | [string, string]) => void;
  label?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  mode?: DatePickerMode;
  showTime?: boolean;
}

const toISODate = (date: Date): string => format(date, "yyyy-MM-dd");

const toISODateTime = (date: Date): string => format(date, "yyyy-MM-dd'T'HH:mm");

const parseDateValue = (value: string | null | undefined): Date | undefined => {
  if (!value) return undefined;
  const datePart = value.split("T")[0] ?? value;
  const parsed = parse(datePart, "yyyy-MM-dd", new Date());
  if (!isValid(parsed)) {
    const iso = parseISO(value);
    if (!isValid(iso)) return undefined;
    if (value.includes("T")) {
      const timePart = value.split("T")[1];
      if (timePart) {
        const [hours, minutes] = timePart.split(":").map(Number);
        iso.setHours(hours || 0, minutes || 0, 0, 0);
      }
    }
    return iso;
  }
  if (value.includes("T")) {
    const timePart = value.split("T")[1];
    if (timePart) {
      const [hours, minutes] = timePart.split(":").map(Number);
      parsed.setHours(hours || 0, minutes || 0, 0, 0);
    }
  }
  return parsed;
};

const displaySingle = (value: string | null | undefined, withTime: boolean) => {
  const date = parseDateValue(value ?? undefined);
  if (!date) return "";
  if (withTime) {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const isBeforeMin = (date: Date, min?: string) => {
  if (!min) return false;
  return toISODate(date) < min.slice(0, 10);
};

const isAfterMax = (date: Date, max?: string) => {
  if (!max) return false;
  return toISODate(date) > max.slice(0, 10);
};

export const DatePicker = ({
  value,
  onChange,
  label,
  placeholder = "Select date",
  min,
  max,
  disabled = false,
  mode = "date",
  showTime = false,
}: DatePickerProps) => {
  const [open, setOpen] = useState(false);
  const withTime = mode === "datetime" || showTime;
  const [timeValue, setTimeValue] = useState(() => {
    if (!Array.isArray(value) && value && value.includes("T")) {
      return value.split("T")[1]?.slice(0, 5) || "00:00";
    }
    return "00:00";
  });

  const selectedDate = useMemo(() => {
    if (mode === "daterange" || Array.isArray(value)) return undefined;
    return parseDateValue(value);
  }, [mode, value]);

  const selectedRange = useMemo<DateRange | undefined>(() => {
    if (mode !== "daterange" || !Array.isArray(value)) return undefined;
    const from = parseDateValue(value[0]);
    const to = parseDateValue(value[1]);
    if (!from && !to) return undefined;
    return { from, to };
  }, [mode, value]);

  const [month, setMonth] = useState<Date | undefined>(
    () => selectedDate ?? selectedRange?.from ?? new Date(),
  );

  useEffect(() => {
    if (!Array.isArray(value) && value && value.includes("T")) {
      setTimeValue(value.split("T")[1]?.slice(0, 5) || "00:00");
    }
  }, [value]);

  useEffect(() => {
    if (selectedDate) setMonth(selectedDate);
    else if (selectedRange?.from) setMonth(selectedRange.from);
  }, [selectedDate, selectedRange?.from]);

  const displayValue = useMemo(() => {
    if (mode === "daterange" && Array.isArray(value)) {
      const start = displaySingle(value[0], false);
      const end = displaySingle(value[1], false);
      if (start && end) return `${start} - ${end}`;
      if (start) return `${start} - …`;
      return "";
    }
    if (!Array.isArray(value)) return displaySingle(value, withTime);
    return "";
  }, [mode, value, withTime]);

  const handleSingleSelect = (date: Date | undefined) => {
    if (!date) {
      onChange("");
      return;
    }
    if (isBeforeMin(date, min) || isAfterMax(date, max)) return;

    if (withTime) {
      const [hours, minutes] = timeValue.split(":").map(Number);
      date.setHours(hours || 0, minutes || 0, 0, 0);
      onChange(toISODateTime(date));
    } else {
      onChange(toISODate(date));
    }
    setOpen(false);
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      onChange(["", ""]);
      return;
    }
    const from = toISODate(range.from);
    const to = range.to ? toISODate(range.to) : "";
    if (to) {
      onChange([from, to]);
      setOpen(false);
    } else {
      onChange([from, ""]);
    }
  };

  const handleToday = () => {
    const today = new Date();
    if (isBeforeMin(today, min) || isAfterMax(today, max)) return;
    if (mode === "daterange") {
      const iso = toISODate(today);
      onChange([iso, iso]);
    } else if (withTime) {
      const [hours, minutes] = timeValue.split(":").map(Number);
      today.setHours(hours || 0, minutes || 0, 0, 0);
      onChange(toISODateTime(today));
    } else {
      onChange(toISODate(today));
    }
    setMonth(today);
    setOpen(false);
  };

  const handleClear = () => {
    if (mode === "daterange") onChange(["", ""]);
    else onChange("");
    setOpen(false);
  };

  const disabledDay = (date: Date) =>
    isBeforeMin(date, min) || isAfterMax(date, max);

  return (
    <div className={cn("relative flex flex-col gap-1.5", disabled && "opacity-60")}>
      {label ? (
        <label className="text-[0.6875rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
          {label}
        </label>
      ) : null}

      <Popover open={open} onOpenChange={setOpen}>
        <div
          className={cn(
            "flex h-8 w-full items-center rounded-md border border-input bg-transparent text-sm shadow-xs",
            "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label={label || placeholder}
              className={cn(
                "flex h-full min-w-0 flex-1 items-center gap-2 px-2.5 text-left text-[0.8125rem] font-medium outline-none",
                !displayValue && "text-muted-foreground",
              )}
            >
              <CalendarIcon
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">
                {displayValue || placeholder}
              </span>
            </button>
          </PopoverTrigger>
          {displayValue && !disabled ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Clear date"
              className="mr-1 shrink-0 text-muted-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClear();
              }}
            >
              <X className="size-3.5" aria-hidden />
            </Button>
          ) : null}
        </div>

        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          {mode === "daterange" ? (
            <Calendar
              mode="range"
              selected={selectedRange}
              month={month}
              onMonthChange={setMonth}
              onSelect={handleRangeSelect}
              disabled={disabledDay}
              numberOfMonths={1}
            />
          ) : (
            <Calendar
              mode="single"
              selected={selectedDate}
              month={month}
              onMonthChange={setMonth}
              onSelect={handleSingleSelect}
              disabled={disabledDay}
            />
          )}

          {withTime && mode !== "daterange" ? (
            <div className="flex items-center gap-2 border-t border-border px-3 py-2.5">
              <label className="text-xs font-medium text-muted-foreground">
                Time
              </label>
              <input
                type="time"
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                value={timeValue}
                onChange={(e) => {
                  const next = e.target.value;
                  setTimeValue(next);
                  if (selectedDate) {
                    const [hours, minutes] = next.split(":").map(Number);
                    const d = new Date(selectedDate);
                    d.setHours(hours || 0, minutes || 0, 0, 0);
                    onChange(toISODateTime(d));
                  }
                }}
              />
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={handleToday}
            >
              Today
            </Button>
            {displayValue ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={handleClear}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

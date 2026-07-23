import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

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

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateTime = (date: Date): string => {
  const dateStr = formatDate(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${dateStr}T${hours}:${minutes}`;
};

const parseDate = (value: string): Date | null => {
  if (!value) return null;
  const datePart = value.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (value.includes("T")) {
    const timePart = value.split("T")[1];
    if (timePart) {
      const [hours, minutes] = timePart.split(":").map(Number);
      date.setHours(hours || 0, minutes || 0);
    }
  }
  return date;
};

const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

const getFirstDayOfMonth = (year: number, month: number): number =>
  new Date(year, month, 1).getDay();

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
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (mode === "daterange" && Array.isArray(value) && value[0]) {
      return parseDate(value[0]) || new Date();
    }
    if (!Array.isArray(value) && value) {
      return parseDate(value) || new Date();
    }
    return new Date();
  });
  const [timeValue, setTimeValue] = useState(() => {
    if (!Array.isArray(value) && value && value.includes("T")) {
      return value.split("T")[1] || "00:00";
    }
    return "00:00";
  });
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate =
    !Array.isArray(value) && value !== null ? parseDate(value) : null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleDayClick = (day: number) => {
    const newDate = new Date(year, month, day);

    if (mode === "daterange") {
      const formatted = formatDate(newDate);
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(formatted);
        setRangeEnd(null);
      } else {
        const start = rangeStart < formatted ? rangeStart : formatted;
        const end = rangeStart < formatted ? formatted : rangeStart;
        onChange([start, end]);
        setRangeStart(null);
        setRangeEnd(null);
        setIsOpen(false);
      }
    } else {
      let formatted = showTime ? formatDateTime(newDate) : formatDate(newDate);
      if (min && formatted < min) return;
      if (max && formatted > max) return;
      if (showTime) {
        const [hours, minutes] = timeValue.split(":").map(Number);
        newDate.setHours(hours || 0, minutes || 0);
        formatted = formatDateTime(newDate);
      }
      onChange(formatted);
      setIsOpen(false);
    }
  };

  const handleToday = () => {
    const today = new Date();
    const formatted = showTime ? formatDateTime(today) : formatDate(today);
    if ((!min || formatted >= min) && (!max || formatted <= max)) {
      if (mode === "daterange") onChange([formatted, formatted]);
      else onChange(formatted);
      setViewDate(today);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    if (mode === "daterange") onChange(["", ""]);
    else onChange("");
    setRangeStart(null);
    setRangeEnd(null);
    setIsOpen(false);
  };

  const isDateDisabled = (day: number): boolean => {
    const dateStr = formatDate(new Date(year, month, day));
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isSelected = (day: number): boolean => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear()
    );
  };

  const isInRange = (day: number): boolean => {
    if (mode !== "daterange") return false;
    const dateStr = formatDate(new Date(year, month, day));
    const activeStart = rangeStart || (Array.isArray(value) ? value[0] : null);
    const activeEnd = rangeEnd || (Array.isArray(value) ? value[1] : null);
    if (activeStart && activeEnd) {
      return dateStr >= activeStart && dateStr <= activeEnd;
    }
    if (activeStart) return dateStr === activeStart;
    return false;
  };

  const isRangeStart = (day: number): boolean => {
    if (mode !== "daterange") return false;
    const activeStart = rangeStart || (Array.isArray(value) ? value[0] : null);
    if (!activeStart) return false;
    return formatDate(new Date(year, month, day)) === activeStart;
  };

  const isRangeEnd = (day: number): boolean => {
    if (mode !== "daterange") return false;
    const activeEnd = rangeEnd || (Array.isArray(value) ? value[1] : null);
    if (!activeEnd) return false;
    return formatDate(new Date(year, month, day)) === activeEnd;
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - firstDay + 1;
      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
      const disabledDay = isValidDay && isDateDisabled(dayNumber);
      days.push(
        <button
          key={i}
          type="button"
          className={cn(
            "flex size-8 items-center justify-center rounded-full text-[0.8125rem] transition-colors",
            !isValidDay && "invisible",
            isValidDay &&
              !disabledDay &&
              "cursor-pointer text-foreground hover:bg-accent",
            isToday(dayNumber) &&
              !isSelected(dayNumber) &&
              "font-semibold text-primary ring-1 ring-primary/40",
            (isSelected(dayNumber) ||
              isRangeStart(dayNumber) ||
              isRangeEnd(dayNumber)) &&
              "bg-primary text-primary-foreground hover:bg-primary",
            isInRange(dayNumber) &&
              !isRangeStart(dayNumber) &&
              !isRangeEnd(dayNumber) &&
              "bg-primary/10 text-primary",
            disabledDay && "cursor-not-allowed opacity-40",
          )}
          onClick={() =>
            isValidDay && !disabledDay && handleDayClick(dayNumber)
          }
          disabled={!isValidDay || disabledDay}
          aria-label={
            isValidDay ? `${MONTHS[month]} ${dayNumber}, ${year}` : undefined
          }
        >
          {isValidDay ? dayNumber : ""}
        </button>,
      );
    }
    return days;
  };

  const getDisplayValue = (): string => {
    if (mode === "daterange" && Array.isArray(value)) {
      const start = value[0]
        ? parseDate(value[0])?.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "";
      const end = value[1]
        ? parseDate(value[1])?.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "";
      if (start && end) return `${start} - ${end}`;
      if (start) return `${start} - ...`;
      return "";
    }
    if (!Array.isArray(value) && value) {
      const date = parseDate(value);
      if (date) {
        if (showTime) {
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
      }
    }
    return "";
  };

  const displayValue = getDisplayValue();

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1.5",
        isOpen && "z-[101]",
        disabled && "opacity-60",
      )}
      ref={containerRef}
    >
      {label ? (
        <label className="text-[0.6875rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
          {label}
        </label>
      ) : null}

      <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[0.8125rem] shadow-none transition-colors hover:border-ring/40 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
        <button
          type="button"
          className="flex h-full w-full cursor-pointer items-center gap-2 bg-transparent p-0 text-[0.8125rem] font-medium text-foreground disabled:cursor-not-allowed"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-label={label || placeholder}
        >
          <Calendar className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span
            className={cn(
              "flex-1 text-left",
              !displayValue && "text-muted-foreground",
            )}
          >
            {displayValue || placeholder}
          </span>
          {displayValue ? (
            <span
              role="button"
              tabIndex={0}
              className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClear();
                }
              }}
              aria-label="Clear date"
            >
              <X className="size-3.5" aria-hidden />
            </span>
          ) : null}
        </button>
      </div>

      {isOpen ? (
        <div className="absolute top-[calc(100%+0.5rem)] left-0 z-[100] min-w-[18rem] w-full rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <button
              type="button"
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 pt-2 pb-1">
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 place-items-center gap-1 px-3 pb-3 pt-1">
            {renderCalendarDays()}
          </div>

          {showTime && mode !== "daterange" ? (
            <div className="flex items-center gap-2 border-t border-border px-4 py-3">
              <label className="text-xs font-medium text-muted-foreground">
                Time
              </label>
              <input
                type="time"
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
              />
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
            <button
              type="button"
              className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              onClick={handleToday}
            >
              Today
            </button>
            {displayValue ? (
              <button
                type="button"
                className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                onClick={handleClear}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

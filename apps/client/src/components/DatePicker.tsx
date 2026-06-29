import { useState, useRef, useEffect } from "react";
import { SOIcon } from "../pages/sales-order/SalesOrderIcons";
import "./DatePicker.css";

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
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
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

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
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

  const selectedDate = !Array.isArray(value) && value !== null ? parseDate(value) : null;
  const rangeStartDate = mode === "daterange" && Array.isArray(value) && value[0] ? parseDate(value[0]) : null;
  const rangeEndDate = mode === "daterange" && Array.isArray(value) && value[1] ? parseDate(value[1]) : null;
  
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(year, month, day);
    
    if (mode === "daterange") {
      const formatted = formatDate(newDate);
      
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // Start new range
        setRangeStart(formatted);
        setRangeEnd(null);
      } else {
        // Complete range
        const start = rangeStart < formatted ? rangeStart : formatted;
        const end = rangeStart < formatted ? formatted : rangeStart;
        onChange([start, end]);
        setRangeStart(null);
        setRangeEnd(null);
        setIsOpen(false);
      }
    } else {
      const formatted = showTime ? formatDateTime(newDate) : formatDate(newDate);
      
      // Check min/max constraints
      if (min && formatted < min) return;
      if (max && formatted > max) return;
      
      if (showTime) {
        const [hours, minutes] = timeValue.split(":").map(Number);
        newDate.setHours(hours || 0, minutes || 0);
        onChange(formatDateTime(newDate));
      } else {
        onChange(formatted);
      }
      setIsOpen(false);
    }
  };

  const handleToday = () => {
    const today = new Date();
    const formatted = showTime ? formatDateTime(today) : formatDate(today);
    if ((!min || formatted >= min) && (!max || formatted <= max)) {
      if (mode === "daterange") {
        onChange([formatted, formatted]);
      } else {
        onChange(formatted);
      }
      setViewDate(today);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    if (mode === "daterange") {
      onChange(["", ""]);
    } else {
      onChange("");
    }
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
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const isSelected = (day: number): boolean => {
    if (!selectedDate) return false;
    return day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
  };

  const isInRange = (day: number): boolean => {
    if (mode !== "daterange") return false;
    const dateStr = formatDate(new Date(year, month, day));
    const activeStart = rangeStart || (Array.isArray(value) ? value[0] : null);
    const activeEnd = rangeEnd || (Array.isArray(value) ? value[1] : null);
    if (activeStart && activeEnd) {
      return dateStr >= activeStart && dateStr <= activeEnd;
    }
    if (activeStart) {
      return dateStr === activeStart;
    }
    return false;
  };

  const isRangeStart = (day: number): boolean => {
    if (mode !== "daterange") return false;
    const activeStart = rangeStart || (Array.isArray(value) ? value[0] : null);
    if (!activeStart) return false;
    const dateStr = formatDate(new Date(year, month, day));
    return dateStr === activeStart;
  };

  const isRangeEnd = (day: number): boolean => {
    if (mode !== "daterange") return false;
    const activeEnd = rangeEnd || (Array.isArray(value) ? value[1] : null);
    if (!activeEnd) return false;
    const dateStr = formatDate(new Date(year, month, day));
    return dateStr === activeEnd;
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - firstDay + 1;
      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
      const isDisabled = isValidDay && isDateDisabled(dayNumber);

      days.push(
        <button
          key={i}
          type="button"
          className={`dp-day 
            ${isValidDay ? "" : "dp-day--empty"} 
            ${isSelected(dayNumber) ? "dp-day--selected" : ""} 
            ${isToday(dayNumber) ? "dp-day--today" : ""} 
            ${isDisabled ? "dp-day--disabled" : ""}
            ${isInRange(dayNumber) ? "dp-day--in-range" : ""}
            ${isRangeStart(dayNumber) ? "dp-day--range-start" : ""}
            ${isRangeEnd(dayNumber) ? "dp-day--range-end" : ""}
          `}
          onClick={() => isValidDay && !isDisabled && handleDayClick(dayNumber)}
          disabled={!isValidDay || isDisabled}
          aria-label={isValidDay ? `${MONTHS[month]} ${dayNumber}, ${year}` : undefined}
        >
          {isValidDay ? dayNumber : ""}
        </button>
      );
    }

    return days;
  };

  const getDisplayValue = (): string => {
    if (mode === "daterange" && Array.isArray(value)) {
      const start = value[0] ? parseDate(value[0])?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
      const end = value[1] ? parseDate(value[1])?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
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
            minute: "2-digit"
          });
        }
        return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      }
    }
    return "";
  };

  const displayValue = getDisplayValue();

  return (
    <div className={`dp ${isOpen ? "dp--open" : ""} ${disabled ? "dp--disabled" : ""}`} ref={containerRef}>
      {label && <label className="dp-label">{label}</label>}
      <div className="dp-trigger">
        <button
          type="button"
          className="dp-trigger__button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-label={label || placeholder}
        >
          <SOIcon name="calendar" size={16} />
          <span className={`dp-trigger__text ${!displayValue ? "dp-trigger__text--placeholder" : ""}`}>
            {displayValue || placeholder}
          </span>
          {displayValue && (
            <button
              type="button"
              className="dp-trigger__clear"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              aria-label="Clear date"
            >
              <SOIcon name="close" size={14} />
            </button>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="dp-dropdown">
          <div className="dp-header">
            <button type="button" className="dp-nav-btn" onClick={handlePrevMonth} aria-label="Previous month">
              <SOIcon name="chevron-left" size={18} />
            </button>
            <span className="dp-month-year">
              {MONTHS[month]} {year}
            </span>
            <button type="button" className="dp-nav-btn" onClick={handleNextMonth} aria-label="Next month">
              <SOIcon name="chevron-right" size={18} />
            </button>
          </div>

          <div className="dp-weekdays">
            {DAYS.map((day) => (
              <div key={day} className="dp-weekday">
                {day}
              </div>
            ))}
          </div>

          <div className="dp-days">{renderCalendarDays()}</div>

          {showTime && mode !== "daterange" && (
            <div className="dp-time-picker">
              <label className="dp-time-label">Time</label>
              <input
                type="time"
                className="dp-time-input"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
              />
            </div>
          )}

          <div className="dp-footer">
            <button type="button" className="dp-footer-btn" onClick={handleToday}>
              Today
            </button>
            {displayValue && (
              <button type="button" className="dp-footer-btn dp-footer-btn--clear" onClick={handleClear}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import { useEffect, useId, useMemo, useRef, useState } from "react";
import "./Select.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  label?: string;
  ariaLabel?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  isRequired?: boolean;
  fullWidth?: boolean;
}

export const Select = ({
  options,
  value,
  onChange,
  multiple = false,
  placeholder = "Select…",
  label,
  ariaLabel,
  isDisabled,
  isInvalid,
  errorMessage,
  isRequired,
  fullWidth = true,
}: SelectProps) => {
  const autoId = useId();
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const selectedValues = useMemo(() => {
    if (value === undefined || value === null || value === "") return multiple ? [] : "";
    return multiple ? (Array.isArray(value) ? value : [value]) : value;
  }, [value, multiple]);

  const isSelected = (optionValue: string) => {
    if (multiple) {
      return (selectedValues as string[]).includes(optionValue);
    }
    return selectedValues === optionValue;
  };

  const selectedOptions = useMemo(() => {
    if (multiple) {
      return (selectedValues as string[])
        .map((v) => options.find((o) => o.value === v))
        .filter((o): o is SelectOption => o !== undefined);
    }
    const found = options.find((o) => o.value === selectedValues);
    return found ? [found] : [];
  }, [options, selectedValues, multiple]);

  const hasSelection = useMemo(() => {
    if (multiple) return (selectedValues as string[]).length > 0;
    return selectedValues !== "";
  }, [selectedValues, multiple]);

  const displayText = useMemo(() => {
    if (multiple) {
      const count = (selectedValues as string[]).length;
      return count > 0 ? `${count} selected` : placeholder;
    }
    const found = options.find((o) => o.value === selectedValues);
    return found ? found.label : placeholder;
  }, [options, selectedValues, multiple, placeholder]);

  const toggleOpen = (e?: React.MouseEvent<HTMLElement>) => {
    e?.preventDefault();
    const next = !open;
    setOpen(next);
    const d = detailsRef.current;
    if (!d) return;
    if (next) d.setAttribute("open", "true");
    else d.removeAttribute("open");
  };

  const handleSelect = (option: SelectOption) => {
    if (multiple) {
      const current = selectedValues as string[];
      const next = current.includes(option.value)
        ? current.filter((v) => v !== option.value)
        : [...current, option.value];
      onChange?.(next);
    } else {
      onChange?.(option.value);
      setOpen(false);
      detailsRef.current?.removeAttribute("open");
    }
  };

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>, optionValue: string) => {
    e.stopPropagation();
    const current = selectedValues as string[];
    onChange?.(current.filter((v) => v !== optionValue));
  };

  const handleTriggerKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      detailsRef.current?.setAttribute("open", "true");
    }
  };

  const handleListKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) handleSelect(opt);
    }
  };

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

  useEffect(() => {
    if (open) setHighlight(0);
  }, [open]);

  const wrapperClasses = ["sel-wrapper", fullWidth ? "sel-wrapper--full" : ""].filter(Boolean).join(" ");
  const triggerClasses = [
    "sel-trigger",
    isInvalid ? "sel-trigger--error" : "",
    isDisabled ? "sel-trigger--disabled" : "",
    open ? "sel-trigger--open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={autoId} className="sel-label">
          {label}
          {isRequired && <span className="sel-label__required">*</span>}
        </label>
      )}

      <details className="sel-details" onToggle={(e) => setOpen(e.currentTarget.open)} ref={detailsRef}>
        <summary
          id={autoId}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel ?? label}
          className={triggerClasses}
          onKeyDown={handleTriggerKey}
          onClick={(e) => toggleOpen(e)}
        >
          <span className={`sel-trigger__text ${!hasSelection ? "sel-trigger__text--placeholder" : ""}`}>
            {displayText}
          </span>
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`sel-trigger__arrow ${open ? "sel-trigger__arrow--open" : ""}`}
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>

        <div role="listbox" className="sel-panel">
          <ul tabIndex={0} onKeyDown={handleListKey} className="sel-options">
            {options.map((option, idx) => {
              const selected = isSelected(option.value);
              const optionClasses = [
                "sel-option",
                idx === highlight ? "sel-option--highlighted" : "",
                selected ? "sel-option--selected" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => handleSelect(option)}
                  className={optionClasses}
                >
                  <span className="sel-option__label">{option.label}</span>
                  {selected && (
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="sel-option__check"
                      aria-hidden
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </details>

      {multiple && selectedOptions.length > 0 && (
        <div className="sel-chips">
          {selectedOptions.map((option) => (
            <span key={option.value} className="sel-chip">
              <span className="sel-chip__label">{option.label}</span>
              <button
                type="button"
                className="sel-chip__remove"
                onClick={(e) => handleRemove(e, option.value)}
                aria-label={`Remove ${option.label}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {isInvalid && errorMessage && (
        <p className="sel-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
}

const initialOf = (label: string) => {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
};

const hashToHue = (input: string): number => {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
};

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
  searchPlaceholder = "Search…",
  emptyLabel = "No matches found",
  className,
}: SelectProps) => {
  const autoId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selectedValues = useMemo(() => {
    if (value === undefined || value === null || value === "") return multiple ? [] : "";
    return multiple ? (Array.isArray(value) ? value : [value]) : value;
  }, [value, multiple]);

  const isSelected = (idVal: string) =>
    multiple ? (selectedValues as string[]).includes(idVal) : selectedValues === idVal;

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, searchTerm]);

  const selected = useMemo(() => {
    if (multiple) return null;
    if (!value) return null;
    return options.find((o) => o.value === value) ?? null;
  }, [options, value, multiple]);

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
        triggerRef.current?.focus();
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
    if (open) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
      setHighlight(0);
    }
  }, [open]);

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    const idVal = option.value;
    if (multiple) {
      const current = selectedValues as string[];
      const next = current.includes(idVal)
        ? current.filter((v) => v !== idVal)
        : [...current, idVal];
      onChange?.(next);
    } else {
      onChange?.(idVal);
      setSearchTerm("");
      setOpen(false);
      detailsRef.current?.removeAttribute("open");
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange?.(multiple ? [] : "");
    setSearchTerm("");
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
      setHighlight((h) => Math.min(h + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filteredOptions[highlight];
      if (opt) handleSelect(opt);
    } else if (e.key === "Backspace" && multiple) {
      e.preventDefault();
      const current = selectedValues as string[];
      if (current.length > 0) onChange?.(current.slice(0, -1));
    }
  };

  const toggleOpen = (e?: React.MouseEvent<HTMLElement>) => {
    e?.preventDefault();
    const next = !open;
    setOpen(next);
    const d = detailsRef.current;
    if (d) {
      if (next) d.setAttribute("open", "true");
      else d.removeAttribute("open");
    }
  };

  const selectedLabel = selected ? selected.label : "";
  const selectedInitial = selected ? initialOf(selectedLabel) : "";
  const selectedHue = selected ? hashToHue(selectedLabel) : 0;
  const selectedCount = multiple ? (selectedValues as string[]).length : 0;
  const displayText = multiple
    ? selectedCount > 0
      ? `${selectedCount} selected`
      : placeholder
    : selected
      ? selectedLabel
      : placeholder;
  const isPlaceholder = multiple ? selectedCount === 0 : !selected;

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
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
          ref={triggerRef}
          id={autoId}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel ?? label}
          className={cn(
            "flex h-9 list-none cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            isInvalid && "border-destructive",
            isDisabled && "pointer-events-none opacity-50",
            "[&::-webkit-details-marker]:hidden",
            className,
          )}
          onKeyDown={handleTriggerKey}
          onClick={(e) => toggleOpen(e)}
        >
          {!multiple && selected ? (
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: `hsl(${selectedHue} 60% 45%)` }}
              aria-hidden
            >
              {selectedInitial}
            </span>
          ) : null}
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              isPlaceholder && "text-muted-foreground",
            )}
          >
            {displayText}
          </span>
          {!multiple && selected && !isDisabled ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear selection"
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <ChevronDown
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
              aria-hidden
            />
          )}
        </summary>

        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <div className="border-b p-2">
            <div className="flex h-8 items-center gap-2 rounded-md border border-input bg-transparent px-2">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleListKey}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <ul tabIndex={0} onKeyDown={handleListKey} className="max-h-56 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</li>
            ) : (
              filteredOptions.map((option, idx) => {
                const idVal = option.value;
                const optLabel = option.label;
                const optInitial = initialOf(optLabel);
                const optHue = hashToHue(optLabel);
                const isHighlighted = idx === highlight;
                const isOptSelected = isSelected(idVal);
                return (
                  <li
                    key={idVal || idx}
                    role="option"
                    aria-selected={isOptSelected}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                      isHighlighted && "bg-accent text-accent-foreground",
                      isOptSelected && "font-medium",
                      option.disabled && "pointer-events-none opacity-50",
                    )}
                  >
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                      style={{ backgroundColor: `hsl(${optHue} 60% 45%)` }}
                      aria-hidden
                    >
                      {optInitial}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{optLabel}</span>
                    {isOptSelected ? <Check className="size-4 shrink-0 text-primary" aria-hidden /> : null}
                  </li>
                );
              })
            )}
          </ul>

          {filteredOptions.length > 0 ? (
            <div className="flex items-center justify-between border-t px-2 py-1.5 text-[11px] text-muted-foreground">
              <span>
                {filteredOptions.length} {filteredOptions.length === 1 ? "result" : "results"}
                {searchTerm ? ` (filtered from ${options.length})` : ""}
              </span>
              <span className="hidden gap-1 sm:inline-flex">
                <kbd className="rounded border bg-muted px-1">↑↓</kbd>
                <kbd className="rounded border bg-muted px-1">↵</kbd>
              </span>
            </div>
          ) : null}
        </div>
      </details>

      {multiple && (selectedValues as string[]).length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {(selectedValues as string[]).map((idVal) => {
            const option = options.find((o) => o.value === idVal);
            const chipLabel = option ? option.label : idVal;
            return (
              <span
                key={idVal}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                <span className="max-w-[12rem] truncate">{chipLabel}</span>
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-secondary-foreground/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    const current = selectedValues as string[];
                    onChange?.(current.filter((v) => v !== idVal));
                  }}
                  aria-label={`Remove ${chipLabel}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      {isInvalid && errorMessage ? (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};

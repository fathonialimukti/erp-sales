import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "./Spinner";
import "./SelectSearch.css";

type SelectSearchQueryParams<TDependencies> = {
  search: string;
  limit: number;
  dependencies?: TDependencies;
};

type SelectSearchSourceResult<TOption> = {
  options: TOption[];
};

type SelectSearchSourceData<TOption, TDependencies> = (
  params: SelectSearchQueryParams<TDependencies>,
) => Promise<SelectSearchSourceResult<TOption> | TOption[]>;

interface SelectSearchProps<
  TOption extends Record<string, unknown>,
  TDependencies = Record<string, unknown>,
> {
  sourceData: SelectSearchSourceData<TOption, TDependencies>;
  optionsKey: keyof TOption;
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  queryKeyBase: string;
  dependencies?: TDependencies;
  selectedOption?: TOption | null;
  getOptionLabel?: (option: TOption) => string;
  getOptionDescription?: (option: TOption) => string | undefined;
  getOptionInitial?: (option: TOption) => string;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  loadingLabel?: string;
  ariaLabel?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  isRequired?: boolean;
  debounceMs?: number;
  limit?: number;
  fullWidth?: boolean;
  multiple?: boolean;
  isLoading?: boolean;
}

const normalizeSourceResult = <TOption,>(
  data: SelectSearchSourceResult<TOption> | TOption[],
): TOption[] => (Array.isArray(data) ? data : data.options);

const getDefaultLabel = <TOption extends Record<string, unknown>>(
  option: TOption,
  optionsKey: keyof TOption,
) => {
  const rawValue = option[optionsKey];
  return rawValue == null ? "" : String(rawValue);
};

const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [delay, value]);
  return debounced;
};

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

export const SelectSearch = <
  TOption extends Record<string, unknown>,
  TDependencies = Record<string, unknown>,
>({
  sourceData,
  optionsKey,
  value,
  onChange,
  queryKeyBase,
  dependencies,
  selectedOption,
  getOptionLabel,
  getOptionDescription,
  getOptionInitial,
  label,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyLabel = "No matches found",
  loadingLabel = "Loading…",
  ariaLabel,
  isDisabled,
  isInvalid,
  errorMessage,
  isRequired,
  debounceMs = 250,
  limit = 50,
  fullWidth = true,
  multiple = false,
  isLoading: propIsLoading,
}: SelectSearchProps<TOption, TDependencies>) => {
  const autoId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlight, setHighlight] = useState(0);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, debounceMs);

  useEffect(() => {
    if (dependencies !== undefined) setSearchTerm("");
  }, [dependencies]);

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: [queryKeyBase, debouncedSearchTerm, dependencies, limit],
    queryFn: async () => {
      const result = await sourceData({ search: debouncedSearchTerm, limit, dependencies });
      return normalizeSourceResult<TOption>(result);
    },
    staleTime: 30_000,
    gcTime: 300_000,
  });

  const isLoading = propIsLoading ?? queryLoading;

  const options = useMemo(() => data ?? [], [data]);
  const totalCount = options.length;

  const selectedValues = useMemo(() => {
    if (value === undefined || value === null || value === "") return multiple ? [] : "";
    return multiple ? (Array.isArray(value) ? value : [value]) : value;
  }, [value, multiple]);

  const isSelected = (idVal: string) => {
    if (multiple) {
      return (selectedValues as string[]).includes(idVal);
    }
    return selectedValues === idVal;
  };

  const selected = useMemo(() => {
    if (multiple) return null;
    if (!value) return null;
    if (selectedOption && String(selectedOption[optionsKey] ?? "") === value) {
      return selectedOption;
    }
    return options.find((o) => String(o[optionsKey] ?? "") === value) ?? null;
  }, [options, optionsKey, selectedOption, value, multiple]);

  const renderLabel = (option: TOption) =>
    getOptionLabel ? getOptionLabel(option) : getDefaultLabel(option, optionsKey);

  const renderInitial = (option: TOption) => {
    if (getOptionInitial) return getOptionInitial(option);
    return initialOf(renderLabel(option));
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

  const handleSelect = (option: TOption) => {
    const idVal = String(option[optionsKey] ?? "");
    if (multiple) {
      const current = selectedValues as string[];
      const next = current.includes(idVal)
        ? current.filter((v) => v !== idVal)
        : [...current, idVal];
      onChange(next);
    } else {
      onChange(idVal);
      setSearchTerm("");
      setOpen(false);
      detailsRef.current?.removeAttribute("open");
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(multiple ? [] : "");
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
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) handleSelect(opt);
    } else if (e.key === "Backspace" && multiple) {
      e.preventDefault();
      const current = selectedValues as string[];
      if (current.length > 0) {
        onChange(current.slice(0, -1));
      }
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

  const selectedLabel = selected ? renderLabel(selected) : "";
  const selectedInitial = selected ? renderInitial(selected) : "";
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

  const triggerClasses = [
    "ss-trigger",
    isInvalid ? "ss-trigger--error" : "",
    isDisabled ? "ss-trigger--disabled" : "",
    selected ? "ss-trigger--selected" : "",
  ].filter(Boolean).join(" ");

  const wrapperClasses = [
    "ss-wrapper",
    fullWidth ? "ss-wrapper--full" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={autoId} className="ss-label">
          {label}
          {isRequired && <span className="ss-label__required">*</span>}
        </label>
      )}

      <details
        ref={detailsRef}
        className="ss-details"
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary
          ref={triggerRef}
          id={autoId}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel ?? label}
          className={triggerClasses}
          onKeyDown={handleTriggerKey}
          onClick={(e) => toggleOpen(e)}
        >
          {!multiple && selected ? (
            <span
              className="ss-trigger__initial"
              style={{ backgroundColor: `hsl(${selectedHue} 60% 45%)` }}
              aria-hidden
            >
              {selectedInitial}
            </span>
          ) : null}
          <span className={`ss-trigger__text ${isPlaceholder ? "ss-trigger__text--placeholder" : ""}`}>
            {displayText}
          </span>

          {!multiple && selected && !isDisabled ? (
            <button type="button" onClick={handleClear} aria-label="Clear selection" className="ss-trigger__clear">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : (
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`ss-trigger__arrow ${open ? "ss-trigger__arrow--open" : ""}`}
              aria-hidden
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </summary>

        <div role="listbox" className="ss-panel">
          <div className="ss-search-bar">
            <div className="ss-search-inner">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ss-search-inner__icon"
                aria-hidden
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchRef}
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleListKey}
                placeholder={searchPlaceholder}
                className="ss-search-inner__input"
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm("")} aria-label="Clear search" className="ss-search-inner__clear">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <ul tabIndex={0} onKeyDown={handleListKey} className="ss-options">
            {isLoading ? (
              <li className="ss-loading">
                <Spinner size="sm" />
                {loadingLabel}
              </li>
            ) : options.length === 0 ? (
              <li className="ss-empty">
                <div className="ss-empty__icon-wrapper">
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ss-empty__icon"
                    aria-hidden
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                {emptyLabel}
              </li>
            ) : (
              options.map((option, idx) => {
                const idVal = String(option[optionsKey] ?? "");
                const optLabel = renderLabel(option);
                const optInitial = initialOf(optLabel);
                const optHue = hashToHue(optLabel);
                const isHighlighted = idx === highlight;
                const isSelected = multiple
                  ? (selectedValues as string[]).includes(idVal)
                  : idVal === value;
                const description = getOptionDescription?.(option);
                const optionClasses = [
                  "ss-option",
                  isHighlighted ? "ss-option--highlighted" : "",
                  isSelected ? "ss-option--selected" : "",
                ].filter(Boolean).join(" ");
                return (
                  <li
                    key={idVal || idx}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => handleSelect(option)}
                    className={optionClasses}
                  >
                    <span className="ss-option__initial" style={{ backgroundColor: `hsl(${optHue} 60% 45%)` }} aria-hidden>
                      {optInitial}
                    </span>
                    <span className="ss-option__text">
                      <span className="ss-option__label">{optLabel}</span>
                      {description && <span className="ss-option__desc">{description}</span>}
                    </span>
                    {isSelected && (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ss-option__check" aria-hidden>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {!isLoading && options.length > 0 && (
            <div className="ss-footer">
              <span>
                {totalCount} {totalCount === 1 ? "result" : "results"}
                {debouncedSearchTerm ? ` for "${debouncedSearchTerm}"` : ""}
              </span>
              <span>
                <kbd className="ss-footer__kbd">↑↓</kbd> navigate
                <kbd className="ss-footer__kbd">↵</kbd> select
              </span>
            </div>
          )}
        </div>
      </details>

      {multiple && (selectedValues as string[]).length > 0 && (
        <div className="ss-chips">
          {(selectedValues as string[]).map((idVal) => {
            const option = options.find((o) => String(o[optionsKey] ?? "") === idVal);
            const chipLabel = option ? renderLabel(option) : idVal;
            return (
              <span key={idVal} className="ss-chip">
                <span className="ss-chip__label">{chipLabel}</span>
                <button
                  type="button"
                  className="ss-chip__remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    const current = selectedValues as string[];
                    onChange(current.filter((v) => v !== idVal));
                  }}
                  aria-label={`Remove ${chipLabel}`}
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
            );
          })}
        </div>
      )}

      {isInvalid && errorMessage && <p className="ss-error" role="alert">{errorMessage}</p>}
    </div>
  );
};

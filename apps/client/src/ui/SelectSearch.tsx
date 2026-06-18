import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "./";
import { Spinner } from "./Spinner";
import { cn } from "./cn";

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
  value?: string;
  onChange: (value: string) => void;
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

/**
 * Searchable select with:
 *   • header label + required indicator
 *   • trigger showing the selected option's label (or placeholder)
 *   • native <details> popover containing search + list + footer
 *   • keyboard: ↑/↓ to move highlight, Enter to select, Esc to close
 *   • clear (×) button when a value is set
 *   • per-option leading initial circle (deterministic hue)
 *   • result count footer + loading/empty states
 *   • selected option shows a check mark
 */
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
}: SelectSearchProps<TOption, TDependencies>) => {
  const autoId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlight, setHighlight] = useState(0);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, debounceMs);

  useEffect(() => {
    if (dependencies !== undefined) setSearchTerm("");
  }, [dependencies]);

  const { data, isLoading } = useQuery({
    queryKey: [queryKeyBase, debouncedSearchTerm, dependencies, limit],
    queryFn: async () => {
      const result = await sourceData({ search: debouncedSearchTerm, limit, dependencies });
      return normalizeSourceResult<TOption>(result);
    },
    staleTime: 30_000,
    gcTime: 300_000,
  });

  const options = data ?? [];
  const totalCount = options.length;

  const selected = useMemo(() => {
    if (!value) return null;
    if (selectedOption && String(selectedOption[optionsKey] ?? "") === value) {
      return selectedOption;
    }
    return options.find((o) => String(o[optionsKey] ?? "") === value) ?? null;
  }, [options, optionsKey, selectedOption, value]);

  const renderLabel = (option: TOption) =>
    getOptionLabel ? getOptionLabel(option) : getDefaultLabel(option, optionsKey);

  const renderInitial = (option: TOption) => {
    if (getOptionInitial) return getOptionInitial(option);
    return initialOf(renderLabel(option));
  };

  // Close on outside click / Escape
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
    onChange(String(option[optionsKey] ?? ""));
    setSearchTerm("");
    setOpen(false);
    detailsRef.current?.removeAttribute("open");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange("");
  };

  const handleTriggerKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      detailsRef.current?.setAttribute("open", "true");
    }
  };

  const handleListKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
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

  const toggleOpen = () => {
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
  const displayText = selected ? selectedLabel : placeholder;
  const isPlaceholder = !selected;

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
      {label && (
        <label
          htmlFor={autoId}
          className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
          {isRequired && <span className="text-state-danger">*</span>}
        </label>
      )}

      <details
        ref={detailsRef}
        className="relative"
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary
          className={cn(
            "flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border bg-surface-1 px-3 text-sm transition-colors",
            "[&::-webkit-details-marker]:hidden",
            "focus:outline-none focus:ring-1",
            isInvalid
              ? "border-state-danger focus:border-state-danger focus:ring-state-danger"
              : "border-slate-300 focus-within:border-accent-500 focus-within:ring-accent-500 dark:border-slate-700",
            isDisabled && "cursor-not-allowed bg-slate-50 opacity-70 dark:bg-slate-800/50",
            !isPlaceholder && "pl-2",
          )}
        >
          <button
            ref={triggerRef}
            id={autoId}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={ariaLabel ?? label}
            disabled={isDisabled}
            onKeyDown={handleTriggerKey}
            onClick={(e) => {
              e.preventDefault();
              toggleOpen();
            }}
            className="flex flex-1 items-center gap-2 text-left"
          >
            {selected ? (
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: `hsl(${selectedHue} 60% 45%)` }}
                aria-hidden
              >
                {selectedInitial}
              </span>
            ) : (
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800"
                aria-hidden
              >
                <Icon icon="solar:user-circle-linear" className="h-4 w-4" />
              </span>
            )}
            <span className={cn("flex-1 truncate", isPlaceholder && "text-slate-400")}>
              {displayText}
            </span>
          </button>

          {selected && !isDisabled && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear selection"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
            </button>
          )}

          <Icon
            icon="solar:alt-arrow-down-linear"
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition-transform",
              open && "rotate-180",
            )}
          />
        </summary>

        <div
          role="listbox"
          className={cn(
            "absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-md border border-slate-200 bg-surface-1 shadow-lg",
            "dark:border-slate-800",
            "animate-[fadeIn_120ms_ease-out]",
          )}
        >
          {/* Search input */}
          <div className="border-b border-slate-200 p-2 dark:border-slate-800">
            <div className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-surface-0 px-2 focus-within:border-accent-500 focus-within:ring-1 focus-within:ring-accent-500 dark:border-slate-700">
              <Icon icon="solar:magnifer-linear" className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={searchRef}
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleListKey}
                placeholder={searchPlaceholder}
                className="h-full w-full bg-transparent text-sm focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <ul
            tabIndex={0}
            onKeyDown={handleListKey}
            className="max-h-64 overflow-y-auto py-1"
          >
            {isLoading ? (
              <li className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-slate-500">
                <Spinner size="sm" />
                {loadingLabel}
              </li>
            ) : options.length === 0 ? (
              <li className="flex flex-col items-center justify-center gap-2 px-3 py-8 text-sm text-slate-500">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <Icon icon="solar:minimalistic-magnifer-linear" className="h-5 w-5 text-slate-400" />
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
                const isSelected = idVal === value;
                const description = getOptionDescription?.(option);
                return (
                  <li
                    key={idVal || idx}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "mx-1 flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                      isHighlighted && "bg-slate-100 dark:bg-slate-800",
                      isSelected && "bg-accent-50 text-accent-800 dark:bg-accent-900/30 dark:text-accent-100",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white",
                        isSelected ? "ring-2 ring-accent-300 dark:ring-accent-700" : "",
                      )}
                      style={{ backgroundColor: `hsl(${optHue} 60% 45%)` }}
                      aria-hidden
                    >
                      {optInitial}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="block truncate font-medium">{optLabel}</span>
                      {description && (
                        <span className="block truncate text-xs text-slate-500">{description}</span>
                      )}
                    </span>
                    {isSelected && (
                      <Icon
                        icon="solar:check-circle-bold"
                        className="h-4 w-4 shrink-0 text-accent-600 dark:text-accent-400"
                      />
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer with result count + keyboard hint */}
          {!isLoading && options.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
              <span>
                {totalCount} {totalCount === 1 ? "result" : "results"}
                {debouncedSearchTerm ? ` for "${debouncedSearchTerm}"` : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-slate-200 bg-surface-1 px-1 font-mono text-[10px] dark:border-slate-700">
                  ↑↓
                </kbd>
                navigate
                <kbd className="ml-1 rounded border border-slate-200 bg-surface-1 px-1 font-mono text-[10px] dark:border-slate-700">
                  ↵
                </kbd>
                select
              </span>
            </div>
          )}
        </div>
      </details>

      {isInvalid && errorMessage && (
        <p className="text-xs text-state-danger" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

import { useEffect, useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";
import { initialsOf } from "@/lib/initials";
import { cn } from "@/lib/utils";

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

const optionId = <TOption extends Record<string, unknown>>(
  option: TOption,
  optionsKey: keyof TOption,
) => String(option[optionsKey] ?? "");

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
  const anchor = useComboboxAnchor();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, debounceMs);

  useEffect(() => {
    if (dependencies !== undefined) setSearchTerm("");
  }, [dependencies]);

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: [queryKeyBase, debouncedSearchTerm, dependencies, limit],
    queryFn: async () => {
      const result = await sourceData({
        search: debouncedSearchTerm,
        limit,
        dependencies,
      });
      return normalizeSourceResult<TOption>(result);
    },
    staleTime: 30_000,
    gcTime: 300_000,
  });

  const isLoading = propIsLoading ?? queryLoading;
  const options = useMemo(() => {
    const raw = data ?? [];
    const seen = new Set<string>();
    const unique: TOption[] = [];
    for (const opt of raw) {
      const id = optionId(opt, optionsKey);
      if (!seen.has(id)) {
        seen.add(id);
        unique.push(opt);
      }
    }
    return unique;
  }, [data, optionsKey]);

  const renderLabel = (option: TOption) =>
    getOptionLabel
      ? getOptionLabel(option)
      : getDefaultLabel(option, optionsKey);

  const renderInitial = (option: TOption) => {
    if (getOptionInitial) return getOptionInitial(option);
    return initialsOf(renderLabel(option));
  };

  const selectedSingle = useMemo(() => {
    if (multiple || !value || Array.isArray(value) || value === "") return null;
    if (selectedOption && optionId(selectedOption, optionsKey) === value) {
      return selectedOption;
    }
    return options.find((o) => optionId(o, optionsKey) === value) ?? null;
  }, [multiple, options, optionsKey, selectedOption, value]);

  const selectedMultiple = useMemo(() => {
    if (!multiple) return [] as TOption[];
    const ids = Array.isArray(value) ? value : value ? [value] : [];
    return ids
      .map(
        (id) =>
          options.find((o) => optionId(o, optionsKey) === id) ??
          ({ [optionsKey]: id } as TOption),
      )
      .filter(Boolean);
  }, [multiple, options, optionsKey, value]);

  const items = useMemo(() => {
    if (multiple) {
      const map = new Map<string, TOption>();
      for (const opt of selectedMultiple) map.set(optionId(opt, optionsKey), opt);
      for (const opt of options) map.set(optionId(opt, optionsKey), opt);
      return Array.from(map.values());
    }
    if (selectedSingle) {
      const exists = options.some(
        (o) => optionId(o, optionsKey) === optionId(selectedSingle, optionsKey),
      );
      return exists ? options : [selectedSingle, ...options];
    }
    return options;
  }, [multiple, options, optionsKey, selectedMultiple, selectedSingle]);

  const fieldLabel = ariaLabel ?? label;

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
      {label ? (
        <label htmlFor={autoId} className="text-sm font-medium">
          {label}
          {isRequired ? <span className="text-destructive">*</span> : null}
        </label>
      ) : null}

      {multiple ? (
        <Combobox
          multiple
          autoHighlight
          items={items}
          value={selectedMultiple}
          onValueChange={(next) => {
            const list = (next ?? []) as TOption[];
            onChange(list.map((item) => optionId(item, optionsKey)));
          }}
          onInputValueChange={(next) => setSearchTerm(next)}
          itemToStringLabel={(item) => renderLabel(item as TOption)}
          itemToStringValue={(item) => optionId(item as TOption, optionsKey)}
          isItemEqualToValue={(a, b) =>
            optionId(a as TOption, optionsKey) === optionId(b as TOption, optionsKey)
          }
          filter={null}
          disabled={isDisabled}
        >
          <ComboboxChips
            ref={anchor}
            className={cn(
              "min-h-9 w-full",
              isInvalid && "border-destructive ring-2 ring-destructive/20",
            )}
            aria-invalid={isInvalid || undefined}
            aria-label={fieldLabel}
          >
            <ComboboxValue>
              {(values: TOption[]) => (
                <>
                  {values.map((item) => (
                    <ComboboxChip key={optionId(item, optionsKey)}>
                      {renderLabel(item)}
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput
                    id={autoId}
                    placeholder={selectedMultiple.length ? undefined : placeholder}
                    disabled={isDisabled}
                  />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={anchor} className="min-w-(--anchor-width)">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-2 py-6 text-xs text-muted-foreground">
                <Spinner className="size-4 text-primary" />
                {loadingLabel}
              </div>
            ) : (
              <>
                <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
                <ComboboxList>
                  {(item: TOption) => {
                    const description = getOptionDescription?.(item);
                    return (
                      <ComboboxItem
                        key={optionId(item, optionsKey)}
                        value={item}
                        className="min-h-9"
                      >
                        <span
                          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary"
                          aria-hidden
                        >
                          {renderInitial(item)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{renderLabel(item)}</span>
                          {description ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {description}
                            </span>
                          ) : null}
                        </span>
                      </ComboboxItem>
                    );
                  }}
                </ComboboxList>
              </>
            )}
          </ComboboxContent>
        </Combobox>
      ) : (
        <Combobox
          autoHighlight
          items={items}
          value={selectedSingle}
          onValueChange={(next) => {
            if (!next) {
              onChange("");
              setSearchTerm("");
              return;
            }
            onChange(optionId(next as TOption, optionsKey));
            setSearchTerm("");
          }}
          onInputValueChange={(next) => setSearchTerm(next)}
          itemToStringLabel={(item) => renderLabel(item as TOption)}
          itemToStringValue={(item) => optionId(item as TOption, optionsKey)}
          isItemEqualToValue={(a, b) =>
            optionId(a as TOption, optionsKey) === optionId(b as TOption, optionsKey)
          }
          filter={null}
          disabled={isDisabled}
        >
          <ComboboxInput
            id={autoId}
            placeholder={placeholder}
            disabled={isDisabled}
            showClear={Boolean(selectedSingle) && !isDisabled}
            aria-label={fieldLabel}
            aria-invalid={isInvalid || undefined}
            className={cn(
              "w-full min-w-0",
              "**:data-[slot=input-group]:h-9",
              isInvalid &&
                "**:data-[slot=input-group]:border-destructive **:data-[slot=input-group]:ring-2 **:data-[slot=input-group]:ring-destructive/20",
            )}
          />
          <ComboboxContent className="min-w-(--anchor-width)">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-2 py-6 text-xs text-muted-foreground">
                <Spinner className="size-4 text-primary" />
                {loadingLabel}
              </div>
            ) : (
              <>
                <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
                <ComboboxList>
                  {(item: TOption) => {
                    const description = getOptionDescription?.(item);
                    return (
                      <ComboboxItem
                        key={optionId(item, optionsKey)}
                        value={item}
                        className="min-h-9"
                      >
                        <span
                          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary"
                          aria-hidden
                        >
                          {renderInitial(item)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{renderLabel(item)}</span>
                          {description ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {description}
                            </span>
                          ) : null}
                        </span>
                      </ComboboxItem>
                    );
                  }}
                </ComboboxList>
              </>
            )}
          </ComboboxContent>
        </Combobox>
      )}

      <span className="sr-only">{searchPlaceholder}</span>

      {/* Machine-readable options for AiAssistant / admin page scrapers */}
      <div className="hidden" data-ai-select-options={queryKeyBase} aria-hidden="true">
        {JSON.stringify(
          options.map((option) => ({
            id: optionId(option, optionsKey),
            label: renderLabel(option),
          })),
        )}
      </div>

      {isInvalid && errorMessage ? (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};

import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useIntl } from "react-intl";

import { FormDatePicker } from "@/components/FormDatePicker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpcClient } from "../../lib/trpc";

export interface ReportFilterValue {
  dateFrom?: string;
  dateTo?: string;
  regionId?: string;
  areaId?: string;
  customerId?: string;
  outletId?: string;
  salesmanId?: string;
  skuId?: string;
}

interface ReportFiltersProps {
  value: ReportFilterValue;
  onChange: (value: ReportFilterValue) => void;
  /** Which geo selects to show. Defaults to all. */
  show?: Array<"region" | "area" | "customer" | "outlet" | "salesman" | "sku">;
}

const ALL = "__all__";

const useOptions = (
  queryKey: string[],
  queryFn: () => Promise<{ data: { id: string; name: string | null }[] }>,
  enabled = true,
) => {
  const { data } = useQuery({ queryKey, queryFn, staleTime: 60_000, enabled });
  return (data?.data ?? []).map((o) => ({
    value: o.id,
    label: o.name ?? o.id,
  }));
};

interface FilterSelectProps {
  label: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string | undefined) => void;
}

const FilterSelect = ({ label, value, options, onChange }: FilterSelectProps) => (
  <div className="flex min-w-40 flex-1 basis-40 flex-col gap-1.5">
    <span className="text-sm font-medium">{label}</span>
    <Select
      value={value ?? ALL}
      onValueChange={(next) => onChange(next === ALL ? undefined : next)}
    >
      <SelectTrigger className="h-9 w-full" size="default" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export const ReportFilters = ({
  value,
  onChange,
  show = ["region", "area", "customer", "outlet", "salesman", "sku"],
}: ReportFiltersProps) => {
  const intl = useIntl();

  const regions = useOptions(["report", "regions"], () =>
    trpcClient.region.list.query({ page: 1, limit: 100 }),
  );
  const areas = useOptions(["report", "areas"], () =>
    trpcClient.area.list.query({ page: 1, limit: 100 }),
  );
  const customers = useOptions(["report", "customers"], () =>
    trpcClient.customer.list.query({ page: 1, limit: 100 }),
  );
  const outlets = useOptions(["report", "outlets"], () =>
    trpcClient.outlet.list.query({ page: 1, limit: 100 }),
  );
  const salesmen = useOptions(
    ["report", "salesmen"],
    () => trpcClient.user.list.query({ page: 1, limit: 100 }),
    show.includes("salesman"),
  );
  const skus = useOptions(
    ["report", "skus"],
    () => trpcClient.sku.list.query({ page: 1, limit: 100 }),
    show.includes("sku"),
  );

  const set = (patch: Partial<ReportFilterValue>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="min-w-40 flex-1 basis-40">
        <FormDatePicker
          label={intl.formatMessage({
            id: "report.filter.date_from",
            defaultMessage: "From",
          })}
          value={value.dateFrom}
          onChange={(v) => set({ dateFrom: v || undefined })}
        />
      </div>
      <div className="min-w-40 flex-1 basis-40">
        <FormDatePicker
          label={intl.formatMessage({
            id: "report.filter.date_to",
            defaultMessage: "To",
          })}
          value={value.dateTo}
          onChange={(v) => set({ dateTo: v || undefined })}
        />
      </div>
      {show.includes("region") && (
        <FilterSelect
          label={intl.formatMessage({
            id: "report.filter.region",
            defaultMessage: "Region",
          })}
          value={value.regionId}
          options={regions}
          onChange={(regionId) =>
            set({
              regionId,
              areaId: undefined,
              outletId: undefined,
              customerId: undefined,
            })
          }
        />
      )}
      {show.includes("area") && (
        <FilterSelect
          label={intl.formatMessage({
            id: "report.filter.area",
            defaultMessage: "Area",
          })}
          value={value.areaId}
          options={areas}
          onChange={(areaId) =>
            set({
              areaId,
              outletId: undefined,
              customerId: undefined,
            })
          }
        />
      )}
      {show.includes("customer") && (
        <FilterSelect
          label={intl.formatMessage({
            id: "report.filter.customer",
            defaultMessage: "Customer",
          })}
          value={value.customerId}
          options={customers}
          onChange={(customerId) => set({ customerId })}
        />
      )}
      {show.includes("outlet") && (
        <FilterSelect
          label={intl.formatMessage({
            id: "report.filter.outlet",
            defaultMessage: "Outlet",
          })}
          value={value.outletId}
          options={outlets}
          onChange={(outletId) => set({ outletId })}
        />
      )}
      {show.includes("salesman") && (
        <FilterSelect
          label={intl.formatMessage({
            id: "report.filter.salesman",
            defaultMessage: "Salesman",
          })}
          value={value.salesmanId}
          options={salesmen}
          onChange={(salesmanId) => set({ salesmanId })}
        />
      )}
      {show.includes("sku") && (
        <FilterSelect
          label={intl.formatMessage({
            id: "report.filter.sku",
            defaultMessage: "Product",
          })}
          value={value.skuId}
          options={skus}
          onChange={(skuId) => set({ skuId })}
        />
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0"
        onClick={() => onChange({})}
      >
        <RotateCcw className="size-4" aria-hidden />
        {intl.formatMessage({
          id: "report.filter.reset",
          defaultMessage: "Reset",
        })}
      </Button>
    </div>
  );
};

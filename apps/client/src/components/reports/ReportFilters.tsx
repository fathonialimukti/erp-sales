import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useIntl } from "react-intl";

import { Button } from "@/components/ui/button";
import { FormDatePicker, Select } from "../../ui";
import type { SelectOption } from "../../ui/Select";
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

const useOptions = (
  queryKey: string[],
  queryFn: () => Promise<{ data: { id: string; name: string | null }[] }>,
  enabled = true,
) => {
  const { data } = useQuery({ queryKey, queryFn, staleTime: 60_000, enabled });
  return (data?.data ?? []).map<SelectOption>((o) => ({
    value: o.id,
    label: o.name ?? o.id,
  }));
};

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
      <div className="min-w-[10rem] flex-1 basis-40">
        <FormDatePicker
          label={intl.formatMessage({
            id: "report.filter.date_from",
            defaultMessage: "From",
          })}
          value={value.dateFrom}
          onChange={(v) => set({ dateFrom: v || undefined })}
        />
      </div>
      <div className="min-w-[10rem] flex-1 basis-40">
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
        <div className="min-w-[10rem] flex-1 basis-40">
          <Select
            ariaLabel={intl.formatMessage({
              id: "report.filter.region",
              defaultMessage: "Region",
            })}
            placeholder={intl.formatMessage({
              id: "report.filter.region",
              defaultMessage: "Region",
            })}
            options={regions}
            value={value.regionId}
            onChange={(v) =>
              set({
                regionId: (v as string) || undefined,
                areaId: undefined,
                outletId: undefined,
                customerId: undefined,
              })
            }
          />
        </div>
      )}
      {show.includes("area") && (
        <div className="min-w-[10rem] flex-1 basis-40">
          <Select
            ariaLabel={intl.formatMessage({
              id: "report.filter.area",
              defaultMessage: "Area",
            })}
            placeholder={intl.formatMessage({
              id: "report.filter.area",
              defaultMessage: "Area",
            })}
            options={areas}
            value={value.areaId}
            onChange={(v) =>
              set({
                areaId: (v as string) || undefined,
                outletId: undefined,
                customerId: undefined,
              })
            }
          />
        </div>
      )}
      {show.includes("customer") && (
        <div className="min-w-[10rem] flex-1 basis-40">
          <Select
            ariaLabel={intl.formatMessage({
              id: "report.filter.customer",
              defaultMessage: "Customer",
            })}
            placeholder={intl.formatMessage({
              id: "report.filter.customer",
              defaultMessage: "Customer",
            })}
            options={customers}
            value={value.customerId}
            onChange={(v) => set({ customerId: (v as string) || undefined })}
          />
        </div>
      )}
      {show.includes("outlet") && (
        <div className="min-w-[10rem] flex-1 basis-40">
          <Select
            ariaLabel={intl.formatMessage({
              id: "report.filter.outlet",
              defaultMessage: "Outlet",
            })}
            placeholder={intl.formatMessage({
              id: "report.filter.outlet",
              defaultMessage: "Outlet",
            })}
            options={outlets}
            value={value.outletId}
            onChange={(v) => set({ outletId: (v as string) || undefined })}
          />
        </div>
      )}
      {show.includes("salesman") && (
        <div className="min-w-[10rem] flex-1 basis-40">
          <Select
            ariaLabel={intl.formatMessage({
              id: "report.filter.salesman",
              defaultMessage: "Salesman",
            })}
            placeholder={intl.formatMessage({
              id: "report.filter.salesman",
              defaultMessage: "Salesman",
            })}
            options={salesmen}
            value={value.salesmanId}
            onChange={(v) => set({ salesmanId: (v as string) || undefined })}
          />
        </div>
      )}
      {show.includes("sku") && (
        <div className="min-w-[10rem] flex-1 basis-40">
          <Select
            ariaLabel={intl.formatMessage({
              id: "report.filter.sku",
              defaultMessage: "Product",
            })}
            placeholder={intl.formatMessage({
              id: "report.filter.sku",
              defaultMessage: "Product",
            })}
            options={skus}
            value={value.skuId}
            onChange={(v) => set({ skuId: (v as string) || undefined })}
          />
        </div>
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

import { useQuery } from "@tanstack/react-query";
import { trpcClient } from "../lib/trpc";

export interface GeneralSettings {
  currencyCode: string;
  currencySymbol: string;
  fiscalYearStartMonth: number;
  defaultPageSize: number;
  multimodalEnabled: boolean;
}

const DEFAULTS: GeneralSettings = {
  currencyCode: "USD",
  currencySymbol: "$",
  fiscalYearStartMonth: 1,
  defaultPageSize: 10,
  multimodalEnabled: false,
};

/**
 * Non-sensitive app display settings (currency, fiscal year, page size).
 * Permission-free on the server (`settings.public`) so any authenticated user
 * can read them for formatting. Cached 5 min — these rarely change.
 */
export const useGeneralSettings = (): GeneralSettings => {
  const { data } = useQuery({
    queryKey: ["generalSettings"],
    queryFn: () => trpcClient.settings.public.query(),
    staleTime: 300_000,
  });
  if (!data) return DEFAULTS;
  return {
    currencyCode: data.currencyCode ?? DEFAULTS.currencyCode,
    currencySymbol: data.currencySymbol ?? DEFAULTS.currencySymbol,
    fiscalYearStartMonth: data.fiscalYearStartMonth ?? DEFAULTS.fiscalYearStartMonth,
    defaultPageSize: data.defaultPageSize ?? DEFAULTS.defaultPageSize,
    multimodalEnabled: data?.multimodalEnabled ?? DEFAULTS.multimodalEnabled,
  };
};

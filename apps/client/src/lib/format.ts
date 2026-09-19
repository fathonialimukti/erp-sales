import type { IntlShape } from "react-intl";

const LOCALE_BY_CURRENCY: Record<string, string> = {
  USD: "en-US",
  IDR: "id-ID",
  PHP: "en-PH",
  SGD: "en-SG",
  MYR: "ms-MY",
};

/** Map an ISO 4217 currency code to a BCP-47 locale for Intl formatting. */
export function localeForCurrency(code: string): string {
  return LOCALE_BY_CURRENCY[code] ?? "en-US";
}

/** Format a number as currency using the given ISO 4217 code. */
export function formatCurrency(
  value: number,
  currencyCode: string,
  locale?: string,
): string {
  return new Intl.NumberFormat(locale ?? localeForCurrency(currencyCode), {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Pack size of a SKU as the rep reads it: `20 pcs/carton`, or `per piece` when
 * the SKU is piece-only (packSize === 1 — the escape hatch, SPEC §Data model).
 * A missing value reads as 1: legacy rows backfill to piece-only.
 */
export function packSizeLabel(
  intl: IntlShape,
  packSize: number | null | undefined,
): string {
  const size = Number.isFinite(Number(packSize)) && Number(packSize) >= 1
    ? Math.floor(Number(packSize))
    : 1;
  return size > 1
    ? intl.formatMessage(
        { id: "sku.pack_size_per_carton", defaultMessage: "{n} pcs/carton" },
        { n: size },
      )
    : intl.formatMessage({
        id: "sku.pack_size_per_piece",
        defaultMessage: "per piece",
      });
}

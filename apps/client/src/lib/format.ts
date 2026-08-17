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

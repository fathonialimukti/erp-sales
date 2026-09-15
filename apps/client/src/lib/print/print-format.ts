/**
 * Pure shared formatters for the client-side document-print foundation
 * (docs/plans/client-pdf-documents; lifted from the Action Program and
 * Event Proposal print sheets before the 3rd consumer — visit report —
 * lands, per docs/plans/visit-report-pdf V-T1).
 *
 * Rules for this module:
 *  - PURE functions only: no React, no DOM, no tRPC, no `@/` aliases
 *    (relative imports keep a config-less root vitest run importable —
 *    same rationale as pages/budget/budget-export.ts).
 *  - Behavior-preserving lift: each helper is copied verbatim from the
 *    sheets it served, so both sheets render byte-identical output
 *    through these.
 *  - Only the GENUINELY duplicated helpers live here. The calendar-date
 *    formatters deliberately stay in their sheets: the Action Program
 *    formats period fields (real instants) in local time while the Event
 *    Proposal formats `@db.Date` columns (date-only semantics) in UTC —
 *    unifying them would change one sheet's printed dates.
 */

/**
 * Prisma Decimal arrives over tRPC as a number-like wire value — coerce
 * once, defensively (Decimal instance, string, or number all work).
 */
export const toNum = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Currency digits convention: IDR has no minor unit, every other currency uses 2. */
export const currencyDigits = (currency: string): number =>
  currency === "IDR" ? 0 : 2;

/**
 * Document money: id-ID for IDR (no minor digits), en-US with 2 decimals
 * for every other currency. `unknown` value so Prisma Decimal wire shapes
 * (number / string / Decimal-like) flow straight through.
 */
export const formatDocumentMoney = (value: unknown, currency: string): string =>
  new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currencyDigits(currency),
  }).format(toNum(value));

/** Title Case for raw enum fallbacks ("AI_VALIDATED" → "Ai Validated"). */
export const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

/**
 * Printed-on timestamp (real instant → local time), en-GB long form.
 * NOT for date-only calendar columns — those keep their sheet-local
 * formatter (see the UTC note above).
 */
export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

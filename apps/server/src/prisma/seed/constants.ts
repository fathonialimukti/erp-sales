// =============================================
// LUZON FOODS CORP. — PHILIPPINES SEEDER CONSTANTS
// =============================================
// Deterministic, research-grounded constants for the Metro Manila
// direct-store-delivery (DSD) case study. No faker, no randomness.

export const COMPANY_NAME = "Luzon Foods Corp.";
export const COUNTRY = "PH";
export const CURRENCY = "PHP";
export const PH_VAT_PERCENT = 12;

/** Fixed FX anchor used only for display-neutral bookkeeping (not rendered). */
export const PHP_TO_IDR = 1757;

/** Seeder run window: 12 months of history ending "today". */
export const HISTORY_MONTHS = 12;

/** Document number counters (per-run, deterministic). */
export const DOC_COUNTERS: { salesOrder: number; actionProgram: number; eventProposal: number } = {
  salesOrder: 0,
  actionProgram: 0,
  eventProposal: 0,
};

export function nextSalesOrderNumber(date: Date): string {
  DOC_COUNTERS.salesOrder += 1;
  const year = date.getFullYear();
  return `SO-PH-${year}-${String(DOC_COUNTERS.salesOrder).padStart(4, "0")}`;
}

export function nextActionProgramNumber(): string {
  DOC_COUNTERS.actionProgram += 1;
  return `AP-PH-${String(DOC_COUNTERS.actionProgram).padStart(4, "0")}`;
}

export function nextEventProposalNumber(): string {
  DOC_COUNTERS.eventProposal += 1;
  return `EP-PH-${String(DOC_COUNTERS.eventProposal).padStart(4, "0")}`;
}

// =============================================
// CHANNEL TIERS (real PH trade structure)
// =============================================

export type ChannelTier = "SARI_SARI" | "MODERN" | "CONVENIENCE";

export const CHANNEL = {
  SARI_SARI: "SARI_SARI",
  MODERN: "MODERN",
  CONVENIENCE: "CONVENIENCE",
} as const satisfies Record<string, ChannelTier>;

/** Typical trade discount off list price, by channel (real-world ranges). */
export const CHANNEL_DISCOUNT_PCT: Record<ChannelTier, number> = {
  SARI_SARI: 8, // sari-sari ~10% retail markup → ~8% trade discount
  MODERN: 15, // chains negotiate 10–20%
  CONVENIENCE: 12,
};

/** Payment terms by channel (sari-sari = COD/NET7, chains = NET14/NET30). */
export const CHANNEL_PAYMENT_TERMS: Record<ChannelTier, string[]> = {
  SARI_SARI: ["COD", "NET7"],
  MODERN: ["NET14", "NET30"],
  CONVENIENCE: ["NET7", "NET14"],
};

/** Visit cadence per month by channel (sari-sari weekly, chains bi-weekly). */
export const CHANNEL_VISITS_PER_MONTH: Record<ChannelTier, number> = {
  SARI_SARI: 4,
  MODERN: 2,
  CONVENIENCE: 3,
};

/** Order conversion rate per visit, by channel. */
export const CHANNEL_ORDER_CONVERSION: Record<ChannelTier, number> = {
  SARI_SARI: 0.6,
  MODERN: 0.85,
  CONVENIENCE: 0.7,
};

// =============================================
// SEASONALITY (real PH demand drivers)
// =============================================

/**
 * Monthly demand multiplier vs baseline.
 * - Nov–Dec: Christmas + 13th-month pay peak (+40%)
 * - May–Jun: school season (+15%)
 * - Aug: typhoon season dip (−10%)
 */
export const MONTH_SEASONALITY: Record<number, number> = {
  1: 0.95, // Jan — post-holiday lull
  2: 0.9, // Feb
  3: 1.0, // Mar
  4: 1.05, // Apr — summer heat (beverages)
  5: 1.15, // May — school season
  6: 1.15, // Jun — school season
  7: 1.0, // Jul
  8: 0.9, // Aug — typhoon season
  9: 0.95, // Sep
  10: 1.05, // Oct — pre-Christmas build
  11: 1.4, // Nov — Christmas peak
  12: 1.4, // Dec — Christmas peak
};

// =============================================
// PAYMENT METHODS (real PH rails)
// =============================================

export const PAYMENT_METHODS = [
  "GCash",
  "Maya",
  "BDO Bank Transfer",
  "Metrobank Transfer",
  "Cash on Delivery",
] as const;

// =============================================
// DISPLAY RENTAL TYPES (real POS display mechanics)
// =============================================

export const DISPLAY_TYPES = [
  "COOLER", // branded cooler placement (CCBPI-style)
  "ENDCAP", // end-of-aisle display
  "FSDU", // free-standing display unit
  "CDU", // counter display unit
  "SHELF", // shelf edging / facing expansion
] as const;

export type DisplayType = (typeof DISPLAY_TYPES)[number];

/** Monthly rental rate in PHP by display type (realistic PH market rates). */
export const DISPLAY_RENTAL_PER_MONTH: Record<DisplayType, number> = {
  COOLER: 1500,
  ENDCAP: 25000,
  FSDU: 18000,
  CDU: 8000,
  SHELF: 5000,
};
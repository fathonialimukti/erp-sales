/**
 * Print ink palette — single color source for every printed surface
 * (server PDF letterhead today, client print sheets per Tasks 2–3).
 *
 * Canonical hex values are derived from the light-mode OKLCH tokens in
 * `apps/client/src/index.css` (the source of truth named by
 * `docs/design-system/DESIGN.md`). Hardcoding hex is correct for print ink:
 * a PDF has no CSS runtime, and live CSS variables would leak dark-mode
 * values onto paper.
 */

// --- Ink (text / hairlines) ---
/** Body & heading text — `--foreground` oklch(0.16 0.02 260). */
export const PRINT_INK = '#080D16';
/** Secondary/meta text — `--muted-foreground` oklch(0.34 0.10 242.749), deepened Aurora Azure. */
export const PRINT_MUTED = '#003B67';
/** Hairlines & dividers — `--border` oklch(0.9 0.015 242). */
export const PRINT_BORDER = '#D6DFE7';
/** Paper white. */
export const PRINT_PAPER = '#FFFFFF';

// --- Brand ---
/** Aurora Azure — `--primary` oklch(0.5 0.13 242.749). */
export const PRINT_PRIMARY = '#0069A6';

// --- Semantic status colors (design law §2) ---
/** Approved / positive — `--success` oklch(0.62 0.2 160). */
export const PRINT_SUCCESS = '#00A859';
/** Caution — `--warning` oklch(0.75 0.18 75). */
export const PRINT_WARNING = '#EF9900';
/** Rejected / destructive — `--destructive` oklch(0.577 0.245 27.325). */
export const PRINT_DESTRUCTIVE = '#E7000B';

// --- Soft washes (color-mix X% over white paper) for status plates ---
/** Neutral plate (Draft) — 50% PRINT_BORDER over white. */
export const PRINT_WASH_NEUTRAL = '#EAEFF3';
/** Even quieter neutral — 50% PRINT_WASH_NEUTRAL over white (table stripes, guard rows). */
export const PRINT_WASH_SOFT = '#F4F7F9';
/** Primary wash — `bg-primary/10` equivalent. */
export const PRINT_WASH_PRIMARY = '#E6F0F6';
/** Success wash — `bg-success/15` equivalent. */
export const PRINT_WASH_SUCCESS = '#D9F2E6';
/** Destructive wash — `bg-destructive/10` equivalent. */
export const PRINT_WASH_DESTRUCTIVE = '#FDE6E7';

/** Raw approval-status enum → design-law chip colors (always paired with a text label). */
export const PRINT_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
    DRAFT: { bg: PRINT_WASH_NEUTRAL, fg: PRINT_INK },
    AI_VALIDATED: { bg: PRINT_WASH_PRIMARY, fg: PRINT_PRIMARY },
    PROPOSED: { bg: PRINT_WASH_PRIMARY, fg: PRINT_PRIMARY },
    APPROVED: { bg: PRINT_WASH_SUCCESS, fg: PRINT_SUCCESS },
    REJECTED: { bg: PRINT_WASH_DESTRUCTIVE, fg: PRINT_DESTRUCTIVE },
};

/** Chip colors for an approval status with a neutral fallback for unknown values. */
export const printStatusColors = (status: string): { bg: string; fg: string } =>
    PRINT_STATUS_COLORS[status] ?? { bg: PRINT_WASH_NEUTRAL, fg: PRINT_INK };

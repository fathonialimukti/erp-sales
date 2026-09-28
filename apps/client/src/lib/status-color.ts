/**
 * Shared semantic status colors (design law §2 "Semantic classes only",
 * `DESIGN.md:128-131`, `:216`).
 *
 * Every value is a Tailwind semantic token wired to `index.css` — never a raw
 * palette step — so these stay in step with `StatusChip` and re-theme with the
 * light/dark tokens instead of carrying a second green.
 */

/**
 * Warning is the one tone that needs a mode pair. Measured against `--card`:
 * `--warning` (L≈0.75) is 2.24:1 in light mode — unreadable as text — and
 * `--warning-foreground` (L≈0.22) is 1.02:1 on the dark card. The deepened
 * amber carries light mode, `--warning` carries dark.
 */
const WARNING_TEXT_CLASS = "text-warning-foreground dark:text-warning";

/** Soft wash + bold semantic tone, for icon plates. Mirrors the StatusChip map. */
export const TONE_PLATE_CLASS = {
  info: "bg-primary/12 text-primary",
  warning: `bg-warning/15 ${WARNING_TEXT_CLASS}`,
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/12 text-destructive",
} as const;

/**
 * Money-remaining signalling: overspent is destructive, budget fully spent is a
 * caution, budget left is success. Shared so the budget and budget-line pages
 * cannot drift into four different greens again.
 */
export function getRemainingColor(remaining: number): string {
  if (remaining < 0) return "text-destructive";
  if (remaining === 0) return WARNING_TEXT_CLASS;
  return "text-success";
}

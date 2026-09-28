import { describe, expect, it } from "vitest";

import { getRemainingColor, TONE_PLATE_CLASS } from "../../lib/status-color";

/**
 * Pins the shared money-remaining signalling (lib/status-color.ts) so the
 * budget and budget-line pages cannot drift into four different greens again,
 * and guards the token-only rule: a raw palette step or hex reappearing in
 * these classes is the regression this helper exists to prevent.
 *
 * The warning pair is spelled out here rather than imported: it is module-local
 * in the implementation, and asserting against a literal is the only version of
 * this pin that can actually fail.
 */

const WARNING_PAIR = "text-warning-foreground dark:text-warning";

const RAW_PALETTE = /\b(?:bg|text|border)-(?:sky|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|#[0-9a-fA-F]{3,8}\b/;

describe("getRemainingColor", () => {
  it("signals overspend as destructive", () => {
    expect(getRemainingColor(-1)).toBe("text-destructive");
    expect(getRemainingColor(-0.01)).toBe("text-destructive");
  });

  it("signals a fully spent budget as the mode-safe warning", () => {
    expect(getRemainingColor(0)).toBe(WARNING_PAIR);
  });

  it("signals budget left as success", () => {
    expect(getRemainingColor(1)).toBe("text-success");
    expect(getRemainingColor(1_000_000)).toBe("text-success");
  });

  it("keeps warning readable in both modes", () => {
    // Same guard as before, read off the two public surfaces that carry it.
    expect(getRemainingColor(0)).toContain("text-warning-foreground");
    expect(getRemainingColor(0)).toContain("dark:text-warning");
    expect(TONE_PLATE_CLASS.warning).toContain(WARNING_PAIR);
  });

  it("uses semantic tokens only", () => {
    for (const tone of Object.values(TONE_PLATE_CLASS)) {
      expect(tone).not.toMatch(RAW_PALETTE);
    }
    expect(getRemainingColor(0)).not.toMatch(RAW_PALETTE);
    expect(getRemainingColor(1)).not.toMatch(RAW_PALETTE);
  });
});

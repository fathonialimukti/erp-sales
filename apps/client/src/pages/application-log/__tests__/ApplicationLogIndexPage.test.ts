import { describe, expect, it } from "vitest";

import {
  APPLICATION_LOG_LEVEL_BADGE,
  APPLICATION_LOG_LEVELS,
} from "../ApplicationLogIndexPage";

describe("ApplicationLogIndexPage level metadata", () => {
  it("covers every contract level (info, warn, error, debug)", () => {
    expect([...APPLICATION_LOG_LEVELS].sort()).toEqual([
      "debug",
      "error",
      "info",
      "warn",
    ]);
  });

  it("provides a badge entry with icon and label for every level", () => {
    for (const level of APPLICATION_LOG_LEVELS) {
      const badge = APPLICATION_LOG_LEVEL_BADGE[level];
      expect(badge).toBeDefined();
      expect(badge.icon).toBeDefined();
      expect(badge.labelId).toBe(`applicationLog.level.${level}`);
    }
  });

  it("maps error to the destructive plate and debug to the neutral plate", () => {
    expect(APPLICATION_LOG_LEVEL_BADGE.error.variant).toBe("outline");
    expect(APPLICATION_LOG_LEVEL_BADGE.error.className).toContain("destructive");
    expect(APPLICATION_LOG_LEVEL_BADGE.debug.className).toContain("bg-muted");
  });
});

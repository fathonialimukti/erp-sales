import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { plates, type PlateName } from "@/assets/plates";
import { NAV_MENU } from "@/constants/nav-menu";

const ICONS_DIR = resolve(import.meta.dirname, "../assets/icons");

/**
 * The plate system replaced ~122 individually-loaded icon files, so these
 * guard the invariants that motivated it:
 *  - art stays solid (no gradient can creep back in)
 *  - fills are token-driven, so light/dark actually apply
 *  - the registry and the folder agree (no orphaned or phantom plates)
 */
describe("module plates", () => {
  const files = readdirSync(ICONS_DIR).filter((f) => f.endsWith(".svg"));

  it("has no gradients anywhere in the plate sources", () => {
    const offenders = files.filter((f) =>
      /<(linear|radial)Gradient\b|<filter\b|<mask\b/.test(
        readFileSync(resolve(ICONS_DIR, f), "utf8"),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("gives every plate a token fill rather than a baked colour", () => {
    for (const f of files) {
      const svg = readFileSync(resolve(ICONS_DIR, f), "utf8");
      const tile = svg.match(/<rect[^>]*fill="([^"]+)"/)?.[1];
      expect(tile, `${f} has no filled tile rect`).toBeDefined();
      expect(tile, `${f} tile must use a CSS variable`).toMatch(/^var\(--/);
    }
  });

  it("keeps the registry in sync with the icons folder", () => {
    const names = files.map((f) => f.replace(/\.svg$/, ""));
    // kebab-case file -> camelCase registry key
    const keys = names.map((n) =>
      n.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()),
    );
    expect(Object.keys(plates).sort()).toEqual(keys.sort());
  });

  it("renders a plate inline so CSS variables reach the fill", () => {
    const { container } = render(<plates.navCustomer size={32} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("width")).toBe("32");
    // inline, not an <img> — this is the whole point of the ?raw approach
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).toContain("var(--module-customer");
  });

  it("marks plates decorative for screen readers", () => {
    const { container } = render(<plates.navDashboard />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("defaults to the solid variant so KPI slots keep the colour signal", () => {
    const { container } = render(<plates.dashOrders />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("data-variant")).toBe("solid");
    expect(svg?.getAttribute("style") ?? "").not.toContain("--plate-alpha");
  });

  it("washes the tile and inks the glyph in module colour for the sidebar", () => {
    const { container } = render(
      <plates.navCustomer variant="wash" module="customer" />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("data-variant")).toBe("wash");
    const style = svg?.getAttribute("style") ?? "";
    expect(style).toContain("--plate-alpha: 0.14");
    expect(style).toContain("--plate-ink: var(--module-customer)");
    // the solid variant's near-black knock-out would vanish on a coloured glyph
    expect(style).toContain("--plate-detail: var(--primary-foreground)");
  });

  it("only references plates that exist", () => {
    const declared = new Set(Object.keys(plates));
    const refs: string[] = [];
    const walk = (items: typeof NAV_MENU) => {
      for (const item of items) {
        if (item.icon) refs.push(item.icon);
        if (item.children) walk(item.children);
      }
    };
    walk(NAV_MENU);
    for (const r of refs) expect(declared.has(r), `unknown plate "${r}"`).toBe(true);
  });
});

describe("PlateName", () => {
  it("is a union of real registry keys", () => {
    const key: PlateName = "navCustomer";
    expect(key in plates).toBe(true);
  });
});
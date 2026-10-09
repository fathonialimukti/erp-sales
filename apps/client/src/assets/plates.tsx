/**
 * Module plate system.
 *
 * Each plate is a solid `--module-*` tile carrying one bold glyph, drawn in the
 * same iOS idiom: flat rounded-square, no gradient, no shine, no opacity
 * layering. Plates are authored as standalone `.svg` files in ./icons so they
 * stay editable (and viewable) outside the app, and are inlined here rather
 * than loaded through `<img>`.
 *
 * Why inline matters: an `<img>`-embedded SVG is an isolated document, so it
 * cannot see the host page's CSS variables — a `var(--module-customer)` or
 * `currentColor` inside it silently resolves to black. Importing the file as a
 * raw string and injecting the markup keeps the artwork in the document tree,
 * where the tokens (and light/dark switching) actually work.
 *
 * Fills are authored as `var(--module-x, #hex)` so each file also renders
 * correctly when opened directly in a browser or editor preview.
 */
import { forwardRef, type CSSProperties, type SVGProps } from "react";

import { moduleCssVar } from "@/types/module";

/** Strip the XML prolog/comments that are invalid inside a nested <svg>. */
function body(raw: string): string {
  return raw
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[\s\S]*?<svg[^>]*>/, (_m, open: string) => open)
    .replace(/<\/svg>\s*$/, "");
}

export interface PlateProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** CSS length; plates are square. Defaults to `1em` so they track text. */
  size?: number | string;
  /** Extra class merged onto the root <svg>. */
  className?: string;
  /**
   * `solid` (default) — opaque module tile, white glyph. For KPI / hero slots
   * and generic page headers, where the plate is the colour signal.
   *
   * `wash` — 14% module tile with the glyph in solid module colour. For the
   * sidebar, where 27 solid tiles stacked vertically out-shout the labels and
   * fight the row's own active wash. This is the frozen nav wash recipe in
   * DESIGN.md §2.
   *
   * `wash` needs a `module` so it can point `--plate-ink` at the right token.
   */
  variant?: "solid" | "wash";
  /** Module key for the `wash` variant, e.g. "customer". */
  module?: string;
}

/** Nav wash strength — matches the frozen DESIGN.md recipe. */
const NAV_WASH_ALPHA = "0.14";

function washVars(module?: string): CSSProperties {
  return {
    // tile: the plate's own module colour at 14% over the sidebar surface
    "--plate-alpha": NAV_WASH_ALPHA,
    // glyph: full-strength module colour, so it stays legible on the pale tile
    "--plate-ink": module ? moduleCssVar(module) : "currentColor",
    // detail marks flip to a light tone — the solid variant's near-black would
    // disappear against a module-coloured glyph
    "--plate-detail": "var(--primary-foreground)",
  } as CSSProperties;
}

/**
 * Build a plate component from a raw SVG source.
 *
 * The root <svg> gets width/height/className from props; the inner markup is
 * trusted build-time source (never user input), so injecting it is safe.
 */
function plate(raw: string) {
  return forwardRef<SVGSVGElement, PlateProps>(function Plate(
    { size = "1em", className, variant = "solid", module, style, ...rest },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 64 64"
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
        className={className}
        data-variant={variant}
        style={{ ...(variant === "wash" ? washVars(module) : null), ...style }}
        {...rest}
        dangerouslySetInnerHTML={{ __html: body(raw) }}
      />
    );
  });
}

/* ── Navigation plates (sidebar) ── */
import navDashboard from "./icons/nav-dashboard.svg?raw";
import navReports from "./icons/nav-reports.svg?raw";
import navRegion from "./icons/nav-region.svg?raw";
import navArea from "./icons/nav-area.svg?raw";
import navCustomer from "./icons/nav-customer.svg?raw";
import navOutlet from "./icons/nav-outlet.svg?raw";
import navSkuCategory from "./icons/nav-sku-category.svg?raw";
import navSku from "./icons/nav-sku.svg?raw";
import navSalesOrder from "./icons/nav-sales-order.svg?raw";
import navEmailCrm from "./icons/nav-email-crm.svg?raw";
import navVisit from "./icons/nav-visit.svg?raw";
import navPlanning from "./icons/nav-planning.svg?raw";
import navEvent from "./icons/nav-event.svg?raw";
import navUsers from "./icons/nav-users.svg?raw";
import navRoles from "./icons/nav-roles.svg?raw";
import navActivity from "./icons/nav-activity.svg?raw";
import navLogs from "./icons/nav-logs.svg?raw";
import navNotifications from "./icons/nav-notifications.svg?raw";
import navKnowledge from "./icons/nav-knowledge.svg?raw";
import navAi from "./icons/nav-ai.svg?raw";
import navBudget from "./icons/nav-budget.svg?raw";
import navBudgetType from "./icons/nav-budget-type.svg?raw";
import navBudgetPeriod from "./icons/nav-budget-period.svg?raw";
import navBudgetLine from "./icons/nav-budget-line.svg?raw";
import navActionType from "./icons/nav-action-type.svg?raw";
import navEventType from "./icons/nav-event-type.svg?raw";
import navVendor from "./icons/nav-vendor.svg?raw";

/* ── Dashboard / hero plates ── */
import dashOrders from "./icons/dash-orders.svg?raw";
import dashVisits from "./icons/dash-visits.svg?raw";
import dashSun from "./icons/dash-sun.svg?raw";
import dashNewOrder from "./icons/dash-new-order.svg?raw";
import dashNewVisit from "./icons/dash-new-visit.svg?raw";
import dashNewCustomer from "./icons/dash-new-customer.svg?raw";
import dashNewSku from "./icons/dash-new-sku.svg?raw";
import dashNewProgram from "./icons/dash-new-program.svg?raw";
import dashNewEvent from "./icons/dash-new-event.svg?raw";

export const plates = {
  /* Navigation */
  navDashboard: plate(navDashboard),
  navReports: plate(navReports),
  navRegion: plate(navRegion),
  navArea: plate(navArea),
  navCustomer: plate(navCustomer),
  navOutlet: plate(navOutlet),
  navSkuCategory: plate(navSkuCategory),
  navSku: plate(navSku),
  navSalesOrder: plate(navSalesOrder),
  navEmailCrm: plate(navEmailCrm),
  navVisit: plate(navVisit),
  navPlanning: plate(navPlanning),
  navEvent: plate(navEvent),
  navUsers: plate(navUsers),
  navRoles: plate(navRoles),
  navActivity: plate(navActivity),
  navLogs: plate(navLogs),
  navNotifications: plate(navNotifications),
  navKnowledge: plate(navKnowledge),
  navAi: plate(navAi),
  navBudget: plate(navBudget),
  navBudgetType: plate(navBudgetType),
  navBudgetPeriod: plate(navBudgetPeriod),
  navBudgetLine: plate(navBudgetLine),
  navActionType: plate(navActionType),
  navEventType: plate(navEventType),
  navVendor: plate(navVendor),

  /* Dashboard / hero */
  dashOrders: plate(dashOrders),
  dashVisits: plate(dashVisits),
  dashSun: plate(dashSun),
  dashNewOrder: plate(dashNewOrder),
  dashNewVisit: plate(dashNewVisit),
  dashNewCustomer: plate(dashNewCustomer),
  dashNewSku: plate(dashNewSku),
  dashNewProgram: plate(dashNewProgram),
  dashNewEvent: plate(dashNewEvent),
} as const;

export type PlateName = keyof typeof plates;
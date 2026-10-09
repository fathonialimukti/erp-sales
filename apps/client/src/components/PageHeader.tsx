import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useIntl } from "react-intl";
import { motion, useReducedMotion } from "motion/react";

import { plates, type PlateName } from "@/assets/plates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moduleCssVar, type ModuleKey } from "@/types/module";
import { pageEnter, getMotionProps } from "@/lib/motion";

/** Default left plate per module key (solid module tile, see assets/plates). */
const MODULE_PLATE: Record<string, PlateName> = {
  customer: "navCustomer",
  outlet: "navOutlet",
  order: "navSalesOrder",
  visit: "navVisit",
  sku: "navSku",
  skuCategory: "navSkuCategory",
  planning: "navPlanning",
  budget: "navBudget",
  budgetType: "navBudgetType",
  budgetPeriod: "navBudgetPeriod",
  budgetLine: "navBudgetLine",
  actionType: "navActionType",
  eventType: "navEventType",
  event: "navEvent",
  user: "navUsers",
  settings: "navLogs",
  vendor: "navVendor",
  report: "navReports",
  email: "navEmailCrm",
  knowledge: "navKnowledge",
  ai: "navAi",
  // geo master data (pages use these keys even if not in ModuleKey spectrum)
  region: "navRegion",
  area: "navArea",
};

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Module accent — drives a directional gradient module-color fill with white wayfinding chrome. */
  module?: ModuleKey;
  /** Optional eyebrow label above the title (e.g. "Customers", date). */
  eyebrow?: string;
  onBack?: () => void;
  actions?: ReactNode;
  /**
   * Leading icon plate (left of title stack).
   * Defaults from `module` → nav tile. Pass to override; `null` hides.
   */
  icon?: ReactNode | null;
  /** Decorative media — right side, after actions (optional; not default). */
  media?: ReactNode;
  className?: string;
  /**
   * Section progress indicator — renders animated dots below the description.
   * `current` is 1-based. Dots animate in via `pageEnter` preset.
   */
  progress?: {
    current: number;
    total: number;
    label?: string;
  };
}

/**
 * Standard page toolbar.
 * - With `module`: directional gradient module-color band + white-type chrome (strong wayfinding with professional depth).
 * - Without `module`: flat `bg-card` toolbar, black title, 3px primary rail (generic fallback).
 */
export const PageHeader = ({
  title,
  description,
  module,
  eyebrow,
  onBack,
  actions,
  icon,
  media,
  className,
  progress,
}: PageHeaderProps) => {
  const intl = useIntl();
  const reduced = useReducedMotion();
  const accent = moduleCssVar(module);
  const isModuleHeader = Boolean(accent);
  const railColor = accent ?? "var(--primary)";

  // Module header fill: a directional 135deg gradient from the module color
  // (top-left) to a deeper mix of the same hue anchored toward a neutral-dark
  // (L=0.3, chroma 0.2, hue 260) at 72% module / 28% dark. Every module gets a
  // consistent "deeper toward dark" direction preserving its hue identity at the
  // text-bearing top-left region. T10's header-safe tokens (L≈0.45–0.48) keep
  // white text AA-legible over that region; the deeper bottom-right is away
  // from the title/eyebrow, and `text-white/80` on the description still clears
  // AA there.
  const moduleStyle: CSSProperties | undefined = accent
    ? {
        backgroundImage: `linear-gradient(135deg, ${accent}, color-mix(in oklch, ${accent} 72%, oklch(0.3 0.2 260)))`,
      }
    : undefined;

  const modulePlate = module ? MODULE_PLATE[module] : undefined;
  const Plate = modulePlate ? plates[modulePlate] : null;

  /**
   * On a module header the band is already the module colour, so the plate is
   * washed white — a second saturated tile on top of it would be two competing
   * colours (DESIGN.md §2: never a saturated gradient banner inside a band).
   * Generic headers sit on `bg-card`, so the plate keeps its own solid fill.
   */
  const resolvedIcon =
    icon === null ? null : (
      icon ??
      (Plate ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-xl",
            isModuleHeader ? "bg-white/15 p-1" : undefined,
          )}
        >
          <Plate size={isModuleHeader ? 24 : 32} />
        </span>
      ) : null)
    );

  return (
    <header
      className={cn(
        "relative overflow-hidden border-b px-4 py-3.5 shadow-sm sm:px-5 sm:py-4",
        isModuleHeader
          ? // gradient module band — directional fill with white inset rail
            "border-white/15 text-white"
          : // generic flat toolbar — black title, 3px primary left rail
            "border-border bg-card",
        className,
      )}
      style={isModuleHeader ? moduleStyle : undefined}
      data-slot="page-header"
      data-module={module}
    >
      {/* 3px left rail: white inset bar on module headers; primary bar on generic headers */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-0.75",
          isModuleHeader ? "bg-white/40" : undefined,
        )}
        style={isModuleHeader ? undefined : { backgroundColor: railColor }}
      />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onBack}
              className={cn(
                "size-9 shrink-0 hover:bg-accent",
                isModuleHeader
                  ? "text-white hover:bg-white/15"
                  : "text-foreground",
              )}
              aria-label={intl.formatMessage({
                id: "common.action.back",
                defaultMessage: "Back",
              })}
            >
              <ArrowLeft className="size-4" />
            </Button>
          ) : null}

          {resolvedIcon ? (
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-12",
                isModuleHeader
                  ? "bg-white/15 text-white"
                  : "bg-muted text-primary",
              )}
              aria-hidden
            >
              {resolvedIcon}
            </span>
          ) : null}

          <div className="min-w-0 space-y-0.5">
            {eyebrow || module ? (
              <p
                className={cn(
                  "text-xs font-bold uppercase tracking-wide",
                  isModuleHeader
                    ? "text-white/90"
                    : !accent && "text-primary",
                )}
              >
                {eyebrow ?? module}
              </p>
            ) : null}
            <h1
              className={cn(
                "font-heading text-xl font-bold tracking-tight sm:text-2xl",
                isModuleHeader ? "text-white" : "text-foreground",
              )}
            >
              {title}
            </h1>
            {description ? (
              <p
                className={cn(
                  "max-w-xl text-sm sm:text-sm",
                  isModuleHeader
                    ? "text-white/80"
                    : "text-muted-foreground",
                )}
              >
                {description}
              </p>
            ) : null}
            {progress ? (
              <motion.div
                variants={pageEnter}
                {...getMotionProps(reduced)}
                className="flex items-center gap-2 pt-0.5"
              >
                <span className="flex items-center gap-1.5" role="presentation">
                  {Array.from({ length: progress.total }).map((_, i) => {
                    const isCompleted = i < progress.current - 1;
                    const isCurrent = i === progress.current - 1;
                    return (
                      <span
                        key={i}
                        aria-hidden
                        className={cn(
                          "size-2 rounded-full",
                          isCompleted && "bg-success/30",
                          !isCompleted && !isCurrent && "bg-muted",
                        )}
                        style={
                          isCurrent
                            ? {
                                backgroundColor: accent ?? "var(--primary)",
                              }
                            : undefined
                        }
                      />
                    );
                  })}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isModuleHeader
                      ? "text-white/80"
                      : "text-muted-foreground",
                  )}
                >
                  {progress.label ??
                    intl.formatMessage(
                      {
                        id: "pageHeader.progress.label",
                        defaultMessage: "Section {current} of {total}",
                      },
                      { current: progress.current, total: progress.total },
                    )}
                </span>
              </motion.div>
            ) : null}
          </div>
        </div>

        {(actions || media) && (
          <div
            className={cn(
              "flex shrink-0 flex-wrap items-center gap-2.5 sm:justify-end",
              // WCAG 2.2 target size (minimum): a 28px action button is widened
              // to 44px of height by a transparent pseudo-element, so a list
              // page's Create / duplicate-check controls are tappable without
              // changing how densely the action bar packs. Height only — these
              // are wide, and widening would reach into the neighbouring
              // action's own target. `gap-2.5` keeps a wrapped row clear.
              "[&_[data-slot=button]]:relative [&_[data-slot=button]]:after:absolute [&_[data-slot=button]]:after:-left-px [&_[data-slot=button]]:after:-right-px [&_[data-slot=button]]:after:top-1/2 [&_[data-slot=button]]:after:h-11 [&_[data-slot=button]]:after:-mt-[22px] [&_[data-slot=button]]:after:content-['']",
              isModuleHeader &&
                // White CTA on module gradient band — text MUST be a fixed dark
                // color (not --foreground, which flips to near-white in dark
                // mode and would render white-on-white). oklch(0.16…) ≈ the
                // light-mode foreground black; hardcoded so the button reads
                // the same in both light + dark mode. ~16:1 on white = AAA.
                "[&_[data-slot=button][data-variant=default]]:bg-white [&_[data-slot=button][data-variant=default]]:text-[oklch(0.16_0.02_260)]! [&_[data-slot=button][data-variant=default]]:hover:bg-white/90 [&_[data-slot=button][data-variant=default]]:border-transparent",
            )}
          >
            {actions}
            {media ? (
              <div
                className={cn(
                  "hidden size-12 shrink-0 items-center justify-center rounded-full sm:flex",
                  isModuleHeader
                    ? "bg-white/15 text-white"
                    : "bg-muted text-primary",
                )}
                aria-hidden
              >
                {media}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
};

import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useIntl } from "react-intl";

import { icons } from "@/assets/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moduleCssVar, type ModuleKey } from "@/types/module";

/** Default left plate icon per module key (nav Family A tiles). */
const MODULE_ICON: Record<string, string> = {
  customer: icons.navCustomer,
  outlet: icons.navOutlet,
  order: icons.navSalesOrder,
  visit: icons.navVisit,
  sku: icons.navSku,
  planning: icons.navPlanning,
  event: icons.navEvent,
  user: icons.navUsers,
  report: icons.navReports,
  email: icons.navEmailCrm,
  knowledge: icons.navKnowledge,
  ai: icons.navAi,
  // geo master data (pages use these keys even if not in ModuleKey spectrum)
  region: icons.navRegion,
  area: icons.navArea,
};

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Module accent — tints the hero gradient for domain wayfinding. */
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
}

/**
 * Standard page hero — filled gradient plate, white type.
 * Compact chrome: leading module icon + title stack; actions on the right.
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
}: PageHeaderProps) => {
  const intl = useIntl();
  const accent = moduleCssVar(module);

  const resolvedIcon =
    icon === null
      ? null
      : (icon ??
        (module && MODULE_ICON[module] ? (
          <img
            src={MODULE_ICON[module]}
            alt=""
            className="size-7 object-contain sm:size-8"
          />
        ) : null));

  // Module-tinted solid gradient; brand default uses Azure → indigo → violet
  const moduleStyle = accent
    ? ({
        backgroundImage: `linear-gradient(to bottom right, ${accent}, color-mix(in oklch, ${accent} 72%, oklch(0.45 0.2 280)), color-mix(in oklch, ${accent} 45%, oklch(0.48 0.22 295)))`,
      } satisfies CSSProperties)
    : undefined;

  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/20 px-4 py-3.5 text-white shadow-sm sm:px-5 sm:py-4",
        !accent &&
          "bg-linear-to-br from-primary via-indigo-600 to-violet-600",
        className,
      )}
      style={moduleStyle}
      data-slot="page-header"
      data-module={module}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_20%,rgba(255,255,255,0.28),transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="size-9 shrink-0 text-white hover:bg-white/15 hover:text-white"
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
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-sm ring-1 ring-white/20 backdrop-blur-sm sm:size-12"
              aria-hidden
            >
              {resolvedIcon}
            </span>
          ) : null}

          <div className="min-w-0 space-y-0.5">
            {eyebrow || module ? (
              <p className="text-[11px] font-semibold tracking-[0.08em] text-white/85 uppercase">
                {eyebrow ?? module}
              </p>
            ) : null}
            <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-xl text-xs text-white/80 sm:text-sm">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {(actions || media) && (
          <div
            className={cn(
              "flex shrink-0 flex-wrap items-center gap-2.5 sm:justify-end",
              // Outline / secondary actions stay legible on the filled hero
              "[&_[data-slot=button][data-variant=outline]]:border-white/30",
              "[&_[data-slot=button][data-variant=outline]]:bg-white/10",
              "[&_[data-slot=button][data-variant=outline]]:text-white",
              "[&_[data-slot=button][data-variant=outline]]:hover:bg-white/20",
              "[&_[data-slot=button][data-variant=secondary]]:bg-white/15",
              "[&_[data-slot=button][data-variant=secondary]]:text-white",
              "[&_[data-slot=button][data-variant=ghost]]:text-white",
              "[&_[data-slot=button][data-variant=ghost]]:hover:bg-white/15",
              // Primary CTA pops as solid white on the gradient
              "[&_[data-slot=button][data-variant=default]]:border-transparent",
              "[&_[data-slot=button][data-variant=default]]:bg-white",
              "[&_[data-slot=button][data-variant=default]]:text-primary",
              "[&_[data-slot=button][data-variant=default]]:hover:bg-white/90",
            )}
          >
            {actions}
            {media ? (
              <div
                className="hidden size-12 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur-sm sm:flex"
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

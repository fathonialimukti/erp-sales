import { createElement, type CSSProperties, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { moduleCssVar, type ModuleKey } from "@/types/module";

interface FormSectionProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-side header control (e.g. Add item). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Optional leading icon plate — turns the card into a numbered step. */
  icon?: LucideIcon;
  /** Step number shown in the icon plate (1-based journey). */
  step?: number;
  /** Module accent for the icon plate (allowed summary-plate surface). */
  tone?: ModuleKey;
}

const renderIcon = (icon: LucideIcon) =>
  createElement(icon, { className: "size-4", "aria-hidden": true });

/**
 * Standard form section card — regular CRM section recipe.
 * Header strip + default Card spacing; use across create/edit forms.
 *
 * With `icon`/`step` the header renders a numbered module-tinted icon plate,
 * turning a flat stack of cards into a visible "section journey".
 */
export const FormSection = ({
  title,
  description,
  action,
  children,
  className,
  icon,
  step,
  tone,
}: FormSectionProps) => {
  const accent = moduleCssVar(tone);
  const plateStyle = accent
    ? ({
        backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
        color: accent,
      } satisfies CSSProperties)
    : undefined;

  return (
    <Card
      size="default"
      className={cn(
        "gap-0 py-0 shadow-none ring-1 ring-border/70",
        className,
      )}
      data-slot="form-section"
      data-step={step}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <span
              className={cn(
                "relative flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
                accent ? undefined : "bg-muted text-primary",
              )}
              style={plateStyle}
              aria-hidden
            >
              {renderIcon(icon)}
              {step !== undefined ? (
                <span
                  className={cn(
                    "absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full border border-background text-[10px] font-bold",
                    accent ? "text-white" : "bg-primary text-primary-foreground",
                  )}
                  style={accent ? { backgroundColor: accent } : undefined}
                >
                  {step}
                </span>
              ) : null}
            </span>
          ) : step !== undefined ? (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm",
                accent ? undefined : "bg-muted text-primary",
              )}
              style={plateStyle}
              aria-hidden
            >
              {step}
            </span>
          ) : null}

          <div className="min-w-0 space-y-1">
            <h2 className="font-heading text-base font-bold tracking-tight text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {action ? (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        ) : null}
      </div>
      <div className="space-y-4 px-4 py-4 sm:px-5">{children}</div>
    </Card>
  );
};

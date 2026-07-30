import {
  createElement,
  isValidElement,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { moduleCssVar, type ModuleKey } from "@/types/module";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  /** Percent delta; positive = up (success), negative = down (destructive). */
  delta?: number | null;
  module?: ModuleKey;
  icon?: LucideIcon | ReactNode;
  className?: string;
}

const renderIcon = (icon: LucideIcon | ReactNode) => {
  if (isValidElement(icon)) return icon;
  // LucideIcon (function or forwardRef component)
  return createElement(icon as LucideIcon, {
    className: "size-5",
    "aria-hidden": true,
  });
};

export const KpiCard = ({
  label,
  value,
  delta,
  module,
  icon,
  className,
}: KpiCardProps) => {
  const accent = moduleCssVar(module);
  const plateStyle = accent
    ? ({
        backgroundColor: `color-mix(in srgb, ${accent} 8%, transparent)`,
        color: accent,
      } satisfies CSSProperties)
    : undefined;

  const showDelta = delta !== undefined && delta !== null;
  const deltaUp = showDelta && delta >= 0;

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/70 shadow-sm",
        !accent && "border-primary/10 bg-primary/4",
        className,
      )}
      data-slot="kpi-card"
      data-module={module}
    >
      <CardContent className="flex items-start gap-3 px-5 py-0">
        {icon ? (
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
              accent ? undefined : "bg-primary/15 text-primary",
            )}
            style={plateStyle}
            aria-hidden
          >
            {renderIcon(icon)}
          </span>
        ) : null}

        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="font-heading text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {showDelta ? (
            <p
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
                deltaUp ? "text-success" : "text-destructive",
              )}
            >
              {deltaUp ? (
                <TrendingUp className="size-3.5" aria-hidden />
              ) : (
                <TrendingDown className="size-3.5" aria-hidden />
              )}
              <span>
                {deltaUp ? "+" : ""}
                {delta.toFixed(1)}%
              </span>
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

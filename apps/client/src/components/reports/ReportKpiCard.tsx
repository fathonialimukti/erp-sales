import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReportKpiCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Optional delta indicator: positive (green) or negative (red). */
  delta?: number | null;
  className?: string;
}

export const ReportKpiCard = ({
  label,
  value,
  sub,
  delta,
  className,
}: ReportKpiCardProps) => {
  const showDelta = delta !== undefined && delta !== null;
  const deltaUp = showDelta && delta >= 0;

  return (
    <Card
      className={cn("break-inside-avoid shadow-sm", className)}
      data-slot="report-kpi-card"
    >
      <CardContent className="space-y-1 px-5 py-0">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="font-heading text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
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
              {Math.abs(delta).toFixed(1)}%
            </span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

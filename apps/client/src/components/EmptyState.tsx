import type { CSSProperties, ReactNode } from "react";
import { Inbox } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { moduleCssVar, type ModuleKey } from "@/types/module";

interface EmptyStateProps {
  /** Module accent for left bar / icon plate. */
  module?: ModuleKey;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  module,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => {
  const accent = moduleCssVar(module);
  const plateStyle = accent
    ? ({
        backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
        color: accent,
      } satisfies CSSProperties)
    : undefined;
  const barStyle = accent
    ? ({ borderLeftColor: accent } satisfies CSSProperties)
    : undefined;

  return (
    <Card
      className={cn(
        "border-dashed shadow-none",
        accent ? "border-l-4" : undefined,
        className,
      )}
      style={barStyle}
      data-slot="empty-state"
      data-module={module}
    >
      <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-xl",
            accent ? undefined : "bg-muted text-muted-foreground",
          )}
          style={plateStyle}
          aria-hidden
        >
          <Inbox className="size-6" />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-heading text-base font-semibold text-foreground">
            {title}
          </h3>
          {description ? (
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className="pt-1">{action}</div> : null}
      </CardContent>
    </Card>
  );
};

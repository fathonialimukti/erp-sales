import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useIntl } from "react-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moduleCssVar, type ModuleKey } from "@/types/module";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Module accent for eyebrow / left accent bar. */
  module?: ModuleKey;
  /** Optional eyebrow label above the title (e.g. "Customers"). */
  eyebrow?: string;
  onBack?: () => void;
  actions?: ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  module,
  eyebrow,
  onBack,
  actions,
  className,
}: PageHeaderProps) => {
  const intl = useIntl();
  const accent = moduleCssVar(module);
  const accentStyle = accent
    ? ({ borderLeftColor: accent } satisfies CSSProperties)
    : undefined;
  const eyebrowStyle = accent
    ? ({ color: accent } satisfies CSSProperties)
    : undefined;

  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-l-4 border-transparent pl-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
      style={accentStyle}
      data-slot="page-header"
      data-module={module}
    >
      <div className="flex min-w-0 items-start gap-3">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="mt-0.5 shrink-0"
            aria-label={intl.formatMessage({
              id: "common.action.back",
              defaultMessage: "Back",
            })}
          >
            <ArrowLeft className="size-4" />
          </Button>
        ) : null}

        <div className="min-w-0 space-y-1">
          {eyebrow || module ? (
            <p
              className={cn(
                "text-xs font-semibold tracking-wide uppercase",
                accent ? undefined : "text-muted-foreground",
              )}
              style={eyebrowStyle}
            >
              {eyebrow ?? module}
            </p>
          ) : null}
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
};

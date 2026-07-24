import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-side header control (e.g. Add item). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Standard form section card — regular CRM section recipe.
 * Header strip + default Card spacing; use across create/edit forms.
 */
export const FormSection = ({
  title,
  description,
  action,
  children,
  className,
}: FormSectionProps) => {
  return (
    <Card
      size="default"
      className={cn(
        "gap-0 py-0 shadow-none ring-1 ring-border/70",
        className,
      )}
      data-slot="form-section"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="min-w-0 space-y-1">
          <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        ) : null}
      </div>
      <div className="space-y-4 px-4 py-4 sm:px-5">{children}</div>
    </Card>
  );
};

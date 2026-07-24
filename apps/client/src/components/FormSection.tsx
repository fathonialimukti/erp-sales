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
 * Standard compact form card — dense CRM section recipe.
 * Header strip + tight body padding; use across create/edit forms.
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
      size="sm"
      className={cn(
        "gap-0 py-0 shadow-none ring-1 ring-border/70",
        className,
      )}
      data-slot="form-section"
    >
      <div className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2 sm:px-3.5">
        <div className="min-w-0 space-y-0.5">
          <h2 className="font-heading text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 items-center gap-1.5">{action}</div>
        ) : null}
      </div>
      <div className="space-y-3 px-3 py-3 sm:px-3.5">{children}</div>
    </Card>
  );
};

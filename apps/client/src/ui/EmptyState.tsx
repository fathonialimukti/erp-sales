import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

// ponytail: keep ui EmptyState API (icon prop); domain EmptyState uses module accent
export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card px-6 py-10 text-center",
      className,
    )}
  >
    <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
      {icon ?? <Inbox className="size-5" aria-hidden />}
    </div>
    <div className="space-y-1">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
    {action}
  </div>
);

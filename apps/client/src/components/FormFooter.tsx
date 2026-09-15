import type { ReactNode } from "react";
import { useIntl } from "react-intl";

import { cn } from "@/lib/utils";

interface FormFooterProps {
  /** Right-aligned action buttons (Save / Propose…). */
  children: ReactNode;
  /** Optional status text on the left (e.g. "Unsaved changes"). */
  status?: ReactNode;
  /** Show the keyboard shortcut hint. Defaults to true. */
  hint?: boolean;
  className?: string;
}

/**
 * Sticky bottom save bar for forms. Opaque grounded surface that stays in
 * view while the form is taller than the viewport.
 */
export const FormFooter = ({ children, status, hint = true, className }: FormFooterProps) => {
  const intl = useIntl();

  return (
    <div
      className={cn(
        "sticky bottom-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 shadow-sm",
        className,
      )}
      data-slot="form-footer"
    >
      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
        {status ?? (
          <span>
            {intl.formatMessage({
              id: "form.footer.unsaved",
              defaultMessage: "Unsaved changes",
            })}
          </span>
        )}
        {hint ? (
          <span className="hidden items-center gap-1 md:inline-flex">
            <span aria-hidden>·</span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-bold text-foreground">
              Ctrl/⌘ S
            </kbd>
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  );
};

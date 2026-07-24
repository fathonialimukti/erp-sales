import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useIntl } from "react-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavButtonGroupProps {
  /** Called when the leading Back control is pressed. Omit to hide Back. */
  onBack?: () => void;
  /** Extra nav controls rendered after Back (same button-group chrome). */
  children?: ReactNode;
  className?: string;
}

/**
 * Compact button group for page chrome above `PageHeader`.
 * Starts with optional Back; pass more `Button`s as children later.
 */
export const NavButtonGroup = ({
  onBack,
  children,
  className,
}: NavButtonGroupProps) => {
  const intl = useIntl();

  if (!onBack && !children) return null;

  return (
    <div
      role="group"
      data-slot="nav-button-group"
      className={cn(
        "inline-flex w-fit items-center rounded-lg border border-border/80 bg-card/70 p-0.5 shadow-sm",
        "[&_[data-slot=button]]:rounded-md",
        "[&_[data-slot=button]]:shadow-none",
        className,
      )}
    >
      {onBack ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
          aria-label={intl.formatMessage({
            id: "common.action.back",
            defaultMessage: "Back",
          })}
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {intl.formatMessage({
            id: "common.action.back",
            defaultMessage: "Back",
          })}
        </Button>
      ) : null}
      {children}
    </div>
  );
};

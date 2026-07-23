import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { moduleCssVar, type ModuleKey } from "@/types/module";

interface NavModuleTileProps {
  label: string;
  icon?: string;
  active?: boolean;
  collapsed?: boolean;
  module?: ModuleKey;
  onClick: () => void;
  onMouseEnter?: (el: HTMLElement) => void;
  onMouseLeave?: () => void;
  onFocus?: (el: HTMLElement) => void;
  onBlur?: () => void;
}

/**
 * Aurora nav row: custom SVG plate + soft active wash + 3px accent bar.
 * Lucide is only used for the expanded chevron chrome.
 */
export const NavModuleTile = ({
  label,
  icon,
  active = false,
  collapsed = false,
  module,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
}: NavModuleTileProps) => {
  const accent = moduleCssVar(module);
  const activeStyle =
    active && accent
      ? ({
          backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
          borderLeftColor: accent,
        } satisfies CSSProperties)
      : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      data-module={module}
      className={cn(
        "group relative flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent text-left outline-none transition-colors duration-200",
        "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        collapsed ? "justify-center px-0 py-2" : "border-l-[3px] px-2.5 py-2",
        active && !accent && "border-l-primary bg-primary/10 text-primary",
        active && accent && "border-l-[3px]",
        !active && !collapsed && "border-l-transparent",
        active && "font-medium text-foreground",
        !active && "text-muted-foreground hover:text-foreground",
      )}
      style={activeStyle}
      onMouseEnter={(e) => onMouseEnter?.(e.currentTarget)}
      onMouseLeave={onMouseLeave}
      onFocus={(e) => onFocus?.(e.currentTarget)}
      onBlur={onBlur}
    >
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center",
          collapsed ? "size-10" : "size-8",
        )}
        aria-hidden
      >
        {icon ? (
          <img
            src={icon}
            alt=""
            className={cn(
              "rounded-xl object-contain",
              collapsed ? "size-9" : "size-8",
            )}
          />
        ) : null}
      </span>

      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-opacity duration-150",
              active ? "opacity-70" : "opacity-0 group-hover:opacity-60",
            )}
            aria-hidden
          />
        </>
      ) : null}
    </button>
  );
};

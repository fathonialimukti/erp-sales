import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { moduleCssVar } from "@/types/module";

/** The one `ai` accent value — `DESIGN.md` hue ~300, assistant-only. */
const AI_ACCENT = moduleCssVar("ai");

/**
 * The frozen module wash recipe (`DESIGN.md` color law) in srgb, matching
 * KpiCard / FormSection / NavModuleTile — not a Tailwind `/12` opacity
 * modifier, which mixes in oklab and drifts from the rest of the product.
 *
 * - `aiPlateStyle`  — icon plate: 12% wash + accent foreground.
 * - `aiBorderStyle` — 30% accent border (assistant dialog, which stays on
 *   opaque `bg-card` and has no left rail because it is a floating modal).
 * - `aiPanelStyle`  — inline panel: 4% wash, `aiBorderStyle`, solid rail.
 */
const aiWash = (percent: number): string | undefined =>
  AI_ACCENT ? `color-mix(in srgb, ${AI_ACCENT} ${percent}%, transparent)` : undefined;

export const aiPlateStyle: CSSProperties | undefined = AI_ACCENT
  ? { backgroundColor: aiWash(12), color: AI_ACCENT }
  : undefined;

export const aiBorderStyle: CSSProperties | undefined = AI_ACCENT
  ? { borderColor: aiWash(30) }
  : undefined;

export const aiPanelStyle: CSSProperties | undefined = AI_ACCENT
  ? {
      ...aiBorderStyle,
      backgroundColor: aiWash(4),
      borderLeftColor: AI_ACCENT,
    }
  : undefined;

/**
 * The one panel chrome for every in-page AI surface.
 *
 * `ai` is an assistant accent, never brand (`DESIGN.md` hue table), so the
 * module hue appears on the plate, the 3px left rail and the border only —
 * the run/generate action stays Aurora Azure `primary` (one primary action per
 * region). One width (`max-w-xl`) across report narratives, briefs, checklists
 * and duplicate scans; the assistant dialog is deliberately not an AiPanel
 * because it is a floating modal with its own expand toggle.
 */
export interface AiPanelTitleProps {
  /** Lucide icon (chrome only) rendered in the module-ai plate. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AiPanelTitle({ icon, children, className }: AiPanelTitleProps) {
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-xs font-semibold text-foreground",
        className,
      )}
    >
      {icon ? (
        <span
          className="flex size-5 shrink-0 items-center justify-center rounded-md"
          style={aiPlateStyle}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

export interface AiPanelProps {
  /** Header label — normally an `<AiPanelTitle>` with the Sparkles plate. */
  label?: ReactNode;
  /** Header-right node, normally the run / generate `Button`. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AiPanel({ label, actions, children, className }: AiPanelProps) {
  return (
    <div
      style={aiPanelStyle}
      className={cn("w-full max-w-xl rounded-xl border border-l-[3px] p-3 shadow-sm", className)}
    >
      {(label || actions) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {label}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

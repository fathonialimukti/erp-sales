import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { useIntl } from "react-intl";
import { motion, useReducedMotion } from "motion/react";

import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/StatusChip";
import { cn } from "@/lib/utils";
import { pageEnter, getMotionProps } from "@/lib/motion";
import { moduleCssVar, type ModuleKey } from "@/types/module";

export interface FormPreviewRow {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  /** Render the value right-aligned with tabular numerals (money, counts). */
  money?: boolean;
}

interface FormPreviewProps {
  module: ModuleKey;
  icon: LucideIcon;
  /** Live record title (usually the entity name). */
  title: string;
  /** Fallback shown when the title is still empty. */
  placeholder?: string;
  /** Secondary line under the title (usually the code). */
  subtitle?: ReactNode;
  /** Workflow / lifecycle status shown as a chip (e.g. DRAFT, ACTIVE). */
  status?: string;
  rows?: FormPreviewRow[];
  /** How many fields are already filled (drives the completion meter). */
  filled: number;
  /** Total tracked fields for the completion meter. */
  total: number;
  /** Extra content below the completion meter (e.g. quick hints). */
  footer?: ReactNode;
  className?: string;
}

const renderIcon = (icon: LucideIcon, className = "size-5") =>
  createElement(icon, { className, "aria-hidden": true });

/**
 * Live record preview rail for create/edit forms.
 * Renders a mini "detail card" of the entity as the user types, so the form
 * feels alive instead of an abstract pile of inputs. Sticky on xl screens.
 */
export const FormPreview = ({
  module,
  icon,
  title,
  placeholder,
  subtitle,
  status,
  rows = [],
  filled,
  total,
  footer,
  className,
}: FormPreviewProps) => {
  const intl = useIntl();
  const reduced = useReducedMotion();
  const accent = moduleCssVar(module);
  const plateStyle = accent
    ? ({
        backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
        color: accent,
      } satisfies CSSProperties)
    : undefined;

  const pct = total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0;
  const complete = total > 0 && filled >= total;
  const hasContent = title.trim().length > 0 || rows.some((r) => String(r.value ?? "").length > 0);

  /* --- Animated value flash: track previous row values --- */
  const prevValuesRef = useRef<string[]>([]);
  const [flashRows, setFlashRows] = useState<boolean[]>([]);

  useEffect(() => {
    const current = rows.map((r) => String(r.value ?? ""));
    const prev = prevValuesRef.current;
    const next = current.map((val, i) => val.length > 0 && prev[i] !== undefined && prev[i] !== val);
    prevValuesRef.current = current;
    if (next.some(Boolean)) {
      setFlashRows(next);
      // Auto-clear flash after the fade animation completes
      const timer = setTimeout(() => setFlashRows([]), 320);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  return (
    <motion.div
      variants={pageEnter}
      {...getMotionProps(reduced)}
      className={cn("flex flex-col gap-3", className)}
    >
      <Card
        className="relative gap-0 overflow-hidden py-0 shadow-sm ring-1 ring-border/70"
        data-slot="form-preview"
        data-module={module}
      >
        {/* Completion accent border — 3px left strip filling vertically by pct */}
        <motion.div
          className="absolute inset-y-0 left-0 w-[3px] rounded-l"
          style={accent ? { backgroundColor: accent } : undefined}
          initial={false}
          animate={{ height: `${pct}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden
        />
        {/* Header strip */}
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={plateStyle}
            aria-hidden
          >
            {renderIcon(icon)}
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              {intl.formatMessage({
                id: "form.preview.title",
                defaultMessage: "Live preview",
              })}
            </p>
            <h2 className="font-heading text-base leading-tight font-bold tracking-tight text-foreground break-words">
              {title.trim() || (
                <span className="text-muted-foreground">
                  {placeholder ??
                    intl.formatMessage({
                      id: "form.preview.placeholder",
                      defaultMessage: "Untitled",
                    })}
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Record body */}
        <div className="space-y-3 px-4 py-3">
          {status ? (
            <div className="flex items-center gap-2">
              <StatusChip status={status} />
            </div>
          ) : null}

          {subtitle ? (
            <p className="text-xs font-semibold text-muted-foreground">{subtitle}</p>
          ) : null}

          {rows.length > 0 ? (
            <ul className="divide-y divide-border/50">
              {rows.map((row, idx) => {
                const value = String(row.value ?? "");
                const empty = value.trim().length === 0;
                const Icon = row.icon;
                const flashing = flashRows[idx] ?? false;
                return (
                  <li key={idx} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-muted-foreground">
                      {row.label}
                    </span>
                    {empty ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <motion.span
                        className={cn(
                          "max-w-[55%] truncate rounded px-1.5 py-0.5 text-right text-sm font-semibold text-foreground",
                          row.money && "tabular-nums",
                        )}
                        initial={false}
                        animate={{
                          backgroundColor: flashing
                            ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                            : "transparent",
                        }}
                        transition={
                          reduced
                            ? { duration: 0 }
                            : { backgroundColor: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }
                        }
                      >
                        {row.value}
                      </motion.span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {/* Completion meter */}
          <div className="border-t border-border/60 pt-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage(
                  { id: "form.preview.filled", defaultMessage: "{filled} of {total} fields" },
                  { filled, total },
                )}
              </span>
              {complete ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  {intl.formatMessage({
                    id: "form.preview.ready",
                    defaultMessage: "Ready to save",
                  })}
                </span>
              ) : null}
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={intl.formatMessage({
                id: "form.preview.progress_label",
                defaultMessage: "Form completion",
              })}
            >
              <motion.div
                className={cn("h-full rounded-full", complete ? "bg-success" : "bg-primary")}
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={reduced ? { duration: 0 } : { duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        </div>
      </Card>

      {!hasContent ? (
        <p className="px-1 text-xs font-semibold text-muted-foreground">
          {intl.formatMessage({
            id: "form.preview.empty",
            defaultMessage: "Start typing — the record takes shape here.",
          })}
        </p>
      ) : null}

      {footer ? <div className="px-1">{footer}</div> : null}
    </motion.div>
  );
};

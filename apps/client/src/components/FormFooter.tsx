import { useEffect, useRef, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { motion, useReducedMotion } from "motion/react";

import { fadeIn, getMotionProps } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Autosave indicator + debounced draft-save config for `FormFooter`. */
export interface FormFooterAutosave {
  /** When true, show the autosave indicator and debounce `onSave`. */
  enabled: boolean;
  /** Timestamp of the last successful save — drives the "Saved HH:MM" text. */
  lastSaved?: Date;
  /**
   * Saves the draft. Recreate this callback whenever form values change
   * (e.g. `useCallback` with the values in deps) — the footer re-arms its
   * 1.5s debounce on each new callback identity, so the draft is saved once
   * the user pauses typing. Keep it referentially stable across unrelated
   * re-renders to avoid spurious saves.
   */
  onSave: () => void;
}

interface FormFooterProps {
  /** Right-aligned action buttons (Save / Propose…). */
  children: ReactNode;
  /** Optional status text on the left (e.g. "Unsaved changes"). */
  status?: ReactNode;
  /**
   * Autosave indicator + debounced draft save. When enabled (and no explicit
   * `status` is given) the left side shows a green dot + "Saved HH:MM"
   * instead of the default "Unsaved changes" text.
   */
  autosave?: FormFooterAutosave;
  /** Show the keyboard shortcut hint. Defaults to true. */
  hint?: boolean;
  className?: string;
}

/** Debounce window for autosave (ms). */
const AUTOSAVE_DEBOUNCE_MS = 1500;

/** Green-dot "Saved HH:MM" indicator for the left side of the footer. */
const AutosaveIndicator = ({ lastSaved }: { lastSaved?: Date }) => {
  const intl = useIntl();
  const reduced = useReducedMotion();

  return (
    <motion.span
      // Re-key on each save so the fresh timestamp softly fades in.
      key={lastSaved?.getTime() ?? "pending"}
      variants={fadeIn}
      {...getMotionProps(reduced)}
      className="flex min-w-0 items-center gap-1.5"
      aria-live="polite"
      data-slot="form-footer-autosave"
    >
      {lastSaved ? (
        <span
          aria-hidden
          className="flex size-2 shrink-0 items-center justify-center rounded-full bg-success/20"
        >
          <span className="size-1 rounded-full bg-success" />
        </span>
      ) : (
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-muted-foreground/40" />
      )}
      <span className="truncate">
        {lastSaved
          ? intl.formatMessage(
              { id: "form.footer.saved", defaultMessage: "Saved {time}" },
              {
                time: intl.formatTime(lastSaved, { hour: "2-digit", minute: "2-digit" }),
              },
            )
          : intl.formatMessage({
              id: "form.footer.autosaveOn",
              defaultMessage: "Autosave on",
            })}
      </span>
    </motion.span>
  );
};

/**
 * Sticky bottom save bar for forms. Opaque grounded surface that stays in
 * view while the form is taller than the viewport.
 */
export const FormFooter = ({
  children,
  status,
  autosave,
  hint = true,
  className,
}: FormFooterProps) => {
  const intl = useIntl();
  const autosaveEnabled = autosave?.enabled === true;
  const autosaveOnSave = autosave?.onSave;
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced draft save: re-arms whenever a new `onSave` callback arrives
  // (parents recreate it when form values change) and fires 1.5s after the
  // last change. Disabling autosave or unmounting cancels the pending save.
  useEffect(() => {
    if (!autosaveEnabled || !autosaveOnSave) return;
    autosaveTimerRef.current = setTimeout(autosaveOnSave, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimerRef.current !== null) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [autosaveEnabled, autosaveOnSave]);

  return (
    <div
      className={cn(
        "sticky bottom-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 shadow-sm",
        className,
      )}
      data-slot="form-footer"
    >
      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
        {status ??
          (autosaveEnabled ? (
            <AutosaveIndicator lastSaved={autosave?.lastSaved} />
          ) : (
            <span>
              {intl.formatMessage({
                id: "form.footer.unsaved",
                defaultMessage: "Unsaved changes",
              })}
            </span>
          ))}
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

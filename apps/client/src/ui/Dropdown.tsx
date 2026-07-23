import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "top";
  className?: string;
}

export const Dropdown = ({
  trigger,
  children,
  align = "end",
  side = "bottom",
  className,
}: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  const [position, setPosition] = useState<{ top: number; left: number; minWidth: number } | null>(
    null,
  );

  const recomputePosition = () => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const minWidth = Math.max(r.width, 180);
    const left =
      align === "end"
        ? Math.max(8, Math.min(window.innerWidth - minWidth - 8, r.right - minWidth))
        : Math.max(8, Math.min(window.innerWidth - minWidth - 8, r.left));
    const top = side === "bottom" ? r.bottom + 6 : Math.max(8, r.top - 6);
    setPosition({ top, left, minWidth });
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    recomputePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onTriggerClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  const onTriggerKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((prev) => !prev);
    } else if (e.key === "ArrowDown" && open) {
      e.preventDefault();
      const first = panelRef.current?.querySelector<HTMLElement>("[role='menuitem']");
      first?.focus();
    }
  };

  return (
    <>
      <div ref={rootRef} className={cn("ui-dd inline-flex", className)}>
        <div
          ref={triggerRef}
          className="inline-flex cursor-pointer"
          role="button"
          tabIndex={0}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onTriggerClick}
          onKeyDown={onTriggerKeyDown}
        >
          {trigger}
        </div>
      </div>

      {open && position
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="menu"
              aria-label="Menu"
              className="z-50 min-w-[11rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                minWidth: position.minWidth,
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: "default" | "danger";
  leftIcon?: ReactNode;
}

export const DropdownItem = ({
  children,
  tone = "default",
  leftIcon,
  className,
  onClick: userOnClick,
  ...rest
}: DropdownItemProps) => {
  const onClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    userOnClick?.(e);
    const root = e.currentTarget.closest(".ui-dd");
    const trigger = root?.querySelector<HTMLElement>('[aria-haspopup="menu"]');
    if (trigger && trigger.getAttribute("aria-expanded") === "true") {
      trigger.click();
    }
  };

  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none",
        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        tone === "danger" && "text-destructive focus:text-destructive",
        className,
      )}
      onClick={onClick}
      {...rest}
    >
      {leftIcon ? <span className="inline-flex shrink-0 [&_svg]:size-4">{leftIcon}</span> : null}
      <span className="truncate">{children}</span>
    </button>
  );
};

export const DropdownSeparator = () => (
  <div className="-mx-1 my-1 h-px bg-border" role="separator" />
);

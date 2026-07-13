import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./Dropdown.css";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "top";
  className?: string;
}

export const Dropdown = ({ trigger, children, align = "end", side = "bottom", className }: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  // Position the panel relative to the trigger.
  const [position, setPosition] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  const recomputePosition = () => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const minWidth = Math.max(r.width, 180);
    const left =
      align === "end"
        ? Math.max(8, Math.min(window.innerWidth - minWidth - 8, r.right - minWidth))
        : Math.max(8, Math.min(window.innerWidth - minWidth - 8, r.left));
    const top =
      side === "bottom" ? r.bottom + 6 : Math.max(8, r.top - 6);
    setPosition({ top, left, minWidth });
  };

  // Close on outside click, Escape, scroll, or resize.
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

  // Reposition when opened.
  useEffect(() => {
    if (!open) return;
    recomputePosition();
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
      <div
        ref={rootRef}
        className={`dd ${className ?? ""}`}
        style={{ display: "inline-flex" }}
      >
        <div
          ref={triggerRef}
          className="dd__trigger"
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

      {open && position && createPortal(
        <div
          ref={panelRef}
          id={panelId}
          role="menu"
          aria-label="Menu"
          className={[
            "dd__panel",
            "dd__panel--floating",
            side === "bottom" ? "dd__panel--bottom" : "dd__panel--top",
            align === "end" ? "dd__panel--end" : "dd__panel--start",
          ].join(" ")}
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
      )}
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
    // 1) Stop the click from bubbling to the document outside-click handler
    e.stopPropagation();
    // 2) Run the user's onClick handler (the actual menu action)
    userOnClick?.(e);
    // 3) Programmatically close the dropdown by clicking the trigger element.
    //    The trigger's onClick handler toggles `open`, which closes it.
    const root = e.currentTarget.closest(".dd");
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
      className={`dd__item ${tone === "danger" ? "dd__item--danger" : ""} ${className ?? ""}`}
      onClick={onClick}
      {...rest}
    >
      {leftIcon}
      <span className="dd__item-label">{children}</span>
    </button>
  );
};

export const DropdownSeparator = () => <div className="dd__separator" role="separator" />;

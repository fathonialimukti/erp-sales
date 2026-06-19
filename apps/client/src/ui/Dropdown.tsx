import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import "./Dropdown.css";

interface DropdownProps {
  trigger?: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "top";
  className?: string;
}

export const Dropdown = ({ trigger, children, align = "end", side = "bottom", className }: DropdownProps) => {
  const ref = useRef<HTMLDetailsElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        ref.current.removeAttribute("open");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.removeAttribute("open");
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panelClasses = [
    "dd__panel",
    side === "bottom" ? "dd__panel--bottom" : "dd__panel--top",
    align === "end" ? "dd__panel--end" : "dd__panel--start",
  ].join(" ");

  return (
    <details
      ref={ref}
      className={`dd ${className ?? ""}`}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="dd__trigger">{trigger}</summary>
      <div role="menu" className={panelClasses}>
        {children}
      </div>
    </details>
  );
};

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: "default" | "danger";
  leftIcon?: ReactNode;
}

export const DropdownItem = ({ children, tone = "default", leftIcon, className, ...rest }: DropdownItemProps) => (
  <button
    type="button"
    role="menuitem"
    className={`dd__item ${tone === "danger" ? "dd__item--danger" : ""} ${className ?? ""}`}
    {...rest}
  >
    {leftIcon}
    {children}
  </button>
);

export const DropdownTrigger = ({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" className={`dd__trigger ${className ?? ""}`} {...rest}>{children}</button>
);

export const DropdownMenu = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div role="menu" className={`dd__panel dd__panel--bottom dd__panel--end ${className ?? ""}`}>{children}</div>
);

export const DropdownSeparator = () => <div className="dd__separator" />;

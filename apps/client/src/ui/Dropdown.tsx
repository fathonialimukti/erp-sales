import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "./cn";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "top";
  className?: string;
}

/**
 * Native dropdown built on <details>. The trigger is the <summary>,
 * the panel is the content. Closes when the user clicks outside or
 * presses Escape.
 */
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

  return (
    <details
      ref={ref}
      className={cn("relative inline-block", className)}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">{trigger}</summary>
      <div
        role="menu"
        className={cn(
          "absolute z-50 min-w-[10rem] overflow-hidden rounded-md border border-slate-200 bg-surface-1 shadow-md",
          "dark:border-slate-800",
          side === "bottom" ? "mt-1.5" : "bottom-full mb-1.5",
          align === "end" ? "right-0" : "left-0",
        )}
      >
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
    className={cn(
      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
      tone === "danger"
        ? "text-state-danger hover:bg-state-danger-bg"
        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
      className,
    )}
    {...rest}
  >
    {leftIcon}
    {children}
  </button>
);

export const DropdownSeparator = () => <div className="my-1 h-px bg-slate-200 dark:bg-slate-800" />;

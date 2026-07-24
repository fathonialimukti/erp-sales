import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import { LogOut, Settings, User } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { authUserAtom, userMenuOpenAtom } from "@/lib/atoms";
import { initialsOf } from "@/lib/initials";
import { cn } from "@/lib/utils";
import { useAuthActions } from "@/lib/useAuth";

/**
 * Floating user menu — Profile / Settings / Logout.
 * position: fixed + user-menu-anchor event (keep anchor logic).
 */
export const UserMenuPopover = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [open, setOpen] = useAtom(userMenuOpenAtom);
  const user = useAtomValue(authUserAtom);
  const { logout } = useAuthActions();

  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const trigger = (target as Element).closest?.("[data-user-menu-trigger]");
      if (trigger) return;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);

    const onAnchor = (e: Event) => {
      const detail = (e as CustomEvent<DOMRect>).detail;
      if (detail) setAnchorRect(detail);
    };
    window.addEventListener("user-menu-anchor", onAnchor);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("user-menu-anchor", onAnchor);
    };
  }, [open, setOpen]);

  if (!open || !user) return null;

  const POPOVER_W = 240;
  const POPOVER_OFFSET = 8;
  const VIEW_PAD = 8;
  let style: CSSProperties = {};

  if (anchorRect) {
    const rightEdge = Math.max(VIEW_PAD, window.innerWidth - anchorRect.right);
    const bottomY = window.innerHeight - anchorRect.top + POPOVER_OFFSET;
    const fitsAbove = anchorRect.top >= 200;
    style = fitsAbove
      ? {
          top: anchorRect.top - POPOVER_OFFSET,
          right: rightEdge,
          transform: "translateY(-100%)",
        }
      : { top: bottomY, right: rightEdge };
    style.maxWidth = `${POPOVER_W}px`;
  } else {
    style = {
      bottom: VIEW_PAD + 56,
      right: VIEW_PAD + 14,
      maxWidth: `${POPOVER_W}px`,
    };
  }

  const handleSettings = () => {
    setOpen(false);
    navigate("/users");
  };

  const handleProfile = () => {
    setOpen(false);
    navigate(`/users`);
  };

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      ref={popoverRef}
      role="menu"
      aria-label={intl.formatMessage({
        id: "user.menu.label",
        defaultMessage: "User menu",
      })}
      style={style}
      className={cn(
        "fixed z-1100 w-60 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-150 motion-reduce:animate-none",
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-border px-2.5 py-2.5">
        <Avatar size="default" className="size-9">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initialsOf(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-semibold text-foreground">
            {user.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {user.roleName}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-0.5 py-1" role="none">
        <button
          type="button"
          role="menuitem"
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          onClick={handleProfile}
        >
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-violet-500 text-white">
            <User className="size-3.5" aria-hidden />
          </span>
          <span>
            {intl.formatMessage({
              id: "user.menu.profile",
              defaultMessage: "Profile",
            })}
          </span>
        </button>

        <button
          type="button"
          role="menuitem"
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          onClick={handleSettings}
        >
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-blue-500 text-white">
            <Settings className="size-3.5" aria-hidden />
          </span>
          <span>
            {intl.formatMessage({
              id: "user.menu.settings",
              defaultMessage: "Settings",
            })}
          </span>
        </button>

        <Separator className="my-1" />

        <button
          type="button"
          role="menuitem"
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            void handleLogout();
          }}
        >
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-red-500 text-white">
            <LogOut className="size-3.5" aria-hidden />
          </span>
          <span>
            {intl.formatMessage({
              id: "nav.logout",
              defaultMessage: "Log out",
            })}
          </span>
        </button>
      </div>
    </div>
  );
};

interface UserMenuTriggerProps {
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}

/** Trigger used by topbar / sidebar — fires user-menu-anchor with its rect. */
export const UserMenuTrigger = ({
  className,
  "aria-label": ariaLabel,
  children,
}: UserMenuTriggerProps) => {
  const [open, setOpen] = useAtom(userMenuOpenAtom);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      window.dispatchEvent(
        new CustomEvent("user-menu-anchor", { detail: rect }),
      );
    }
  }, [open]);

  return (
    <button
      ref={ref}
      type="button"
      className={className}
      aria-label={ariaLabel}
      data-user-menu-trigger=""
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={() => setOpen((prev) => !prev)}
    >
      {children}
    </button>
  );
};

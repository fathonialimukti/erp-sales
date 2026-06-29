import { useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import { userMenuOpenAtom, authUserAtom } from "../lib/atoms";
import { useAuthActions } from "../lib/useAuth";
import { Avatar } from "../ui/Avatar";
import "./UserMenuPopover.css";

const Svg = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

interface MenuPosition {
  top: number;
  // "right" anchors the popover's right edge to this X coordinate
  right: number;
}

/**
 * Floating iOS-style user menu — Settings / Profile / Logout.
 *
 * The popover itself is position: fixed and positioned dynamically
 * via JS to anchor to whatever trigger element opened it (topbar
 * avatar or sidebar profile button). This avoids clipping issues
 * with overflow: hidden parents.
 */
export const UserMenuPopover = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [open, setOpen] = useAtom(userMenuOpenAtom);
  const user = useAtomValue(authUserAtom);
  const { logout } = useAuthActions();

  // Anchor + position state
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      // Don't close if clicking the trigger button itself (let the trigger handle re-open)
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

  // Compute popover position from anchor
  // Default: anchor's bottom-right corner, popover opens above and to the left
  const POPOVER_W = 240;
  const POPOVER_OFFSET = 8;
  const VIEW_PAD = 8;
  let style: React.CSSProperties = {};

  if (anchorRect) {
    // Position popover so its right edge aligns with the trigger's right edge
    const rightEdge = Math.max(VIEW_PAD, window.innerWidth - anchorRect.right);
    const bottomY = window.innerHeight - anchorRect.top + POPOVER_OFFSET;
    // If popover doesn't fit above, place it below
    const fitsAbove = anchorRect.top >= 200;
    style = fitsAbove
      ? { top: anchorRect.top - POPOVER_OFFSET, right: rightEdge, transform: "translateY(-100%)" }
      : { top: bottomY, right: rightEdge };
    // Clamp width
    style.maxWidth = `${POPOVER_W}px`;
  } else {
    // Fallback: bottom-right of viewport
    style = { bottom: VIEW_PAD + 56, right: VIEW_PAD + 14 };
    style.maxWidth = `${POPOVER_W}px`;
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
      className="ios-user-menu"
      role="menu"
      aria-label={intl.formatMessage({ id: "user.menu.label", defaultMessage: "User menu" })}
      style={style}
    >
      <header className="ios-user-menu__header">
        <Avatar name={user.name} size="md" />
        <div className="ios-user-menu__id">
          <span className="ios-user-menu__name">{user.name}</span>
          <span className="ios-user-menu__role">{user.roleName}</span>
        </div>
      </header>

      <div className="ios-user-menu__list" role="none">
        <button
          type="button"
          role="menuitem"
          className="ios-user-menu__item"
          onClick={handleProfile}
        >
          <span className="ios-user-menu__item-icon" data-tint="violet" aria-hidden="true">
            <Svg d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          </span>
          <span className="ios-user-menu__item-label">
            {intl.formatMessage({ id: "user.menu.profile", defaultMessage: "Profile" })}
          </span>
        </button>

        <button
          type="button"
          role="menuitem"
          className="ios-user-menu__item"
          onClick={handleSettings}
        >
          <span className="ios-user-menu__item-icon" data-tint="blue" aria-hidden="true">
            <Svg d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </span>
          <span className="ios-user-menu__item-label">
            {intl.formatMessage({ id: "user.menu.settings", defaultMessage: "Settings" })}
          </span>
        </button>

        <div className="ios-user-menu__divider" aria-hidden="true" />

        <button
          type="button"
          role="menuitem"
          className="ios-user-menu__item ios-user-menu__item--danger"
          onClick={handleLogout}
        >
          <span className="ios-user-menu__item-icon" data-tint="red" aria-hidden="true">
            <Svg d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" />
          </span>
          <span className="ios-user-menu__item-label">
            {intl.formatMessage({ id: "nav.logout", defaultMessage: "Log out" })}
          </span>
        </button>
      </div>
    </div>
  );
};

/**
 * Trigger button — used by topbar / sidebar to open the popover.
 * Captures its own bounding rect so the popover anchors correctly.
 */
interface UserMenuTriggerProps {
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}

export const UserMenuTrigger = ({ className, "aria-label": ariaLabel, children }: UserMenuTriggerProps) => {
  const [open, setOpen] = useAtom(userMenuOpenAtom);
  const ref = useRef<HTMLButtonElement>(null);

  // When the menu opens, capture the trigger's rect so the popover knows where to anchor
  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // Store on the singleton popover via a custom event the popover listens to
      window.dispatchEvent(new CustomEvent("user-menu-anchor", { detail: rect }));
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

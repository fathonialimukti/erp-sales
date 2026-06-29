import type { CSSProperties } from "react";
import { icons } from "../../assets/icons";

/* ============================================================
 * AccessControlIcons — SVG icons for access control (roles) pages
 *
 * Shared action icons are imported from src/assets/icons.
 * Domain-specific icons use inline SVGs.
 *
 * Usage:
 *   <AccessControlIcon name="back" size={18} />
 * ============================================================ */

export type AccessControlIconName =
  | "back"
  | "edit"
  | "delete"
  | "plus"
  | "search"
  | "check"
  | "close"
  | "chevron-right"
  | "eye"
  | "shield"
  | "users"
  | "lock"
  | "key"
  | "tag";

interface AccessControlIconProps {
  name: AccessControlIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

const SHARED_MAP: Record<string, string> = {
  back: icons.actionBack,
  edit: icons.actionEdit,
  delete: icons.actionDelete,
  plus: icons.actionPlus,
  search: icons.actionSearch,
  check: icons.actionCheck,
  close: icons.actionClose,
  "chevron-right": icons.actionChevronRight,
  eye: icons.actionEye,
};

const INLINE_SVGS: Record<string, string> = {
  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`,
  users: `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  key: `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 7.5 8.5 14.5"/><path d="M14 5.5a3.5 3.5 0 0 0-4.95 4.95L4 15.5V20h4.5l5.05-5.05a3.5 3.5 0 0 0 4.95-4.95l-1.78 1.78-2.61-.52-.52-2.61z"/></svg>`,
  tag: `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>`,
};

export const AccessControlIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: AccessControlIconProps) => {
  if (SHARED_MAP[name]) {
    return (
      <img
        src={SHARED_MAP[name]}
        alt={label ?? ""}
        width={size}
        height={size}
        aria-hidden={hidden ?? !label}
        aria-label={label}
        className={className}
        style={style}
      />
    );
  }
  const svg = INLINE_SVGS[name]?.replace(/SIZE/g, String(size));
  if (!svg) return null;
  return (
    <span
      className={className}
      style={{ display: "inline-flex", width: size, height: size, ...style }}
      aria-hidden={hidden ?? !label}
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

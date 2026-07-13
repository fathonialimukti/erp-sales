import type { CSSProperties } from "react";

/* ============================================================
 * SalesOrderIcons — inline SVG icons used by sales-order pages.
 *
 * Why inline? The shared `Icon` component renders all `solar:*`
 * icons as a generic fallback glyph. To keep the icon language
 * consistent across the sales-order domain (print, edit, delete,
 * propose, approve, reject, back, plus, trash, etc.) we ship a
 * dedicated set of icons that match the iOS-style hero buttons.
 *
 * No external icon-font, no iconify, no remote URLs.
 *
 * All icons:
 *   - 24x24 viewBox
 *   - stroke-width: 1.8 (matches the chrome toolbar)
 *   - stroke-linecap/linejoin: round
 *   - fill: none on the outline layer; stroke: currentColor
 *
 * Usage:
 *   <SOIcon name="print" size={18} />
 * ============================================================ */

export type SOIconName =
  | "back"
  | "edit"
  | "delete"
  | "print"
  | "propose"
  | "approve"
  | "reject"
  | "plus"
  | "trash"
  | "box"
  | "search"
  | "check"
  | "close"
  | "chevron-right"
  | "chevron-down"
  | "chevron-left"
  | "user"
  | "building"
  | "calendar"
  | "menu-dots"
  | "eye"
  | "alert"
  | "package"
  | "tag"
  | "duplicate"
  | "sort-asc"
  | "sparkle"
  | "sort-desc";

interface SOIconProps {
  name: SOIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

const Base = ({
  size = 18,
  children,
  className,
  style,
  label,
  hidden,
}: {
  size?: number | string;
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  label?: string;
  hidden?: boolean;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={hidden ?? !label}
    aria-label={label}
    className={className}
    style={style}
  >
    {children}
  </svg>
);

const PATHS: Record<SOIconName, React.ReactNode> = {
  back: <path d="M19 12H5M12 19l-7-7 7-7" />,
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  delete: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </>
  ),
  print: (
    <>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </>
  ),
  propose: (
    <>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4z" />
    </>
  ),
  approve: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  reject: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </>
  ),
  box: (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  "chevron-right": <polyline points="9 18 15 12 9 6" />,
  "chevron-left": <polyline points="15 18 9 12 15 6" />,
  "chevron-down": <polyline points="6 9 12 15 18 9" />,
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <line x1="8" y1="6" x2="8" y2="6.01" />
      <line x1="16" y1="6" x2="16" y2="6.01" />
      <line x1="12" y1="6" x2="12" y2="6.01" />
      <line x1="8" y1="10" x2="8" y2="10.01" />
      <line x1="16" y1="10" x2="16" y2="10.01" />
      <line x1="12" y1="10" x2="12" y2="10.01" />
      <line x1="8" y1="14" x2="8" y2="14.01" />
      <line x1="16" y1="14" x2="16" y2="14.01" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  "menu-dots": (
    <>
      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
    </>
  ),
  duplicate: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  "sort-asc": (
    <>
      <path d="M12 5v14" />
      <path d="M19 12l-7 7-7-7" />
    </>
  ),
  "sort-desc": (
    <>
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </>
  ),
  eye: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </>
  ),
  package: (
    <>
      <path d="M16 3h5v5h-5z" />
      <path d="M3 16h5v5H3z" />
      <path d="M21 16v5h-5v-5z" />
      <path d="M8 3h5v5H8z" />
      <path d="M3 8h5v5H3z" />
      <path d="M16 8h5v5h-5z" />
      <path d="M8 13h5v5H8z" />
    </>
  ),
  tag: (
    <>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3M6.343 6.343l2.122 2.122m7.07 7.07l2.122 2.122M6.343 17.657l2.122-2.122m7.07-7.07l2.122-2.122" />
    </>
  ),
};

export const SOIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: SOIconProps) => (
  <Base
    size={size}
    className={className}
    style={style}
    label={label}
    hidden={hidden === "false" ? false : hidden === "true" ? true : (hidden as boolean | undefined)}
  >
    {PATHS[name]}
  </Base>
);

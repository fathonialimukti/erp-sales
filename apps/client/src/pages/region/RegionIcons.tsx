import type { CSSProperties } from "react";
import { icons } from "../../assets/icons";

/* ============================================================
 * RegionIcons — SVG icons for region pages
 *
 * All icons are imported from src/assets/icons and rendered as <img> tags.
 *
 * Usage:
 *   <RegionIcon name="back" size={18} />
 * ============================================================ */

export type RegionIconName =
  | "back"
  | "edit"
  | "delete"
  | "plus"
  | "search"
  | "check"
  | "close"
  | "chevron-right"
  | "chevron-down"
  | "chevron-left"
  | "menu-dots"
  | "eye"
  | "map"
  | "area"
  | "building";

interface RegionIconProps {
  name: RegionIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

const ICON_MAP: Record<RegionIconName, string> = {
  back: icons.actionBack,
  edit: icons.actionEdit,
  delete: icons.actionDelete,
  plus: icons.actionPlus,
  search: icons.actionSearch,
  check: icons.actionCheck,
  close: icons.actionClose,
  "chevron-right": icons.actionChevronRight,
  "chevron-down": icons.actionChevronDown,
  "chevron-left": icons.actionChevronLeft,
  "menu-dots": icons.actionMenuDots,
  eye: icons.actionEye,
  map: icons.regionMap,
  area: icons.regionArea,
  building: icons.regionBuilding,
};

export const RegionIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: RegionIconProps) => (
  <img
    src={ICON_MAP[name]}
    alt={label ?? ""}
    width={size}
    height={size}
    aria-hidden={hidden ?? !label}
    aria-label={label}
    className={className}
    style={style}
  />
);

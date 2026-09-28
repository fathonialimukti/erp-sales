import type { CSSProperties } from "react";
import { DomainIcon, type DomainIconName } from "../../components/DomainIcon";

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

const REGION_ICON_MAP: Record<RegionIconName, DomainIconName> = {
  back: "actionBack",
  edit: "actionEdit",
  delete: "actionDelete",
  plus: "actionPlus",
  search: "actionSearch",
  check: "actionCheck",
  close: "actionClose",
  "chevron-right": "actionChevronRight",
  "chevron-down": "actionChevronDown",
  "chevron-left": "actionChevronLeft",
  "menu-dots": "actionMenuDots",
  eye: "actionEye",
  map: "regionMap",
  area: "regionArea",
  building: "regionBuilding",
};

interface RegionIconProps {
  name: RegionIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

/** Re-export shim over shared DomainIcon — keeps existing imports working. */
export const RegionIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: RegionIconProps) => (
  <DomainIcon
    name={REGION_ICON_MAP[name]}
    size={size}
    className={className}
    style={style}
    aria-hidden={hidden}
    aria-label={label}
  />
);

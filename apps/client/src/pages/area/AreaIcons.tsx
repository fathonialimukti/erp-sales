import type { CSSProperties } from "react";
import { icons } from "../../assets/icons";

const accent = { "--m-accent": "#5856D6", "--m-accent-end": "#AF52DE" } as React.CSSProperties;

export type AreaIconName =
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
  | "grid"
  | "outlet"
  | "region";

interface AreaIconProps {
  name: AreaIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

const ICON_MAP: Record<AreaIconName, string> = {
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
  grid: icons.areaGrid,
  outlet: icons.areaOutlet,
  region: icons.areaRegion,
};

export const AreaIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: AreaIconProps) => (
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

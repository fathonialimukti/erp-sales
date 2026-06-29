import type { CSSProperties } from "react";
import { icons } from "../../assets/icons";

const accent = { "--m-accent": "#8B5CF6", "--m-accent-end": "#6D28D9" } as React.CSSProperties;

export type VisitLogIconName =
  | "back"
  | "edit"
  | "delete"
  | "plus"
  | "search"
  | "check"
  | "close"
  | "chevron-right"
  | "menu-dots"
  | "eye"
  | "clipboard"
  | "clock"
  | "location";

interface VisitLogIconProps {
  name: VisitLogIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

const ICON_MAP: Record<VisitLogIconName, string> = {
  back: icons.actionBack,
  edit: icons.actionEdit,
  delete: icons.actionDelete,
  plus: icons.actionPlus,
  search: icons.actionSearch,
  check: icons.actionCheck,
  close: icons.actionClose,
  "chevron-right": icons.actionChevronRight,
  "menu-dots": icons.actionMenuDots,
  eye: icons.actionEye,
  clipboard: icons.visitClipboard,
  clock: icons.visitClock,
  location: icons.visitLocation,
};

export const VisitLogIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: VisitLogIconProps) => (
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

import type { CSSProperties } from "react";
import { DomainIcon, type DomainIconName } from "../../components/DomainIcon";

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
  | "location"
  | "item"
  | "sparkle";

const VISIT_LOG_ICON_MAP: Record<VisitLogIconName, DomainIconName> = {
  back: "actionBack",
  edit: "actionEdit",
  delete: "actionDelete",
  plus: "actionPlus",
  search: "actionSearch",
  check: "actionCheck",
  close: "actionClose",
  "chevron-right": "actionChevronRight",
  "menu-dots": "actionMenuDots",
  eye: "actionEye",
  clipboard: "visitClipboard",
  clock: "visitClock",
  location: "visitLocation",
  item: "visitClipboard",
  sparkle: "dashSparkle",
};

interface VisitLogIconProps {
  name: VisitLogIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

/** Re-export shim over shared DomainIcon — keeps existing imports working. */
export const VisitLogIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: VisitLogIconProps) => (
  <DomainIcon
    name={VISIT_LOG_ICON_MAP[name]}
    size={size}
    className={className}
    style={style}
    aria-hidden={hidden}
    aria-label={label}
  />
);

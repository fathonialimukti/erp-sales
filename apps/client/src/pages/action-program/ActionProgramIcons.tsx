import type { CSSProperties } from "react";
import { icons } from "../../assets/icons";

const accent = { "--m-accent": "#EC4899", "--m-accent-end": "#BE185D" } as React.CSSProperties;

export type ActionProgramIconName =
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
  | "document"
  | "calendar"
  | "budget";

interface ActionProgramIconProps {
  name: ActionProgramIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

const ICON_MAP: Record<ActionProgramIconName, string> = {
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
  document: icons.actionProgramDocument,
  calendar: icons.actionProgramCalendar,
  budget: icons.actionProgramBudget,
};

export const ActionProgramIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: ActionProgramIconProps) => (
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

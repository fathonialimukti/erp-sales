import type { CSSProperties } from "react";
import { icons } from "../../assets/icons";

const accent = { "--m-accent": "#AF52DE", "--m-accent-end": "#5856D6" } as React.CSSProperties;

export type CustomerIconName =
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
  | "user"
  | "outlet"
  | "contacts"
  | "credit"
  | "address";

interface CustomerIconProps {
  name: CustomerIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

const ICON_MAP: Record<CustomerIconName, string> = {
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
  user: icons.customerUser,
  outlet: icons.customerOutlet,
  contacts: icons.customerContacts,
  credit: icons.customerCredit,
  address: icons.customerAddress,
};

export const CustomerIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: CustomerIconProps) => (
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

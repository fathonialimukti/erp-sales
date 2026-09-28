import type { CSSProperties } from "react";
import { DomainIcon, type DomainIconName } from "../../components/DomainIcon";
import { moduleCssVar } from "../../types/module";

/** Module plate wash helper — `var(--module-*)` only, no hex (design law §2). */
const customerAccent = (module: string) => {
  const accent = moduleCssVar(module);
  return accent ? ({ "--m-accent": accent, "--m-accent-end": accent } as CSSProperties) : undefined;
};

export { customerAccent };

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

const CUSTOMER_ICON_MAP: Record<CustomerIconName, DomainIconName> = {
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
  user: "customerUser",
  outlet: "customerOutlet",
  contacts: "customerContacts",
  credit: "customerCredit",
  address: "customerAddress",
};

interface CustomerIconProps {
  name: CustomerIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

/** Re-export shim over shared DomainIcon — keeps existing imports working. */
export const CustomerIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: CustomerIconProps) => (
  <DomainIcon
    name={CUSTOMER_ICON_MAP[name]}
    size={size}
    className={className}
    style={style}
    aria-hidden={hidden}
    aria-label={label}
  />
);

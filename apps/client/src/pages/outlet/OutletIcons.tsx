import type { CSSProperties } from "react";
import { DomainIcon, type DomainIconName } from "../../components/DomainIcon";
import { moduleCssVar } from "../../types/module";

/** Module plate wash helper — `var(--module-*)` only, no hex (design law §2). */
const outletAccent = (module: string) => {
  const accent = moduleCssVar(module);
  return accent ? ({ "--m-accent": accent, "--m-accent-end": accent } as CSSProperties) : undefined;
};

export { outletAccent };

export type OutletIconName =
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
  | "store"
  | "location"
  | "phone"
  | "contact";

const OUTLET_ICON_MAP: Record<OutletIconName, DomainIconName> = {
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
  store: "outletStore",
  location: "outletLocation",
  phone: "outletPhone",
  contact: "outletContact",
};

interface OutletIconProps {
  name: OutletIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

/** Re-export shim over shared DomainIcon — keeps existing imports working. */
export const OutletIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: OutletIconProps) => (
  <DomainIcon
    name={OUTLET_ICON_MAP[name]}
    size={size}
    className={className}
    style={style}
    aria-hidden={hidden}
    aria-label={label}
  />
);

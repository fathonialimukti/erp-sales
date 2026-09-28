import type { CSSProperties } from "react";
import { DomainIcon, type DomainIconName } from "../../components/DomainIcon";

export type SkuIconName =
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
  | "package"
  | "price";

const SKU_ICON_MAP: Record<SkuIconName, DomainIconName> = {
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
  package: "skuPackage",
  price: "skuPrice",
};

interface SkuIconProps {
  name: SkuIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

/** Re-export shim over shared DomainIcon — keeps existing imports working. */
export const SkuIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: SkuIconProps) => (
  <DomainIcon
    name={SKU_ICON_MAP[name]}
    size={size}
    className={className}
    style={style}
    aria-hidden={hidden}
    aria-label={label}
  />
);

import type { CSSProperties } from "react";
import { DomainIcon, type DomainIconName } from "../../components/DomainIcon";

export type SkuCategoryIconName =
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
  | "category"
  | "sku"
  | "tag";

const SKU_CATEGORY_ICON_MAP: Record<SkuCategoryIconName, DomainIconName> = {
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
  category: "skuCategoryTag",
  sku: "skuCategoryBox",
  tag: "skuCategoryTag",
};

interface SkuCategoryIconProps {
  name: SkuCategoryIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

/** Re-export shim over shared DomainIcon — keeps existing imports working. */
export const SkuCategoryIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: SkuCategoryIconProps) => (
  <DomainIcon
    name={SKU_CATEGORY_ICON_MAP[name]}
    size={size}
    className={className}
    style={style}
    aria-hidden={hidden}
    aria-label={label}
  />
);

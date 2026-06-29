import { memo, type CSSProperties, type ImgHTMLAttributes } from "react";

interface IconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  /**
   * Icon identifier. Accepts:
   *   - Local asset path  → "/icons/foo.svg"   (rendered as <img>)
   *   - Remote URL        → "https://…"        (rendered as <img>)
   *   - Legacy solar: ID  → "solar:eye-linear" (rendered as a generic
   *                                          fallback glyph so legacy
   *                                          code keeps compiling)
   */
  icon?: string;
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

/**
 * Lightweight icon renderer.
 *
 * No external icon-font or runtime SVG library — everything is a local
 * asset (URL/path) or a generic fallback glyph.
 */
const IconBase = ({
  icon,
  width = 18,
  height = 18,
  style,
  className,
  alt = "",
  ...rest
}: IconProps) => {
  // Legacy solar: IDs — render a minimal placeholder circle so we don't
  // crash and don't ship iconify. Pages should be migrated to local SVGs.
  if (icon && icon.startsWith("solar:")) {
    return (
      <span
        role="img"
        aria-hidden={rest["aria-hidden"] ?? true}
        aria-label={rest["aria-label"]}
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width,
          height,
          ...style,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={width}
          height={height}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      </span>
    );
  }

  if (!icon) return null;

  return (
    <img
      src={icon}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      {...rest}
    />
  );
};

export const Icon = memo(IconBase, (prev, next) => prev.icon === next.icon && prev.className === next.className);
Icon.displayName = "Icon";

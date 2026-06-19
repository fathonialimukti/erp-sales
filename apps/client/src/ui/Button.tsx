import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Button.css";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn--primary",
  secondary: "btn--secondary",
  outline: "btn--outline",
  ghost: "btn--ghost",
  danger: "btn--danger",
  success: "btn--success",
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "btn--sm",
  md: "",
  lg: "btn--lg",
  icon: "btn--icon",
};

export const Button = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) => {
  const classes = [
    "btn",
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    fullWidth ? "btn--full" : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  return (
    <button
      type={rest.type ?? "button"}
      className={classes}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <span className="btn__spinner" />
      ) : (
        <>
          {leftIcon && <span className="btn__icon">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="btn__icon">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

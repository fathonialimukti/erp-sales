import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const VARIANT_MAP: Record<Variant, "default" | "secondary" | "outline" | "ghost" | "destructive"> = {
  primary: "default",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
  danger: "destructive",
  success: "default",
};

const SIZE_MAP: Record<Size, "sm" | "default" | "lg" | "icon"> = {
  sm: "sm",
  md: "default",
  lg: "lg",
  icon: "icon",
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
  type,
  ...rest
}: ButtonProps) => (
  <button
    type={type ?? "button"}
    disabled={disabled || isLoading}
    className={cn(
      buttonVariants({ variant: VARIANT_MAP[variant], size: SIZE_MAP[size] }),
      variant === "success" && "bg-success text-success-foreground hover:bg-success/90",
      fullWidth && "w-full",
      className,
    )}
    {...rest}
  >
    {isLoading ? (
      <Loader2 className="size-4 animate-spin" aria-hidden />
    ) : (
      <>
        {leftIcon ? <span className="inline-flex shrink-0 [&_svg]:size-4">{leftIcon}</span> : null}
        {children}
        {rightIcon ? <span className="inline-flex shrink-0 [&_svg]:size-4">{rightIcon}</span> : null}
      </>
    )}
  </button>
);

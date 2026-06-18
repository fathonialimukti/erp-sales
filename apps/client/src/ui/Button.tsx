import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";


type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  /** Legacy alias for icon-only buttons. Maps to `size="icon"`. */
  isIconOnly?: boolean;
  /** Legacy alias for `disabled`. */
  isDisabled?: boolean;
  /** Legacy alias for `onClick`. */
  onPress?: () => void;
  /** Legacy alias for loading state. */
  isPending?: boolean;
  /** Legacy children-as-render-prop pattern. */
  children?: ReactNode | ((state: { isPending: boolean }) => ReactNode);
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 disabled:bg-accent-500/50 shadow-xs",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 disabled:bg-slate-100/50 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
  outline:
    "border border-slate-300 bg-surface-1 text-slate-900 hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:text-slate-400 dark:text-slate-300 dark:hover:bg-slate-800",
  danger:
    "bg-state-danger text-white hover:bg-red-600 active:bg-red-700 disabled:bg-state-danger/50 shadow-xs",
  success:
    "bg-state-success text-white hover:bg-accent-600 active:bg-accent-700 disabled:bg-state-success/50 shadow-xs",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
  icon: "h-9 w-9 p-0",
};

export const Button = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  isPending = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  isIconOnly = false,
  isDisabled = false,
  onPress,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) => {
  const loading = isLoading || isPending;
  const resolvedSize: Size = isIconOnly ? "icon" : size;
  const resolvedDisabled = disabled || isDisabled;
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    rest.onClick?.(e);
    onPress?.();
  };
  const renderChildren = () => {
    if (typeof children === "function") return children({ isPending: loading });
    return children;
  };
  return (
    <button
      type={rest.type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0",
        VARIANT[variant],
        SIZE[resolvedSize],
        fullWidth && "w-full",
        className,
      )}
      disabled={resolvedDisabled || loading}
      onClick={handleClick}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        leftIcon
      )}
      {renderChildren()}
      {!loading && rightIcon}
    </button>
  );
};

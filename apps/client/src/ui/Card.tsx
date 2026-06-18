import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "elevated" | "outline" | "secondary";
}

export const Card = ({ children, className, variant = "default", ...rest }: CardProps) => (
  <div
    className={cn(
      "rounded-lg",
      variant === "default" && "border border-slate-200 bg-surface-1 shadow-xs",
      variant === "elevated" && "bg-surface-1 shadow-md",
      variant === "outline" && "border border-slate-200 bg-transparent",
      variant === "secondary" && "border border-slate-200 bg-surface-1 shadow-xs",
      "dark:border-slate-800",
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800",
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}
export const CardTitle = ({ children, className, ...rest }: CardTitleProps) => (
  <h3 className={cn("text-base font-semibold text-slate-900 dark:text-slate-100", className)} {...rest}>
    {children}
  </h3>
);

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}
export const CardDescription = ({ children, className, ...rest }: CardDescriptionProps) => (
  <p className={cn("mt-0.5 text-sm text-slate-500 dark:text-slate-400", className)} {...rest}>
    {children}
  </p>
);

export const CardBody = ({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5", className)} {...rest}>
    {children}
  </div>
);

// Legacy alias — used by pages that haven't migrated from the HeroUI name.
export const CardContent = CardBody;

export const CardFooter = ({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800",
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);

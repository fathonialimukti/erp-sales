import type { HTMLAttributes, ReactNode } from "react";
import {
  Card as ShadCard,
  CardHeader as ShadCardHeader,
  CardTitle as ShadCardTitle,
  CardDescription as ShadCardDescription,
  CardContent as ShadCardContent,
  CardFooter as ShadCardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "elevated" | "outline" | "secondary";
}

export const Card = ({ children, className, variant = "default", ...rest }: CardProps) => (
  <ShadCard
    className={cn(
      variant === "elevated" && "shadow-md",
      variant === "outline" && "shadow-none",
      variant === "secondary" && "bg-secondary/40 shadow-none",
      className,
    )}
    {...rest}
  >
    {children}
  </ShadCard>
);

export const CardHeader = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <ShadCardHeader className={className} {...rest} />
);

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}
export const CardTitle = ({ children, className, ...rest }: CardTitleProps) => (
  <ShadCardTitle className={className} {...rest}>
    {children}
  </ShadCardTitle>
);

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}
export const CardDescription = ({ children, className, ...rest }: CardDescriptionProps) => (
  <ShadCardDescription className={className} {...rest}>
    {children}
  </ShadCardDescription>
);

export const CardBody = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <ShadCardContent className={className} {...rest} />
);

export const CardContent = CardBody;

export const CardFooter = ({ className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <ShadCardFooter className={className} {...rest} />
);

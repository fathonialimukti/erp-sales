import type { HTMLAttributes, ReactNode } from "react";
import "./Card.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "elevated" | "outline" | "secondary";
}

const VARIANT_CLASS: Record<string, string> = {
  default: "",
  elevated: "card--elevated",
  outline: "card--outline",
  secondary: "card--secondary",
};

export const Card = ({ children, className, variant = "default", ...rest }: CardProps) => (
  <div className={`card ${VARIANT_CLASS[variant]} ${className ?? ""}`} {...rest}>
    {children}
  </div>
);

export const CardHeader = ({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`card__header ${className ?? ""}`} {...rest}>{children}</div>
);

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> { children: ReactNode; }
export const CardTitle = ({ children, className, ...rest }: CardTitleProps) => (
  <h3 className={`card__title ${className ?? ""}`} {...rest}>{children}</h3>
);

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> { children: ReactNode; }
export const CardDescription = ({ children, className, ...rest }: CardDescriptionProps) => (
  <p className={`card__description ${className ?? ""}`} {...rest}>{children}</p>
);

export const CardBody = ({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`card__body ${className ?? ""}`} {...rest}>{children}</div>
);

export const CardContent = CardBody;

export const CardFooter = ({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`card__footer ${className ?? ""}`} {...rest}>{children}</div>
);

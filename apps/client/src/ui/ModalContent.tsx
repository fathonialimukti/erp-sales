import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface ModalContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Body container for a <Modal>. HeroUI exposed it as a compound slot
 * (`<ModalContent>`) — in our primitive it's just a styled <div>
 * inside the dialog. The native <dialog> handles centering, backdrop,
 * and focus trapping.
 */
export const ModalContent = ({ children, className, ...rest }: ModalContentProps) => (
  <div
    className={cn(
      "relative max-h-[85vh] overflow-y-auto",
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);

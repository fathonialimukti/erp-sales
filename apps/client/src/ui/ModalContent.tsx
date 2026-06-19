import type { HTMLAttributes, ReactNode } from "react";

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
  <div className={`modal-body ${className ?? ""}`} {...rest}>
    {children}
  </div>
);

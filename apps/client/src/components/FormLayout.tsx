import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormLayoutProps {
  /** Right-hand rail (usually a <FormPreview>). Sticky on xl screens. */
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Two-column form shell: the form stack on the left, an optional sticky
 * preview rail on the right (xl+). Stacks on smaller screens.
 */
export const FormLayout = ({ sidebar, children, className }: FormLayoutProps) => (
  <div
    className={cn(
      "grid gap-3 xl:grid-cols-[minmax(0,1fr)_290px] xl:items-start",
      className,
    )}
    data-slot="form-layout"
  >
    <div className="flex min-w-0 flex-col gap-3">{children}</div>
    {sidebar ? (
      <aside className="min-w-0 xl:sticky xl:top-2 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
        {sidebar}
      </aside>
    ) : null}
  </div>
);

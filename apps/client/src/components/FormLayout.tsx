import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormLayoutProps {
  /** Right-hand rail (usually a <FormPreview>). Sticky on xl screens. */
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * Layout mode. Defaults to `'auto'` (backward-compatible).
   *
   * - `'auto'` — sidebar if provided, single column if not (current behavior)
   * - `'simple'` — forces single-column centered (max-w-xl), no sidebar
   * - `'standard'` — sidebar if provided (current behavior)
   * - `'complex'` — forces sidebar + wider max-width (max-w-4xl)
   */
  mode?: "auto" | "simple" | "standard" | "complex";
}

/**
 * Two-column form shell: the form stack on the left, an optional sticky
 * preview rail on the right (xl+). Stacks on smaller screens.
 *
 * The `mode` prop controls layout density without breaking existing call sites.
 */
export const FormLayout = ({
  sidebar,
  children,
  className,
  mode = "auto",
}: FormLayoutProps) => {
  const hasSidebar = sidebar ? true : false;

  // simple: always single column, centered, ignore sidebar
  if (mode === "simple") {
    return (
      <div
        className={cn("mx-auto w-full max-w-xl", className)}
        data-slot="form-layout"
        data-form-layout-mode="simple"
      >
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    );
  }

  // complex: wider max-width + sidebar
  if (mode === "complex") {
    return (
      <div
        className={cn("mx-auto w-full max-w-4xl", className)}
        data-slot="form-layout"
        data-form-layout-mode="complex"
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_290px] xl:items-start">
          <div className="flex min-w-0 flex-col gap-3">{children}</div>
          {hasSidebar ? (
            <aside className="min-w-0 xl:sticky xl:top-2 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
              {sidebar}
            </aside>
          ) : null}
        </div>
      </div>
    );
  }

  // standard + auto: original behavior (sidebar if provided)
  return (
    <div
      className={cn(
        "grid gap-3 xl:grid-cols-[minmax(0,1fr)_290px] xl:items-start",
        className,
      )}
      data-slot="form-layout"
      data-form-layout-mode={mode}
    >
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
      {hasSidebar ? (
        <aside className="min-w-0 xl:sticky xl:top-2 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
          {sidebar}
        </aside>
      ) : null}
    </div>
  );
};

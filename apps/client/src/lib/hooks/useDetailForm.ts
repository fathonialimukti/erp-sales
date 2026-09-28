import { useEffect } from "react";

/**
 * useDetailForm — dedups the copy-pasted detail-seed effect every
 * `*FormPage.tsx` carries ("only seed when detail arrives").
 *
 * The form APIs differ slightly across pages, so the hook takes a plain
 * `seed(detail)` callback instead of a form instance — additive, no
 * behaviour change. Call it with the tRPC `detail` row (or `null` while
 * loading); the callback runs once per new `detail` object identity.
 *
 * ```tsx
 * useDetailForm(data, (d) => {
 *   form.setFieldValue("code", d.code ?? "");
 *   form.setFieldValue("name", d.name);
 * });
 * ```
 */
export const useDetailForm = <T,>(detail: T | null | undefined, seed: (detail: T) => void) => {
  useEffect(() => {
    if (detail) seed(detail);
    // ponytail: only seed when detail arrives — seed is stable per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);
};

// Minimal class-name joiner — filters falsy values and joins with spaces.
export const cn = (
  ...inputs: Array<string | number | false | null | undefined>
): string => inputs.filter(Boolean).join(" ");

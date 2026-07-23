/** Aurora module accent keys (nav / page eyebrow / empty-state tint). */
export type ModuleKey =
  | "customer"
  | "outlet"
  | "order"
  | "visit"
  | "sku"
  | "planning"
  | "event"
  | "user"
  | "report"
  | "email"
  | "knowledge"
  | "ai"
  | (string & {});

const KNOWN_MODULES = new Set([
  "customer",
  "outlet",
  "order",
  "visit",
  "sku",
  "planning",
  "event",
  "user",
  "report",
  "email",
  "knowledge",
  "ai",
]);

/** CSS color value for a known module accent, e.g. `var(--module-customer)`. */
export const moduleCssVar = (module?: string): string | undefined => {
  if (!module || !KNOWN_MODULES.has(module)) return undefined;
  return `var(--module-${module})`;
};

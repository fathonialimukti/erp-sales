/** Bold CRM module accent keys (nav / page eyebrow / empty-state tint). */
export type ModuleKey =
  | "customer"
  | "outlet"
  | "order"
  | "visit"
  | "sku"
  | "skuCategory"
  | "planning"
  | "event"
  | "user"
  | "report"
  | "email"
  | "knowledge"
  | "ai"
  | "region"
  | "area"
  | "budget"
  | "budgetType"
  | "budgetPeriod"
  | "budgetLine"
  | "actionType"
  | "eventType"
  | "vendor"
  | "settings"
  | (string & {});

const KNOWN_MODULES = new Set([
  "customer",
  "outlet",
  "order",
  "visit",
  "sku",
  "skuCategory",
  "planning",
  "event",
  "user",
  "report",
  "email",
  "knowledge",
  "ai",
  "region",
  "area",
  "budget",
  "budgetType",
  "budgetPeriod",
  "budgetLine",
  "actionType",
  "eventType",
  "vendor",
  "settings",
]);

/**
 * CSS color value for a known module accent, e.g. `var(--module-customer)`.
 * Multi-word keys ("actionType") are kebab-cased to match the CSS token
 * (`--module-action-type`) — a raw camelCase var silently resolves to nothing
 * and renders a white header.
 */
export const moduleCssVar = (module?: string): string | undefined => {
  if (!module || !KNOWN_MODULES.has(module)) return undefined;
  const cssKey = module.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return `var(--module-${cssKey})`;
};

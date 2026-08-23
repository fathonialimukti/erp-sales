/**
 * Translates raw tRPC / Prisma / Postgres error text into short, user-friendly messages.
 *
 * `translateDbError` returns a friendly string ONLY for recognized database error
 * patterns (FK restrict, FK violation, unique violation, not found, deadlock,
 * connection issues). Anything else returns null so caller-side messages
 * (validation, permissions, custom server copy) pass through untouched.
 */

interface TableLabel {
  s: string;
  p: string;
}

const TABLE_LABELS: Record<string, TableLabel> = {
  crm_outlets: { s: "outlet", p: "outlets" },
  crm_areas: { s: "area", p: "areas" },
  crm_regions: { s: "region", p: "regions" },
  crm_customers: { s: "customer", p: "customers" },
  crm_customer_contacts: { s: "contact", p: "contacts" },
  crm_visit_logs: { s: "visit log", p: "visit logs" },
  crm_sales_orders: { s: "sales order", p: "sales orders" },
  crm_sales_order_items: { s: "order item", p: "order items" },
  crm_payments: { s: "payment", p: "payments" },
  crm_action_programs: { s: "action program", p: "action programs" },
  crm_action_program_outlets: { s: "program outlet", p: "program outlets" },
  crm_action_program_skus: { s: "program product", p: "program products" },
  crm_action_program_payments: { s: "program payment", p: "program payments" },
  crm_action_program_items: { s: "program item", p: "program items" },
  crm_event_proposals: { s: "event proposal", p: "event proposals" },
  crm_event_proposal_skus: { s: "proposal product", p: "proposal products" },
  crm_event_proposal_payments: { s: "proposal payment", p: "proposal payments" },
  event_misc_items: { s: "event item", p: "event items" },
  event_vendors: { s: "event vendor", p: "event vendors" },
  event_vendor_payments: { s: "vendor payment", p: "vendor payments" },
  vendors: { s: "vendor", p: "vendors" },
  event_types: { s: "event type", p: "event types" },
  action_types: { s: "action type", p: "action types" },
  budget_lines: { s: "budget line", p: "budget lines" },
  budget_periods: { s: "budget period", p: "budget periods" },
  budget_types: { s: "budget type", p: "budget types" },
  skus: { s: "product", p: "products" },
  sku_categories: { s: "product category", p: "product categories" },
  email_conversations: { s: "conversation", p: "conversations" },
  email_messages: { s: "message", p: "messages" },
  notifications: { s: "notification", p: "notifications" },
  activity_logs: { s: "activity", p: "activities" },
  users: { s: "user", p: "users" },
  roles: { s: "role", p: "roles" },
};

const COLUMN_LABELS: Record<string, string> = {
  area_id: "area",
  region_id: "region",
  customer_id: "customer",
  outlet_id: "outlet",
  sku_id: "product",
  category_id: "category",
  sales_order_id: "sales order",
  budget_type_id: "budget type",
  period_id: "period",
  action_type_id: "action type",
  event_proposal_id: "event proposal",
  vendor_id: "vendor",
  event_vendor_id: "event vendor",
  salesman_id: "salesman",
  pic_id: "person in charge",
  created_by_id: "user",
  approved_by_id: "approver",
  conversation_id: "conversation",
  user_id: "user",
  email_conversation_id: "conversation",
  action_program_id: "action program",
  budget_line_id: "budget line",
  document_number: "document number",
  code: "code",
  name: "name",
  email: "email",
  message_id: "message ID",
};

const TABLE_KEYS_BY_LENGTH = Object.keys(TABLE_LABELS).sort((a, b) => b.length - a.length);

/** `crm_outlets_area_id_fkey` -> { table: "crm_outlets", column: "area_id" } */
const parseConstraintName = (
  name: string,
): { table: string; column: string } | null => {
  const base = name.replace(/_(fkey|key|pkey|uniq|idx)$/i, "");
  for (const table of TABLE_KEYS_BY_LENGTH) {
    if (base.startsWith(`${table}_`)) {
      return { table, column: base.slice(table.length + 1) };
    }
  }
  return null;
};

const prettifyField = (field: string): string =>
  COLUMN_LABELS[field] ?? field.replace(/[_.-]+/g, " ").trim();

const flatten = (raw: string): string => raw.replace(/\s+/g, " ").trim();

/** Pull the most specific message string out of any thrown value. */
const extractRawMessage = (error: unknown): string => {
  if (!error) return "";
  if (typeof error === "string") return error;
  const e = error as {
    message?: unknown;
    data?: { cause?: { message?: unknown }; prisma?: { message?: unknown } };
  };
  if (typeof e.message === "string" && e.message.trim()) return e.message;
  const nested = e.data?.cause ?? e.data?.prisma;
  if (nested && typeof (nested as { message?: unknown }).message === "string") {
    return (nested as { message: string }).message;
  }
  return String(error);
};

const UNIQUE_FIELDS_RE = /Unique constraint failed on the (?:fields|constraint):\s*(.+)$/i;
const KEY_DETAIL_RE = /Key \(([^)]+)\)=/i;
const CONSTRAINT_NAME_RE = /constraint\s+"([^"]+)"/i;

/**
 * Recognized database failure -> friendly message; otherwise null.
 * Handles Prisma (P2002/P2003/P2025/P1001/P2024) and raw Postgres
 * (23001 restrict, 23503 fk, 23505 unique, 40001/40P01 concurrency).
 */
export const translateDbError = (raw: string): string | null => {
  const msg = flatten(raw);
  if (!msg) return null;

  // ---- Unique / duplicate -----------------------------------------------
  const uniqueMatch = msg.match(UNIQUE_FIELDS_RE);
  const isPgDuplicate = /duplicate key value/i.test(msg) || /\b23505\b/.test(msg);
  if (uniqueMatch || isPgDuplicate) {
    let fields: string[] = [];
    if (uniqueMatch) {
      const token = uniqueMatch[1];
      const ids = [...token.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
      if (ids.length > 0) {
        // Constraint-style name (`crm_areas_code_key`) vs field list (`code`)
        fields = ids.map((id) =>
          /_(key|fkey|pkey|uniq)$/i.test(id) ? (parseConstraintName(id)?.column ?? "") : id.split(".").pop() ?? "",
        );
      }
    }
    if (fields.length === 0) {
      const keyDetail = msg.match(KEY_DETAIL_RE)?.[1];
      if (keyDetail) fields = keyDetail.split(",").map((f) => f.trim());
    }
    if (fields.length === 0) {
      const constraintName = msg.match(CONSTRAINT_NAME_RE)?.[1];
      if (constraintName) {
        const parsed = parseConstraintName(constraintName);
        if (parsed) fields = [parsed.column];
      }
    }
    const clean = fields.filter(Boolean);
    if (clean.length === 1) {
      return `That ${prettifyField(clean[0])} is already in use. Please use a different one.`;
    }
    return "A record with these details already exists. Please change the values and try again.";
  }

  // ---- Delete blocked by referencing rows (RESTRICT) ---------------------
  if (/violates\s+RESTRICT\s+setting/i.test(msg) || /\b23001\b/.test(msg)) {
    const constraintName = msg.match(CONSTRAINT_NAME_RE)?.[1];
    const parsed = constraintName ? parseConstraintName(constraintName) : null;
    if (parsed) {
      const parent = COLUMN_LABELS[parsed.column] ?? TABLE_LABELS[parsed.table]?.s ?? "record";
      const children = TABLE_LABELS[parsed.table]?.p ?? "other records";
      return `This ${parent} can't be deleted while it still has ${children} linked to it. Remove or reassign those ${children} first.`;
    }
    return "This record can't be deleted because other records still depend on it. Remove or reassign them first.";
  }

  // ---- Broken reference on insert / update ------------------------------
  if (/violates\s+foreign\s+key/i.test(msg) || /Foreign key constraint violated/i.test(msg) || /\b23503\b/.test(msg)) {
    const fieldsMatch = msg.match(/on the fields:\s*\(([^)]+)\)/i);
    const constraintName = msg.match(CONSTRAINT_NAME_RE)?.[1];
    const field =
      fieldsMatch?.[1]?.split(",")[0]?.replace(/[`"\s]/g, "") ??
      (constraintName ? parseConstraintName(constraintName)?.column ?? "" : "");
    if (field) {
      return `The selected ${prettifyField(field)} no longer exists. Please refresh and choose again.`;
    }
    return "One of the selected references no longer exists. Please refresh and try again.";
  }

  // ---- Record missing ----------------------------------------------------
  if (/\bP2025\b/i.test(msg) || /record (?:to |)(?:delete|update|create)? ?does not exist/i.test(msg) || /required record.*not found/i.test(msg)) {
    return "This record no longer exists. It may have been deleted by someone else.";
  }

  // ---- Concurrency / connection -----------------------------------------
  if (/\b40P01\b/.test(msg) || /deadlock/i.test(msg) || /\b40001\b/.test(msg) || /could not serialize/i.test(msg)) {
    return "The database is busy right now. Please try again in a moment.";
  }
  if (/\bP1001\b/i.test(msg) || /Can't reach database server/i.test(msg)) {
    return "Can't reach the database. Check your connection and try again.";
  }
  if (/\bP2024\b/i.test(msg) || /Timed out fetching a new connection/i.test(msg)) {
    return "This took too long to complete. Please try again.";
  }

  return null;
};

/** Friendly message for any thrown value: DB translation, else original text, else fallback. */
export const getFriendlyErrorMessage = (error: unknown, fallback = "Something went wrong. Please try again."): string => {
  const raw = extractRawMessage(error);
  const translated = translateDbError(raw);
  if (translated) return translated;
  if (raw.trim()) return raw;
  return fallback;
};

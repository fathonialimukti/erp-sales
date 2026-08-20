### Task 10: i18n keys (final sweep)

**Files:**
- Modify: `apps/client/src/locales/en.json`, `apps/client/src/locales/id.json`

**Frozen contract:**

Add all missing keys for the budgeting module. Check what Task 8/9 already added; add ONLY what's missing (avoid duplicates — merge carefully).

**Key namespaces:**
- `nav.budgeting` (nav group label), `nav.budget`, `nav.budget_line`, `nav.budget_type`, `nav.budget_period`, `nav.action_type`, `nav.event_type`, `nav.vendor`, `nav.section.budgeting`
- `budget.*` — BudgetPage: `budget.index.title`, `budget.index.subtitle`, `budget.index.header_*` (type, period, scope, region, area, allocated, committed, spent, remaining, usage), `budget.index.scope_region`, `budget.index.scope_area`, `budget.index.period_hint`
- `budgetType.*`, `budgetPeriod.*`, `budgetLine.*`, `actionType.*`, `eventType.*`, `vendor.*` — full CRUD page keys following the `region.*` convention: `X.index.title/subtitle/header_code/header_name/...`, `X.detail.*`, `X.form.*` (field labels, placeholders, section titles, buttons, success/error messages, modal confirm), `X.delete_confirm*`, `X.success.created/updated/deleted`
- `budgetLine.form.field_scope/field_region/field_area/field_amount/field_type/field_period`, `budgetLine.summary.*` (allocated/committed/spent/remaining labels)
- `actionProgram.form.*` additions: `field_action_type`, `field_budget_line`, `field_outlet_cost`, `field_outlet_explanation`, `budget_line_hint`, `period_suggestion`
- `eventProposal.form.*` additions: `field_event_type`, `field_budget_line`, `misc_items.*` (title, add, remove, field_name, field_category, field_quantity, field_price, field_total), `vendors.*` (title, add, remove, field_vendor, field_scope, field_amount, field_notes, `payments.*` title/add/remove/field_amount/field_date/field_method/field_reference), `field_budget_line`
- `salesOrder.form.*` additions: `discount_banner` ("Discount program found: {name}"), `discount_program_link`

**Rules (repo memory):**
- English `en.json` = source of truth; `id.json` = Indonesian translation (translate properly — Indonesian, not copy-paste)
- Flat keys (no nesting), kebab/snake case keys as existing (`region.form.field_code`)
- Keep alphabetical-ish grouping per module like existing files
- `defaultMessage` in components must match the en.json value

**Steps:**
- [ ] Read existing en.json + id.json structure (region.* block as reference)
- [ ] Add all missing keys to both files (balanced — every key in both)
- [ ] Verify: `cd apps/client && bun run check-types` (react-intl types may validate messages — if not typed, at least ensure valid JSON via `bun -e "JSON.parse(...)"`)
- [ ] Report: key count added, verification result

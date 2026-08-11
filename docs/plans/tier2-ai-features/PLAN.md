# Tier 2 AI Features — Plan

## Goal
Four in-page AI features following the same "button → hidden textbox → inline result" pattern as AI Fill / Tier 1 (no chatbox).

1. **AI Report Narrator** — reports get an "Explain report" button producing a Markdown narrative with the actual numbers.
2. **AI Customer 360 Brief** — customer detail gets a "Customer brief" button producing a pre-meeting scannable brief.
3. **AI Duplicate Detector** — customer/outlet lists get a "Check duplicates" button flagging likely duplicate records.
4. **AI Knowledge Base Writer** — KB form gets a "Draft from text" button that turns pasted conversation/text into a clean knowledge entry (title + content + source).

## Task DAG

```
T1: Backend report-narrate route   (apps/server/src/routes/ai-report-narrate.ts + index.ts)
T2: Backend customer-360 route     (apps/server/src/routes/ai-customer-360.ts + index.ts)
T3: Backend duplicate-check route  (apps/server/src/routes/ai-duplicate-check.ts + index.ts)
T4: Backend kb-writer route        (apps/server/src/routes/ai-kb-writer.ts + index.ts)
  └── T1–T4 independent → parallel
T5: Frontend AiReportNarrate component      (apps/client/src/components/AiReportNarrate.tsx)
T6: Frontend AiCustomerBrief component      (apps/client/src/components/AiCustomerBrief.tsx)
T7: Frontend AiDuplicateCheck component     (apps/client/src/components/AiDuplicateCheck.tsx)
T8: Frontend AiKbWriter component           (apps/client/src/components/AiKbWriter.tsx)
  └── T5–T8 independent → parallel
T9:  Wire report-narrate into SalesReport
T10: Wire customer-360 into CustomerDetailPage
T11: Wire duplicate-check into CustomerIndexPage + OutletIndexPage
T12: Wire kb-writer into KnowledgeBaseFormPage
T13: i18n keys (en.json + id.json)
T14: Typecheck + verify
```

## Frozen contracts

### T1 — report-narrate
- Route: `POST /api/ai/report-narrate`
- Body: `{ reportType: string, filters?: unknown, summaryJson?: string, contextJson?: string }`
- Auth: `authUserId` pattern from `ai-form-fill.ts`
- Uses `generateText`. Prompt: business analyst narrates the provided report summary (KPIs + deltas) into 3 paragraphs Markdown: what's up, what's down, what to watch.
- Returns `{ narrative: string }`

### T2 — customer-360
- Route: `POST /api/ai/customer-360`
- Body: `{ customerId: string }`
- Auth: same pattern
- Server fetches customer + outlets + contacts + sales-order aggregates (revenue, order count, open orders, top SKUs, visit count). Builds compact context. `generateText` → Markdown brief: profile, money, activity, risks/opportunities.
- Returns `{ brief: string }`

### T3 — duplicate-check
- Route: `POST /api/ai/duplicate-check`
- Body: `{ dataset: 'customer' | 'outlet' }`
- Auth: same pattern
- Server fetches all customers (or outlets) + contacts/phones. `generateObject` schema `z.object({ duplicates: z.array(z.object({ a: z.string(), b: z.string(), reason: z.string(), confidence: z.number().min(0).max(1) })) })`.
- Returns `{ duplicates: [...] }`

### T4 — kb-writer
- Route: `POST /api/ai/kb-writer`
- Body: `{ text: string, instruction?: string }`
- Auth: same pattern
- Uses `generateObject` schema `z.object({ title: z.string(), content: z.string(), source: z.string() })`.
- Returns `{ data: { title, content, source } }`

### T5 — AiReportNarrate
- Props: `{ reportType: string, filters?: unknown, summary: unknown }`
- Button "Explain report" → hidden box → "Explain" → calls `/api/ai/report-narrate` → renders Markdown narrative

### T6 — AiCustomerBrief
- Props: `{ customerId: string, name?: string }`
- Button "Customer brief" → hidden box → "Generate" → calls `/api/ai/customer-360` → renders Markdown brief

### T7 — AiDuplicateCheck
- Props: `{ dataset: 'customer' | 'outlet' }`
- Button "Check duplicates" → hidden box → "Scan" → calls `/api/ai/duplicate-check` → renders list of flagged duplicate pairs with reason + confidence

### T8 — AiKbWriter
- Props: `none` — reads aiFormFillAtom? No. Instead accepts callbacks or uses the KB form's `useAiFillForm`.
- Actually: Button "Draft from text" → hidden textarea to paste raw text + optional instruction → "Generate" → calls `/api/ai/kb-writer` → sets `aiFormFillAtom` with `{ title, content, source }` so the KB form's `useAiFillForm` fills the fields.

### T9 — Wire report-narrate
- `SalesReport.tsx` + other 3 report sections: add `<AiReportNarrate reportType="sales" summary={summary} filters={filters} />` near export/print buttons.

### T10 — Wire customer-360
- `CustomerDetailPage.tsx`: add `<AiCustomerBrief customerId={customer.id} />` in NavButtonGroup.

### T11 — Wire duplicate-check
- `CustomerIndexPage.tsx`: add `<AiDuplicateCheck dataset="customer" />` near header toolbar.
- `OutletIndexPage.tsx`: add `<AiDuplicateCheck dataset="outlet" />`.

### T12 — Wire kb-writer
- `KnowledgeBaseFormPage.tsx`: add `<AiKbWriter />` next to the existing AiFillButton. It sets aiFormFillAtom; the page's useAiFillForm already maps title/content/source.

### T13 — i18n
- en.json + id.json: `ai.report.*`, `ai.customer360.*`, `ai.duplicate.*`, `ai.kb_writer.*` keys.

## Reference files
- `apps/server/src/routes/ai-form-fill.ts` — auth + route pattern
- `apps/server/src/routes/ai-summarize-record.ts` — record fetch + generateText + Markdown pattern
- `apps/client/src/components/AiSummarizeButton.tsx` — button→box→result pattern
- `apps/client/src/components/AiFillButton.tsx` — form-fill atom pattern
- `apps/client/src/pages/reports/sections/SalesReport.tsx` — report data shape
- `apps/client/src/pages/customer/CustomerDetailPage.tsx`
- `apps/client/src/pages/customer/CustomerIndexPage.tsx`
- `apps/client/src/pages/knowledge-base/KnowledgeBaseFormPage.tsx`

# Tier 1 AI Features — Plan

## Goal
Three in-page AI features following the exact "button → hidden textbox → inline result" pattern of `AiFillButton` (no chatbox):

1. **AI Summarize Record** — detail pages get a "Summarize" button producing a 3-5 line executive brief.
2. **Visit Log → Auto Sales Order** — visit-log detail gets "Create order from visit"; AI extracts items from notes and prefills the Sales Order form.
3. **AI Rejection Fix Suggestions** — rejected sales orders get "AI Fix suggestions" turning the rejection into a concrete checklist.

## Task DAG

```
T1: Backend summarize-record route        (apps/server/src/routes/ai-summarize-record.ts + index.ts)
T2: Backend visit-log-order route         (apps/server/src/routes/ai-visit-log-order.ts + index.ts)
T3: Backend rejection-fix route           (apps/server/src/routes/ai-rejection-fix.ts + index.ts)
  └── T1–T3 independent → parallel
T4: AiSummarizeButton component           (apps/client/src/components/AiSummarizeButton.tsx)
T5: AiVisitOrderButton component          (apps/client/src/components/AiVisitOrderButton.tsx)
T6: AiRejectionFixButton component        (apps/client/src/components/AiRejectionFixButton.tsx)
  └── T4–T6 independent → parallel
T7: Wire summarize into 5 detail pages    (sales-order, customer, visit-log, action-program, event-proposal)
T8: Wire visit-order into VisitLogDetailPage + SalesOrderFormPage query param
T9: Wire rejection-fix into SalesOrderDetailPage
T10: i18n keys (en.json + id.json)
T11: Typecheck + verify
```

## Frozen contracts

### T1 — summarize-record
- Route: `POST /api/ai/summarize-record`
- Body: `{ module: string, id: string, contextJson?: string }`
- Auth: same `authUserId` pattern as `ai-form-fill.ts`
- Uses `generateText` (streaming not required; return plain text JSON `{ summary: string }`)
- Modules: `sales-order`, `customer`, `visit-log`, `action-program`, `event-proposal`
- Server fetches the record via Prisma (reuse existing router query shapes), builds a compact context, prompts AI for a 3-5 line executive brief in Markdown
- Response: `{ summary: string }`

### T2 — visit-log-order
- Route: `POST /api/ai/visit-log-order`
- Body: `{ visitLogId: string }`
- Auth: same pattern
- Server fetches visit log (with outlet + customer + area), fetches SKU catalog (id, code, name, basePrice, baseUnit), prompts AI with `generateObject` schema:
  ```ts
  z.object({
    outletId: z.string(),
    items: z.array(z.object({
      skuId: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
      lineTotal: z.number().nonnegative(),
      notes: z.string().optional(),
    })).min(1),
    notes: z.string().optional(),
  })
  ```
- Rules: only use SKU ids from the provided catalog; only use the visit log's outlet id; never invent ids
- Response: `{ data: { outletId, items, notes } }`

### T3 — rejection-fix
- Route: `POST /api/ai/rejection-fix`
- Body: `{ salesOrderId: string }`
- Auth: same pattern
- Server fetches the sales order (with items, customer, outlet, approvalHistory), extracts the latest rejection message, prompts AI with `generateText` for a Markdown checklist of concrete fixes
- Response: `{ fixes: string }`

### T4 — AiSummarizeButton
- Props: `{ module: string, id: string, context?: Record<string, unknown> }`
- Button "Summarize" → hidden box → "Generate" → calls `/api/ai/summarize-record` → renders Markdown result inline
- Reuse `ReactMarkdown` + `remarkGfm` (already used in AiAssistant.tsx)

### T5 — AiVisitOrderButton
- Props: `{ visitLogId: string, outletName?: string }`
- Button "Create order from visit" → hidden box with instruction textarea → "Generate order" → calls `/api/ai/visit-log-order` → on success navigates to `/sales-order/create?visitLogId=<id>&outletId=<outletId>` and stores extracted items in `aiFormFillAtom` (shape: `{ outletId, items, notes }`)
- SalesOrderFormPage reads `visitLogId` query param; if present, applies `aiFormFillAtom` data via existing `useAiFillForm` (already wired for `outletId`, `items`, `notes`)

### T6 — AiRejectionFixButton
- Props: `{ salesOrderId: string }`
- Button "AI Fix suggestions" → hidden box → "Generate fixes" → calls `/api/ai/rejection-fix` → renders Markdown checklist inline
- Only rendered when `approvalStatus === "REJECTED"`

### T7 — Wire summarize
- Add `<AiSummarizeButton module="sales-order" id={record.id} context={{...}} />` to:
  - `SalesOrderDetailPage.tsx` (in the action row)
  - `CustomerDetailPage.tsx` (in NavButtonGroup)
  - `VisitLogDetailPage.tsx` (in NavButtonGroup)
  - `ActionProgramDetailPage.tsx` (in NavButtonGroup)
  - `EventProposalDetailPage.tsx` (in NavButtonGroup)

### T8 — Wire visit-order
- `VisitLogDetailPage.tsx`: add `<AiVisitOrderButton visitLogId={visitLog.id} outletName={visitLog.outlet?.name} />` in NavButtonGroup
- `SalesOrderFormPage.tsx`: read `visitLogId` from `useSearchParams`; when present, show a small banner "Order prefilled from visit log" and apply `aiFormFillAtom` (the existing `useAiFillForm` already handles `outletId`, `items`, `notes`)

### T9 — Wire rejection-fix
- `SalesOrderDetailPage.tsx`: when `record.approvalStatus === "REJECTED"`, render `<AiRejectionFixButton salesOrderId={record.id} />` in the action row

### T10 — i18n
- `en.json` + `id.json`: `ai.summarize.*`, `ai.visit_order.*`, `ai.rejection_fix.*` keys

## Reference files
- `apps/server/src/routes/ai-form-fill.ts` — auth + route pattern
- `apps/server/src/routes/ai.ts` — authUserId pattern
- `apps/client/src/components/AiFillButton.tsx` — button→box→result pattern
- `apps/client/src/components/AiAssistant/AiAssistant.tsx` — ReactMarkdown usage
- `apps/client/src/pages/visit-log/VisitLogDetailPage.tsx` — existing draft-follow-up modal pattern
- `apps/client/src/pages/sales-order/SalesOrderFormPage.tsx` — useAiFillForm wiring
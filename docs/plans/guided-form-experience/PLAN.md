# Guided Form Experience — Implementation Plan

## Research Foundation

Based on UX research (Baymard Institute, CXL, Nielsen Norman Group, SaaS UI studies 2025–2026):

- **Validate on blur** — inline validation reduces errors 22%, completion time 42%
- **Smart defaults** — pre-fill what you can infer; autofill = 30% faster
- **Progressive disclosure** — show only what's needed now
- **Contextual helper text** — visible next to field, not hidden in tooltips
- **Section completion states** — derived from actual validation, not just "visited"
- **Progress indicators** — multi-step forms with progress = 86% conversion lift
- **Positive field feedback** — "reward early, punish late" (green check on valid fields)
- **Autosave indicator** — for forms taking >30s, visible saved state reduces anxiety
- **Commitment sequencing** — easy fields first, hard fields last (builds momentum)

### Anti-slop principles applied

1. Every visual decision needs a purpose — no decoration for decoration's sake
2. Hierarchical contrast — size/weight/color differentiated on purpose
3. Whitespace as structure — space separates and connects
4. One deliberate accent — one color/gesture at the key moment
5. Liveliness dials — ENERGY 2 / RHYTHM 2 / MOTION 1 (balanced, not sterile, not flashy)

### What we skip (research says these don't fit)

- Conversational forms — slower for power users who type quickly across fields
- Multi-step wizards for simple forms — our simple forms are 2 fields
- Dark mode as default — design law forbids it

---

## Task DAG

```
Layer 1 (sequential — shared component foundation):
  T1 FormSection enhancement (completed state)
    ↓
  T2 FormPreview enhancement (animated value flash + completion accent)
    ↓
  T3 FormField enhancement (contextual hint prop)
    ↓
  T4 FormField enhancement (positive field feedback)
    ↓
  T5 PageHeader enhancement (section progress dots)
    ↓
  T6 FormLayout enhancement (smart layout modes)
    ↓
  T7 FormFooter enhancement (autosave indicator)
    ↓
Layer 2 (parallel — apply to representative forms):
  T8  RegionFormPage (simple → centered layout, no sidebar)
  T9  CustomerFormPage (standard → sidebar + hints)
  T10 SalesOrderFormPage (complex → section progress + autosave)
  T11 OutletFormPage (standard+ → input masks + helper text)
  T12 VisitLogFormPage (complex → section progress + autosave)
    ↓
Layer 3 (after all):
  QE review + test execution
```

---

## Pages to Implement (all 22)

### Simple (7 pages)
Region, Customer, Area, SkuCategory, BudgetType, ActionType, EventType

### Standard (7 pages)
BudgetPeriod, BudgetLine, Budget, ActionProgram, Vendor, Role, User

### Complex (6 pages)
Outlet, VisitLog, EmailCrm, EventProposal, KnowledgeBase, SalesOrder

### Special (2 pages)
Sku, Budget (existing custom layouts — adapt enhancements)

---

## Design Law Compliance

All enhancements respect Trustworthy Corporate:
- Semantic colors only (success green for completion, primary for progress)
- Motion uses `@/lib/motion` presets (existing `pageEnter`, `getMotionProps`)
- No gray text, no gray surfaces
- Module accents only on allowed chrome
- `font-normal` body, `font-bold` on meaning elements
- One deliberate accent per form (completion/progress feedback)

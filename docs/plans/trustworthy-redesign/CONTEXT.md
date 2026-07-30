# Trustworthy Corporate Redesign — CONTEXT

**Date:** 2026-07-30
**Author:** Full-Stack Engineer (orchestrator)
**Market:** Corporate / businessman / B2B field-sales (procurement-trustworthy)
**Path:** A — re-tune the existing law's thesis from "Bold CRM" (modern-SaaS-bold) to "Trustworthy Corporate" (restraint · structure · legibility).

## Problem

The design law (`docs/design-system/DESIGN.md`, "Bold CRM") is internally consistent and faithfully implemented. But its thesis — *bold color everywhere, high-chroma, gradient banners, bold-font-everywhere* — is tuned for modern-SaaS-punchy, not trustworthy-corporate. The live render confirms 4 anti-trust patterns:

1. **Login aside**: dark panel + glowing radial blobs (`blur-[80px] animate-pulse`) + white grid overlay + glass stat cards (`backdrop-blur-sm`) → reads cyber/Web3, not a CRM a buyer trusts. (Law §1 itself bans "Neon cyber / playful skins.")
2. **Floaty work stage**: `PrivateLayout` main = `bg-card/85 backdrop-blur-[2px]` + `bold-mesh` + `ring-1 ring-primary/5` → Apple-consumer float, not grounded corporate.
3. **Gradient banner on every page**: `PageHeader.tsx` = saturated `linear-gradient` + white-type hero on ~24 pages → every page screams. Corporate ERPs use a structured toolbar.
4. **Bold-everywhere body weight**: law §3 mandates `font-semibold`/`font-bold` as default → flattens hierarchy. Trust needs clear hierarchy (regular body + bold only where it carries meaning).

## Trustworthy Corporate thesis (amends the law's §1)

- **Primary**: Bold Azure (chroma 0.24) → **Aurora Azure** (chroma ~0.13, L ~0.5). Calmer, still confident blue. Corporate-credible. (Matches repo memory's "safer corporate" intent.)
- **Surfaces**: opaque — solid `bg-card` + 1px `border-border` + `shadow-sm`. No `backdrop-blur`, no `/85` opacity on work surfaces.
- **Background**: flat `bg-background`; `bold-mesh` reduced to near-imperceptible (≤3% tint) or removed.
- **PageHeader**: flat structured toolbar — `bg-card border-b border-border`, black text, module accent confined to a **3px left rail + eyebrow color** only. No gradient fill, no white-type hero. Same component API (all 24 call sites keep working).
- **Login**: light editorial trust panel — `bg-background` near-white, single solid Azure brand block, real proof (compliance/audit badges or one anchored stat). No blobs, no grid overlay, no glass cards.
- **Body weight**: `font-normal` (400) for body/table; `font-semibold`/`font-bold` reserved for titles, KPI values, totals, status, eyebrow. Restores hierarchy.
- **Module wash**: 14% → **8%** — wayfinding flare, not decoration.

## Propagation map (frozen)

| Concern | File(s) | Owner task |
|---|---|---|
| Law thesis + tokens | `docs/design-system/DESIGN.md`, `apps/client/src/index.css` | T1 |
| PageHeader (fixes ~24 pages at once) | `apps/client/src/components/PageHeader.tsx` | T2 |
| Login trust panel | `apps/client/src/pages/LoginPage.tsx` | T3 |
| PrivateLayout main stage | `apps/client/src/layouts/PrivateLayout.tsx` | T4 |
| Shell chrome (opacity + blur + ring) | `apps/client/src/components/{Sidebar,Topbar,DataTable,FilterBar,NavButtonGroup,UserAvatarMenu}.tsx` | T5 |
| Marketing/error surfaces | `apps/client/src/pages/{NotFoundPage,RouteErrorPage}.tsx`, `apps/client/src/layouts/PublicLayout.tsx`, `apps/client/src/pages/LandingPage.tsx` | T6 |
| Residual leakage audit (read-only) | all 24 PageHeader call sites + KpiCard + StatusChip + summary cards | T7 |

## Task DAG

```
T1 (law + tokens)  ← Foundation; everything else consumes new tokens
  ↓
T2 (PageHeader) ┐
T3 (Login)      │
T4 (Layout)     ├─ Layer 2: ALL parallel, disjoint files
T5 (Shell)      │
T6 (Mkt/Error)  ┘
  ↓
T7 (audit, read-only) → findings list (no git writes)
```

## Known follow-up (out of this plan's scope)

After T1 lowers body weight to `font-normal`, pages that **explicitly** set `font-bold`/`font-semibold` on body/table cells (per the old law) will need a cleanup pass. T7 surfaces these; a separate follow-up task strips them. Flagged so the user isn't surprised.

## Verify gate

`bun run check-types` + `bunx vitest run` after Layer 2; final Code Reviewer whole-branch review after T7. Git stays manual-only.

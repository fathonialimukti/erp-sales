# Navigation Icon Generation Plan

## Overview
Generate new SVG icons using Gemini + Nanobanana for sidebar navigation. Each icon follows the existing **Family A tile** pattern: `linearGradient` + `shine` overlay, `viewBox="0 0 64 64"`.

## Current State
- Icons stored in `apps/client/src/assets/icons/`
- Registry: `apps/client/src/assets/icons.ts`
- Nav menu config: `apps/client/src/constants/nav-menu.ts`
- Some icons reused across multiple modules (e.g., `navPlanning` used for Budget, Budget Types, Budget Periods, Budget Lines, Action Types)

## Icons to Generate

### Budgeting Module (replace reused `navPlanning`)
| Key | Label | Gradient Theme |
|-----|-------|----------------|
| `navBudget` | Budget | Emerald → Teal (`#10B981 → #0D9488`) |
| `navBudgetType` | Budget Types | Amber → Gold (`#F59E0B → #D97706`) |
| `navBudgetPeriod` | Budget Periods | Calendar theme: Blue → Indigo (`#60A5FA → #4338CA`) |
| `navBudgetLine` | Budget Lines | Line chart: Violet → Purple (`#A78BFA → #7C3AED`) |
| `navActionType` | Action Types | Checklist: Green → Emerald (`#22C55E → #16A34A`) |
| `navEventType` | Event Types | Calendar badge: Rose → Red (`#FB7185 → #E11D48`) |

### Other Modules (distinct icons)
| Key | Label | Gradient Theme |
|-----|-------|----------------|
| `navVendor` | Vendors | Warehouse: Orange → Red-Orange (`#F97316 → #EA580C`) |
| `navSales` | Sales (group) | Sales chart: Blue → Cyan (`#3B82F6 → #06B6D4`) |
| `navFieldOps` | Field Ops (group) | GPS pin: Green → Lime (`#10B981 → #84CC16`) |
| `navSettingsPersonal` | Settings (Personal) | Gear: Sky → Blue (`#38BDF8 → #2563EB`) |
| `navSettingsApp` | Settings (App) | Gear: Purple → Violet (`#A855F7 → #7C3AED`) |

## File Naming Convention
- Format: `nav-<module-name>.svg`
- Example: `nav-budget.svg`, `nav-budget-type.svg`

## Implementation Steps
1. Generate SVG files via Gemini + Nanobanana
2. Add imports to `icons.ts`
3. Add entries to `icons` object in `icons.ts`
4. Update `nav-menu.ts` to use new icon keys
5. Verify no duplicate gradient IDs in DOM

## Visual Style Guide
- **Size**: 64x64 viewBox
- **Border radius**: 16px (`rx="16"`)
- **Gradient**: `linearGradient` with `x1="0" y1="0" x2="64" y2="64"`
- **Shine overlay**: `linearGradient id="shine-*"` with white opacity fade
- **Icon glyph**: White fill with varying opacities for depth

# Task 6: App settings page

**Files:**
- Create: `apps/client/src/pages/settings/AppSettingsPage.tsx`

**Interfaces:**
- Consumes: `trpcClient.settings.get/update` (T3), `appSettingsSchema` types (T1), `useToast`, `PageHeader`, `useMeta`, `useIntl`, `hasPermissionAtom`.
- Produces: `AppSettingsPage` named export — consumed by T9 routes.

## Frozen contract

### Page
- Route: `/settings/app` (admin). Named export `AppSettingsPage`.
- Guard: if `!hasPermission('settings@read')` → render access-denied state (reuse pattern from other pages).
- `useMeta` title/description from `settings.app.*` i18n keys.
- `PageHeader` with `module="settings"`, title `settings.app.title`, subtitle `settings.app.subtitle`.
- Sections (cards, `bg-card` opaque):
  1. **Company profile** — name, tagline, address, taxId, email, phone.
  2. **General** — currencySymbol, currencyCode, fiscalYearStartMonth (select 1-12), defaultPageSize, passwordMinLength, auditLogRetentionDays.
  3. **AI provider** — baseUrl, model, apiKey (password input, placeholder `••••••` when set, empty = keep existing).
  4. **Embeddings** — baseUrl, model, apiKey (password), dimensions, similarityThreshold (0-1 step 0.05).
  5. **Outbound email (SMTP)** — host, port, user, pass (password, write-only), from, domain.
  6. **Email agent** — name, title, company, maxThreadChars.
  7. **System identity** — aiSystemEmail, systemUserId.
- Load via `useQuery({ queryKey: ['appSettings'], queryFn: () => trpcClient.settings.get.query() })`.
- Save via `useMutation` → `trpcClient.settings.update.mutate(patch)` → toast `settings.app.saved` → invalidate `['appSettings']`.
- **Secrets**: apiKey/pass fields show `••••••` placeholder when `hasValue`; empty input on save = keep existing (never send empty to overwrite). Add helper text `settings.app.secret_hint`.
- Form state initialized from loaded settings; dirty tracking; Save button disabled when pristine.
- Design law: opaque `bg-card`, no backdrop-blur, black data text, `font-normal` body, module color `settings`. Use `ui-ux-pro-max` for layout craft.

**Steps:**
- [ ] Create AppSettingsPage.tsx with all sections
- [ ] Implement write-only secret fields
- [ ] `bunx tsc --noEmit` in apps/client

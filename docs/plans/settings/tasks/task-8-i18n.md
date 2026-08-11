# Task 8: i18n keys (en.json + id.json)

**Files:**
- Modify: `apps/client/src/locales/en.json`
- Modify: `apps/client/src/locales/id.json`

**Interfaces:**
- Produces: `settings.*` keys — consumed by T5/T6 pages and T9 nav.

## Frozen contract

### Key namespace
All keys under `settings.*` (dotted, matching existing style). Grep the exact `id` strings first to avoid duplicates (repo convention).

### en.json keys
```
"settings.personal.title": "Settings",
"settings.personal.subtitle": "Manage your personal preferences.",
"settings.personal.saved": "Settings saved",
"settings.personal.section_profile": "Profile",
"settings.personal.section_preferences": "Preferences",
"settings.personal.section_notifications": "Notifications",
"settings.personal.section_signature": "Email signature",
"settings.personal.section_filters": "Default filters",
"settings.personal.field_locale": "Language",
"settings.personal.field_theme": "Theme",
"settings.personal.field_page_size": "Default page size",
"settings.personal.field_timezone": "Timezone",
"settings.personal.field_in_app": "In-app notifications",
"settings.personal.field_email_digest": "Email digest",
"settings.personal.field_signature": "Signature",
"settings.personal.field_region": "Default region",
"settings.personal.field_area": "Default area",
"settings.personal.save": "Save changes",

"settings.app.title": "App settings",
"settings.app.subtitle": "Organization-wide configuration.",
"settings.app.saved": "App settings saved",
"settings.app.secret_hint": "Leave blank to keep the current value.",
"settings.app.section_company": "Company profile",
"settings.app.section_general": "General",
"settings.app.section_ai": "AI provider",
"settings.app.section_embedding": "Embeddings",
"settings.app.section_smtp": "Outbound email (SMTP)",
"settings.app.section_email_agent": "Email agent",
"settings.app.section_system": "System identity",
"settings.app.field_name": "Company name",
"settings.app.field_tagline": "Tagline",
"settings.app.field_address": "Address",
"settings.app.field_tax_id": "Tax ID",
"settings.app.field_email": "Email",
"settings.app.field_phone": "Phone",
"settings.app.field_currency_symbol": "Currency symbol",
"settings.app.field_currency_code": "Currency code",
"settings.app.field_fiscal_month": "Fiscal year starts in",
"settings.app.field_page_size": "Default page size",
"settings.app.field_password_min": "Minimum password length",
"settings.app.field_audit_retention": "Audit log retention (days)",
"settings.app.field_ai_base_url": "Base URL",
"settings.app.field_ai_model": "Model",
"settings.app.field_ai_api_key": "API key",
"settings.app.field_embedding_base_url": "Base URL",
"settings.app.field_embedding_model": "Model",
"settings.app.field_embedding_api_key": "API key",
"settings.app.field_embedding_dimensions": "Dimensions",
"settings.app.field_embedding_threshold": "Similarity threshold",
"settings.app.field_smtp_host": "Host",
"settings.app.field_smtp_port": "Port",
"settings.app.field_smtp_user": "Username",
"settings.app.field_smtp_pass": "Password",
"settings.app.field_smtp_from": "From",
"settings.app.field_smtp_domain": "Domain",
"settings.app.field_agent_name": "Name",
"settings.app.field_agent_title": "Title",
"settings.app.field_agent_company": "Company",
"settings.app.field_agent_max_thread": "Max thread chars",
"settings.app.field_system_email": "AI system email",
"settings.app.field_system_user": "System user ID",
"settings.app.save": "Save changes",
"settings.app.access_denied": "You do not have permission to view app settings.",

"nav.settings": "Settings",
"nav.settings_personal": "My settings",
"nav.settings_app": "App settings",
"user.menu.settings": "Settings",
```

### id.json
Translate all of the above to Bahasa Indonesia (match existing tone in id.json). Example:
```
"settings.personal.title": "Pengaturan",
"settings.personal.subtitle": "Kelola preferensi pribadi Anda.",
"settings.personal.saved": "Pengaturan disimpan",
...
"nav.settings": "Pengaturan",
"nav.settings_personal": "Pengaturan saya",
"nav.settings_app": "Pengaturan aplikasi",
"user.menu.settings": "Pengaturan",
```

**Steps:**
- [ ] Add en.json keys
- [ ] Add id.json translations
- [ ] Verify no duplicate keys (grep)

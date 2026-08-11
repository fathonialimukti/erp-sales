import type { Prisma } from '../prisma/generated/client';
import type { DbClient } from './prisma.js';
import type { AppSettings, UserSettings } from '@repo/schemas/settings';

// =============================================
// Settings service — DB read + env fallback + 30s cache
// =============================================

/**
 * Router-facing shape for app settings: secret fields are masked to
 * `{ hasValue: boolean }` so real values never leave the server.
 */
export type MaskedAppSettings = Omit<AppSettings, 'ai' | 'smtp'> & {
  ai: Omit<NonNullable<AppSettings['ai']>, 'apiKey'> & { apiKey: { hasValue: boolean } };
  smtp: Omit<NonNullable<AppSettings['smtp']>, 'pass'> & { pass: { hasValue: boolean } };
};

/** Patch shape accepted by `setAppSettings` — all keys optional, secrets write-only. */
export type AppSettingsPatch = AppSettings;

/** Patch shape accepted by `setUserSettings`. */
export type UserSettingsPatch = UserSettings;

// --- Env fallback mapping (DB key -> env var -> default) ---

type EnvFallback = { env: string; default: unknown };

const APP_SETTING_FALLBACKS: Record<string, EnvFallback> = {
  'ai.baseUrl': { env: 'AI_BASE_URL', default: 'http://localhost:20128/v1' },
  'ai.apiKey': { env: 'AI_API_KEY', default: '' },
  'ai.model': { env: 'AI_MODEL', default: 'chatbot' },
  'smtp.host': { env: 'SMTP_HOST', default: 'smtp-relay.brevo.com' },
  'smtp.port': { env: 'SMTP_PORT', default: 587 },
  'smtp.user': { env: 'SMTP_USER', default: '' },
  'smtp.pass': { env: 'SMTP_PASS', default: '' },
  'smtp.from': { env: 'SMTP_FROM', default: 'AetherGlo Sales <info@aetherglo.com>' },
  'smtp.domain': { env: 'SMTP_DOMAIN', default: 'aetherglo.com' },
  'emailAgent.title': { env: 'EMAIL_AGENT_TITLE', default: 'Sales Representative' },
  'emailAgent.company': { env: 'EMAIL_AGENT_COMPANY', default: 'AetherGlo' },
  'emailAgent.maxThreadChars': { env: 'EMAIL_CONCIERGE_MAX_THREAD_CHARS', default: 12000 },
  'system.aiSystemEmail': { env: 'AI_SYSTEM_EMAIL', default: 'ai-system@mail.com' },
  'system.systemUserId': { env: 'SYSTEM_USER_ID', default: '' },
};

// Company defaults (no env fallback)
const COMPANY_DEFAULTS: Record<string, unknown> = {
  'company.name': 'AetherGlo',
  'company.tagline': '',
  'company.address': '',
  'company.taxId': '',
  'company.email': '',
  'company.phone': '',
};

// General defaults (no env fallback)
const GENERAL_DEFAULTS: Record<string, unknown> = {
  'general.currencySymbol': '$',
  'general.currencyCode': 'USD',
  'general.fiscalYearStartMonth': 1,
  'general.defaultPageSize': 10,
  'general.passwordMinLength': 6,
  'general.auditLogRetentionDays': 365,
};

/** Secret keys that are never returned in plaintext. */
const SECRET_KEYS = new Set(['ai.apiKey', 'smtp.pass']);

// --- Cache (30s TTL) ---

const CACHE_TTL_MS = 30_000;
const appSettingsCache = new Map<string, { value: unknown; at: number }>();

function cacheGet(key: string): unknown | undefined {
  const entry = appSettingsCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    appSettingsCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet(key: string, value: unknown) {
  appSettingsCache.set(key, { value, at: Date.now() });
}

function cacheInvalidate() {
  appSettingsCache.clear();
}

// --- Helpers ---

function envValue(fallback: EnvFallback): unknown {
  const raw = process.env[fallback.env];
  if (raw === undefined || raw === '') return fallback.default;
  const def = fallback.default;
  if (typeof def === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : def;
  }
  return raw;
}

function fallbackFor(key: string): unknown {
  const mapped = APP_SETTING_FALLBACKS[key];
  if (mapped) return envValue(mapped);
  if (key in COMPANY_DEFAULTS) return COMPANY_DEFAULTS[key];
  if (key in GENERAL_DEFAULTS) return GENERAL_DEFAULTS[key];
  return undefined;
}

function isSecretKey(key: string): boolean {
  return SECRET_KEYS.has(key);
}

/** Effective value for a single dotted key: DB -> env -> default. */
export async function getSettingValue(db: DbClient, key: string): Promise<unknown> {
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  const row = await db.appSetting.findUnique({ where: { key } });
  if (row) {
    cacheSet(key, row.value);
    return row.value;
  }
  // Env fallbacks are cheap and mutable (tests / .env reloads) — never cache.
  return fallbackFor(key);
}

/**
 * Real secret value for `ai.apiKey` / `smtp.pass` (DB -> env -> default).
 * Server-side only — never exposed via the router.
 */
export async function getSecretValue(db: DbClient, key: string): Promise<string> {
  const value = await getSettingValue(db, key);
  return typeof value === 'string' ? value : '';
}

// --- App settings ---

/**
 * Fully-typed `AppSettings` object. DB value wins per dotted key; otherwise
 * env fallback; otherwise default. Secret fields are masked to `{ hasValue }`.
 */
export async function getAppSettings(db: DbClient): Promise<MaskedAppSettings> {
  const rows = await db.appSetting.findMany();
  const dbValues = new Map(rows.map((r) => [r.key, r.value]));

  const read = (key: string): unknown => {
    if (dbValues.has(key)) return dbValues.get(key);
    return fallbackFor(key);
  };

  const secret = (key: string): { hasValue: boolean } => {
    const value = read(key);
    return { hasValue: typeof value === 'string' && value.length > 0 };
  };

  return {
    ai: {
      baseUrl: read('ai.baseUrl') as string,
      apiKey: secret('ai.apiKey'),
      model: read('ai.model') as string,
    },
    smtp: {
      host: read('smtp.host') as string,
      port: read('smtp.port') as number,
      user: read('smtp.user') as string,
      pass: secret('smtp.pass'),
      from: read('smtp.from') as string,
      domain: read('smtp.domain') as string,
    },
    emailAgent: {
      title: read('emailAgent.title') as string,
      company: read('emailAgent.company') as string,
      maxThreadChars: read('emailAgent.maxThreadChars') as number,
    },
    system: {
      aiSystemEmail: read('system.aiSystemEmail') as string,
      systemUserId: read('system.systemUserId') as string,
    },
    company: {
      name: read('company.name') as string,
      tagline: read('company.tagline') as string,
      address: read('company.address') as string,
      taxId: read('company.taxId') as string,
      email: read('company.email') as string,
      phone: read('company.phone') as string,
    },
    general: {
      currencySymbol: read('general.currencySymbol') as string,
      currencyCode: read('general.currencyCode') as string,
      fiscalYearStartMonth: read('general.fiscalYearStartMonth') as number,
      defaultPageSize: read('general.defaultPageSize') as number,
      passwordMinLength: read('general.passwordMinLength') as number,
      auditLogRetentionDays: read('general.auditLogRetentionDays') as number,
    },
  };
}

/**
 * Upsert each provided key. Secret keys: empty string or undefined = keep
 * existing (skip write); non-empty = write new value. Invalidates the cache.
 */
export async function setAppSettings(
  db: DbClient,
  patch: AppSettingsPatch,
  updatedBy: string,
): Promise<void> {
  const entries = flattenPatch(patch);
  for (const [key, value] of entries) {
    if (isSecretKey(key)) {
      if (typeof value !== 'string' || value === '') continue; // keep existing
    }
    await db.appSetting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue, updatedBy },
      update: { value: value as Prisma.InputJsonValue, updatedBy },
    });
  }
  cacheInvalidate();
}

// --- Personal settings ---

const USER_SETTING_DEFAULTS: Record<string, unknown> = {
  locale: 'en',
  theme: 'light',
  defaultPageSize: 10,
  timezone: '',
  emailSignature: '',
  'notifications.inApp': true,
  'notifications.emailDigest': false,
  defaultRegionId: '',
  defaultAreaId: '',
};

/** Typed `UserSettings` with defaults. */
export async function getUserSettings(db: DbClient, userId: string): Promise<UserSettings> {
  const rows = await db.userSetting.findMany({ where: { userId } });
  const values = new Map(rows.map((r) => [r.key, r.value]));

  const read = (key: string): unknown => {
    if (values.has(key)) return values.get(key);
    return USER_SETTING_DEFAULTS[key];
  };

  return {
    locale: read('locale') as 'en' | 'id',
    theme: read('theme') as 'light' | 'dark',
    defaultPageSize: read('defaultPageSize') as number,
    timezone: read('timezone') as string,
    emailSignature: read('emailSignature') as string,
    notifications: {
      inApp: read('notifications.inApp') as boolean,
      emailDigest: read('notifications.emailDigest') as boolean,
    },
    defaultRegionId: read('defaultRegionId') as string,
    defaultAreaId: read('defaultAreaId') as string,
  };
}

/** Upsert each provided key. */
export async function setUserSettings(
  db: DbClient,
  userId: string,
  patch: UserSettingsPatch,
): Promise<void> {
  const entries = flattenPatch(patch);
  for (const [key, value] of entries) {
    await db.userSetting.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue },
    });
  }
}

// --- Patch flattening ---

/** Flatten a nested settings object into dotted-key entries, skipping undefined. */
function flattenPatch(patch: Record<string, unknown>): Array<[string, unknown]> {
  const entries: Array<[string, unknown]> = [];
  for (const [group, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const [key, sub] of Object.entries(value as Record<string, unknown>)) {
        if (sub === undefined) continue;
        entries.push([`${group}.${key}`, sub]);
      }
    } else {
      entries.push([group, value]);
    }
  }
  return entries;
}

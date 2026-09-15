import { Prisma } from '../prisma/generated/client.js';
import type { DbClient } from './prisma.js';

// =============================================
// App Settings seed — INSERT defaults only
// =============================================

/**
 * Env → appSetting defaults. Only keys whose env var is set are considered;
 * unset vars never seed a row.
 */
function seedEntries(env: NodeJS.ProcessEnv): Array<[string, string | undefined, boolean?]> {
  return [
    // AI provider
    ['ai.baseUrl', env.AI_BASE_URL],
    ['ai.apiKey', env.AI_API_KEY],
    ['ai.model', env.AI_MODEL],
    ['ai.embeddingBaseUrl', env.AI_EMBEDDING_BASE_URL],
    ['ai.embeddingApiKey', env.AI_EMBEDDING_API_KEY],
    ['ai.embeddingModel', env.AI_EMBEDDING_MODEL],
    ['ai.embeddingDimensions', env.AI_EMBEDDING_DIMENSIONS, true],
    // Outbound email (SMTP)
    ['smtp.host', env.SMTP_HOST],
    ['smtp.port', env.SMTP_PORT, true],
    ['smtp.secure', env.SMTP_SECURE],
    ['smtp.user', env.SMTP_USER],
    ['smtp.pass', env.SMTP_PASS],
    ['smtp.from', env.SMTP_FROM],
    ['smtp.domain', env.SMTP_DOMAIN],
    // Email agent
    ['emailAgent.title', env.EMAIL_AGENT_TITLE],
    ['emailAgent.company', env.EMAIL_AGENT_COMPANY],
    ['emailAgent.maxThreadChars', env.EMAIL_CONCIERGE_MAX_THREAD_CHARS, true],
    // System identity
    ['system.aiSystemEmail', env.AI_SYSTEM_EMAIL],
    // Company
    ['company.name', env.COMPANY_NAME],
  ];
}

/**
 * Seed app settings from env **without clobbering** existing rows.
 *
 * DB `appSetting` is authoritative over env at read time, so a plain reseed
 * (`prisma db seed` without a schema reset) must not overwrite a value the user
 * configured from the Settings UI. `createMany({ skipDuplicates: true })` is
 * insert-only, which guarantees exactly that — existing rows are never updated.
 *
 * It cannot survive a reset, though: `db:all` runs `db push --force-reset`
 * first, which drops the table (and any user-configured `smtp.port`/`smtp.pass`
 * with it) before seeding, so the env/bootstrap default is re-inserted.
 *
 * Returns the number of rows actually inserted.
 */
export async function seedAppSettings(
  db: DbClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  const data: Prisma.AppSettingCreateManyInput[] = [];
  for (const [key, raw, numeric] of seedEntries(env)) {
    if (!raw) continue;
    const value = numeric ? Number(raw) : raw;
    if (numeric && !Number.isFinite(value)) continue;
    data.push({ key, value: value as Prisma.InputJsonValue, updatedBy: 'seed' });
  }
  if (data.length === 0) return 0;
  const result = await db.appSetting.createMany({ data, skipDuplicates: true });
  return result.count;
}

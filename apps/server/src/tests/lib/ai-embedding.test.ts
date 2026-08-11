import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getEmbeddingDimensions,
  getEmbeddingModelId,
  getEmbeddingSimilarityThreshold,
  isEmbeddingConfigured,
  toPgVectorLiteral,
} from '../../lib/ai-embedding.js';
import { prisma } from '../../lib/prisma.js';
import { setAppSettings, type AppSettingsPatch } from '../../lib/settings-service.js';

// AI provider env vars consumed by settings-service fallbacks.
const ENV_KEYS = ['AI_BASE_URL', 'AI_API_KEY', 'AI_MODEL', 'EMBEDDING_DIMENSIONS'] as const;
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function stashEnv() {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
}
function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

// getSettingValue resolves DB rows over env defaults and caches hits for 30s.
// DB rows are the only way to force a falsy AI config (env defaults are truthy)
// and to set the embedding.similarityThreshold tuning knob (no env mapping).
async function setSetting(key: string, value: unknown) {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: value as never, updatedBy: 'test' },
    update: { value: value as never, updatedBy: 'test' },
  });
  // invalidate the 30s read cache so the next read sees the new row
  await setAppSettings(prisma, {} as AppSettingsPatch, 'test');
}
async function resetSettings(keys: string[]) {
  await prisma.appSetting.deleteMany({ where: { key: { in: keys } } });
  await setAppSettings(prisma, {} as AppSettingsPatch, 'test');
}

const AI_KEYS = ['ai.baseUrl', 'ai.model', 'ai.apiKey'];

beforeEach(async () => {
  stashEnv();
  await resetSettings([...AI_KEYS, 'embedding.similarityThreshold']);
});

afterEach(() => {
  restoreEnv();
});

describe('isEmbeddingConfigured', () => {
  it('is false when AI base URL or model missing', async () => {
    await setSetting('ai.baseUrl', '');
    await setSetting('ai.model', '');
    expect(await isEmbeddingConfigured(prisma)).toBe(false);

    await setSetting('ai.baseUrl', 'https://embed.example/v1');
    await setSetting('ai.model', '');
    expect(await isEmbeddingConfigured(prisma)).toBe(false);

    await setSetting('ai.model', 'text-embedding-3-small');
    await setSetting('ai.baseUrl', '');
    expect(await isEmbeddingConfigured(prisma)).toBe(false);
  });

  it('is true when AI base URL and model are set (API key optional)', async () => {
    await setSetting('ai.baseUrl', 'https://embed.example/v1');
    await setSetting('ai.model', 'text-embedding-3-small');
    await resetSettings(['ai.apiKey']);
    expect(await isEmbeddingConfigured(prisma)).toBe(true);
  });

  it('reads AI provider config from env when no DB rows exist', async () => {
    process.env.AI_BASE_URL = 'https://env.example/v1';
    process.env.AI_MODEL = 'env-model';
    await resetSettings(AI_KEYS);
    expect(await isEmbeddingConfigured(prisma)).toBe(true);
    expect(await getEmbeddingModelId(prisma)).toBe('env-model');
  });
});

describe('embedding config helpers', () => {
  it('defaults dimensions to 1536', async () => {
    expect(await getEmbeddingDimensions(prisma)).toBe(1536);
  });

  it('locks dimensions to 1536 even when EMBEDDING_DIMENSIONS differs', async () => {
    process.env.EMBEDDING_DIMENSIONS = '768';
    expect(await getEmbeddingDimensions(prisma)).toBe(1536);
  });

  it('parses similarity threshold from settings', async () => {
    await setSetting('embedding.similarityThreshold', 0.42);
    expect(await getEmbeddingSimilarityThreshold(prisma)).toBe(0.42);
  });

  it('defaults similarity threshold to 0.5', async () => {
    await resetSettings(['embedding.similarityThreshold']);
    expect(await getEmbeddingSimilarityThreshold(prisma)).toBe(0.5);
  });

  it('formats pgvector literals', () => {
    expect(toPgVectorLiteral([0.1, -0.2, 3])).toBe('[0.1,-0.2,3]');
  });
});

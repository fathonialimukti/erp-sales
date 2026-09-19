import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getEmbeddingDimensions,
  getEmbeddingModelId,
  getEmbeddingSimilarityThreshold,
  isEmbeddingConfigured,
  toPgVectorLiteral,
} from '../../lib/ai-embedding.js';
import { prisma } from '../../lib/prisma.js';
import { setAppSettings, type AppSettingsPatch } from '../../lib/settings-service.js';

// AI provider env vars consumed by settings-service fallbacks. The live .env
// holds real provider config, and getSettingValue resolves DB row -> env ->
// default, so wiping the DB rows alone still leaves the env vars in charge.
// Clear the full AI_* set per test for a clean slate; the env-reading tests
// set exactly the vars they need.
const ENV_KEYS = [
  'AI_BASE_URL',
  'AI_API_KEY',
  'AI_MODEL',
  'AI_EMBEDDING_BASE_URL',
  'AI_EMBEDDING_API_KEY',
  'AI_EMBEDDING_MODEL',
  'AI_EMBEDDING_DIMENSIONS',
] as const;
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

const AI_KEYS = [
  'ai.baseUrl',
  'ai.model',
  'ai.apiKey',
  'ai.embeddingDimensions',
  'ai.embeddingBaseUrl',
  'ai.embeddingModel',
  'ai.embeddingApiKey',
];

// The suite shares one database with the running app — snapshot real ai.*
// rows before the first wipe and restore them after, so tests never destroy
// the configured provider (a previous delete-only reset nuked live settings).
let settingsSnapshot: Array<{ key: string; value: unknown }> = [];

beforeEach(async () => {
  if (settingsSnapshot.length === 0) {
    settingsSnapshot = await prisma.appSetting.findMany({
      where: { key: { in: AI_KEYS } },
      select: { key: true, value: true },
    });
  }
  stashEnv();
  // start each test from a clean AI env — restoreEnv() in afterEach puts them back
  for (const key of ENV_KEYS) delete process.env[key];
  await resetSettings([...AI_KEYS, 'embedding.similarityThreshold']);
});

afterEach(() => {
  restoreEnv();
});

afterAll(async () => {
  for (const row of settingsSnapshot) {
    await prisma.appSetting.upsert({
      where: { key: row.key },
      create: { key: row.key, value: row.value as never, updatedBy: 'test' },
      update: { value: row.value as never, updatedBy: 'test' },
    });
  }
  // Sweep only keys that did not exist before the suite.
  const restoreKeys = AI_KEYS.filter((k) => !settingsSnapshot.some((s) => s.key === k));
  await resetSettings([...restoreKeys, 'embedding.similarityThreshold']);
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

  it('reads configured dimensions from ai.embeddingDimensions', async () => {
    await setSetting('ai.embeddingDimensions', 3072);
    expect(await getEmbeddingDimensions(prisma)).toBe(3072);
  });

  it('reads configured dimensions from AI_EMBEDDING_DIMENSIONS env', async () => {
    process.env.AI_EMBEDDING_DIMENSIONS = '1024';
    await resetSettings(['ai.embeddingDimensions']);
    expect(await getEmbeddingDimensions(prisma)).toBe(1024);
  });

  it('falls back to 1536 for invalid configured dimensions', async () => {
    await setSetting('ai.embeddingDimensions', 0);
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

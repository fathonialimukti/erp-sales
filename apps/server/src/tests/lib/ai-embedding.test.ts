import { afterEach, describe, expect, it } from 'vitest';
import {
  getEmbeddingDimensions,
  getEmbeddingSimilarityThreshold,
  isEmbeddingConfigured,
  toPgVectorLiteral,
} from '../../lib/ai-embedding.js';

const ENV_KEYS = [
  'EMBEDDING_BASE_URL',
  'EMBEDDING_API_KEY',
  'EMBEDDING_MODEL',
  'EMBEDDING_DIMENSIONS',
  'EMBEDDING_SIMILARITY_THRESHOLD',
] as const;

const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function stashEnv() {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe('isEmbeddingConfigured', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('is false when base URL or model missing', () => {
    stashEnv();
    delete process.env.EMBEDDING_BASE_URL;
    delete process.env.EMBEDDING_MODEL;
    expect(isEmbeddingConfigured()).toBe(false);

    process.env.EMBEDDING_BASE_URL = 'https://embed.example/v1';
    delete process.env.EMBEDDING_MODEL;
    expect(isEmbeddingConfigured()).toBe(false);

    delete process.env.EMBEDDING_BASE_URL;
    process.env.EMBEDDING_MODEL = 'text-embedding-3-small';
    expect(isEmbeddingConfigured()).toBe(false);
  });

  it('is true when base URL and model are set (API key optional)', () => {
    stashEnv();
    process.env.EMBEDDING_BASE_URL = 'https://embed.example/v1';
    process.env.EMBEDDING_MODEL = 'text-embedding-3-small';
    delete process.env.EMBEDDING_API_KEY;
    expect(isEmbeddingConfigured()).toBe(true);
  });

  it('trims whitespace and ignores empty values', () => {
    stashEnv();
    process.env.EMBEDDING_BASE_URL = '   ';
    process.env.EMBEDDING_MODEL = 'text-embedding-3-small';
    expect(isEmbeddingConfigured()).toBe(false);
  });
});

describe('embedding env helpers', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('defaults dimensions to 1536', () => {
    stashEnv();
    delete process.env.EMBEDDING_DIMENSIONS;
    expect(getEmbeddingDimensions()).toBe(1536);
  });

  it('locks dimensions to 1536 even when EMBEDDING_DIMENSIONS differs', () => {
    stashEnv();
    process.env.EMBEDDING_DIMENSIONS = '768';
    expect(getEmbeddingDimensions()).toBe(1536);
  });

  it('parses similarity threshold', () => {
    stashEnv();
    process.env.EMBEDDING_SIMILARITY_THRESHOLD = '0.42';
    expect(getEmbeddingSimilarityThreshold()).toBe(0.42);
  });

  it('formats pgvector literals', () => {
    expect(toPgVectorLiteral([0.1, -0.2, 3])).toBe('[0.1,-0.2,3]');
  });
});

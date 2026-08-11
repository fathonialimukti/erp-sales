import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { embed, embedMany } from 'ai';
import { prisma } from './prisma.js';
import { getSettingValue } from './settings-service.js';
import type { DbClient } from './prisma.js';

/** Locked to match `knowledge_chunks.embedding vector(1536)` (phase 2). */
export const EMBEDDING_COLUMN_DIMENSIONS = 1536;
const DEFAULT_SIMILARITY_THRESHOLD = 0.5;
const EMBED_BATCH_SIZE = 32;

let warnedDimensionMismatch = false;

/** True when embedding base URL + model are set (API key optional). */
export async function isEmbeddingConfigured(db: DbClient): Promise<boolean> {
  const baseUrl = String(await getSettingValue(db, 'embedding.baseUrl')).trim();
  const model = String(await getSettingValue(db, 'embedding.model')).trim();
  return Boolean(baseUrl && model);
}

export async function getEmbeddingModelId(db: DbClient): Promise<string> {
  return String(await getSettingValue(db, 'embedding.model')).trim();
}

/**
 * Always 1536 to match the pgvector column.
 * If the configured dimensions differ, warn once and still use 1536.
 */
export async function getEmbeddingDimensions(db: DbClient): Promise<number> {
  const raw = String(await getSettingValue(db, 'embedding.dimensions')).trim();
  if (!raw) return EMBEDDING_COLUMN_DIMENSIONS;

  const n = Number(raw);
  const parsed = Number.isFinite(n) && n > 0 ? Math.trunc(n) : EMBEDDING_COLUMN_DIMENSIONS;
  if (parsed !== EMBEDDING_COLUMN_DIMENSIONS && !warnedDimensionMismatch) {
    warnedDimensionMismatch = true;
    console.warn(
      `[embedding] configured dimensions=${raw} ignored; knowledge_chunks.embedding is fixed at vector(${EMBEDDING_COLUMN_DIMENSIONS}). Using ${EMBEDDING_COLUMN_DIMENSIONS}.`,
    );
  }
  return EMBEDDING_COLUMN_DIMENSIONS;
}

export async function getEmbeddingSimilarityThreshold(db: DbClient): Promise<number> {
  const raw = String(await getSettingValue(db, 'embedding.similarityThreshold')).trim();
  if (!raw) return DEFAULT_SIMILARITY_THRESHOLD;
  const n = Number(raw);
  return Number.isFinite(n) ? n : DEFAULT_SIMILARITY_THRESHOLD;
}

export function toPgVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export function buildEmbedText(title: string, content: string): string {
  return `${title}\n\n${content}`.trim();
}

async function requireEmbeddingConfig(db: DbClient): Promise<{
  baseURL: string;
  apiKey: string;
  modelId: string;
  dimensions: number;
}> {
  const baseURL = String(await getSettingValue(db, 'embedding.baseUrl')).trim().replace(/\/$/, '');
  const modelId = await getEmbeddingModelId(db);
  if (!baseURL || !modelId) {
    throw new Error(
      'Embedding not configured. Set embedding.baseUrl and embedding.model (or EMBEDDING_BASE_URL / EMBEDDING_MODEL).',
    );
  }
  return {
    baseURL,
    apiKey: String(await getSettingValue(db, 'embedding.apiKey')).trim() || 'not-set',
    modelId,
    dimensions: await getEmbeddingDimensions(db),
  };
}

async function getEmbeddingModel(db: DbClient) {
  const { baseURL, apiKey, modelId } = await requireEmbeddingConfig(db);
  const provider = createOpenAICompatible({
    name: 'embedding',
    baseURL,
    apiKey,
  });
  return provider.embeddingModel(modelId);
}

function providerOptionsForDimensions(dimensions: number) {
  return {
    embedding: { dimensions },
    openaiCompatible: { dimensions },
  } as const;
}

/** Generate a single embedding vector. Throws if unconfigured or the provider fails. */
export async function generateEmbedding(db: DbClient, text: string): Promise<number[]> {
  const value = text.trim();
  if (!value) {
    throw new Error('generateEmbedding: text is empty');
  }

  const { dimensions } = await requireEmbeddingConfig(db);
  const result = await embed({
    model: await getEmbeddingModel(db),
    value,
    providerOptions: providerOptionsForDimensions(dimensions),
  });

  if (!result.embedding?.length) {
    throw new Error('generateEmbedding: provider returned empty embedding');
  }
  return result.embedding;
}

/** Batch embeddings in provider-friendly chunks. Throws on failure. */
export async function generateEmbeddings(db: DbClient, values: string[]): Promise<number[][]> {
  const cleaned = values.map((v) => v.trim());
  if (cleaned.some((v) => !v)) {
    throw new Error('generateEmbeddings: empty value in batch');
  }
  if (cleaned.length === 0) return [];

  const { dimensions } = await requireEmbeddingConfig(db);
  const model = await getEmbeddingModel(db);
  const out: number[][] = [];

  for (let i = 0; i < cleaned.length; i += EMBED_BATCH_SIZE) {
    const batch = cleaned.slice(i, i + EMBED_BATCH_SIZE);
    const result = await embedMany({
      model,
      values: batch,
      providerOptions: providerOptionsForDimensions(dimensions),
    });
    if (result.embeddings.length !== batch.length) {
      throw new Error(
        `generateEmbeddings: expected ${batch.length} vectors, got ${result.embeddings.length}`,
      );
    }
    for (const emb of result.embeddings) {
      if (!emb?.length) {
        throw new Error('generateEmbeddings: provider returned empty embedding');
      }
      out.push(emb);
    }
  }

  return out;
}

/** Persist embedding via raw SQL (Prisma Unsupported vector cannot be written via update). */
export async function upsertChunkEmbedding(
  id: string,
  embedding: number[],
  model?: string,
): Promise<void> {
  if (!id) throw new Error('upsertChunkEmbedding: id required');
  if (!embedding.length) throw new Error('upsertChunkEmbedding: empty embedding');
  if (embedding.length !== EMBEDDING_COLUMN_DIMENSIONS) {
    throw new Error(
      `upsertChunkEmbedding: expected ${EMBEDDING_COLUMN_DIMENSIONS} dims, got ${embedding.length}`,
    );
  }

  const vectorLiteral = toPgVectorLiteral(embedding);
  await prisma.$executeRawUnsafe(
    `UPDATE knowledge_chunks
     SET embedding = $1::vector,
         embedding_model = $2,
         embedding_updated_at = NOW()
     WHERE id = $3`,
    vectorLiteral,
    model || 'unknown',
    id,
  );
}

/**
 * Clear embedding so hybrid vector path cannot rank stale content after a title/content edit.
 * Uses raw SQL (Prisma Unsupported vector).
 */
export async function clearChunkEmbedding(id: string): Promise<void> {
  if (!id) throw new Error('clearChunkEmbedding: id required');
  await prisma.$executeRawUnsafe(
    `UPDATE knowledge_chunks
     SET embedding = NULL,
         embedding_model = NULL,
         embedding_updated_at = NULL
     WHERE id = $1`,
    id,
  );
}

/**
 * Best-effort embed + persist for a knowledge row.
 * Never throws — logs and returns false on failure / unconfigured.
 */
export async function embedKnowledgeChunkBestEffort(
  db: DbClient,
  id: string,
  title: string,
  content: string,
): Promise<boolean> {
  if (!(await isEmbeddingConfigured(db))) return false;
  try {
    const embedding = await generateEmbedding(db, buildEmbedText(title, content));
    const modelId = await getEmbeddingModelId(db);
    await upsertChunkEmbedding(id, embedding, modelId);
    return true;
  } catch (err) {
    console.warn(
      `[embedding] failed for knowledge chunk ${id}:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

/** Best-effort batch embed for many rows (ingest). Returns success count. */
export async function embedKnowledgeChunksBestEffort(
  db: DbClient,
  rows: Array<{ id: string; title: string; content: string }>,
): Promise<{ attempted: number; succeeded: number }> {
  if (!(await isEmbeddingConfigured(db)) || rows.length === 0) {
    return { attempted: 0, succeeded: 0 };
  }

  let succeeded = 0;
  const modelId = await getEmbeddingModelId(db);

  for (let i = 0; i < rows.length; i += EMBED_BATCH_SIZE) {
    const batch = rows.slice(i, i + EMBED_BATCH_SIZE);
    try {
      const embeddings = await generateEmbeddings(
        db,
        batch.map((r) => buildEmbedText(r.title, r.content)),
      );
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j]!;
        const emb = embeddings[j]!;
        try {
          await upsertChunkEmbedding(row.id, emb, modelId);
          succeeded += 1;
        } catch (err) {
          console.warn(
            `[embedding] persist failed for ${row.id}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    } catch (err) {
      console.warn(
        `[embedding] batch failed (${batch.length} rows):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return { attempted: rows.length, succeeded };
}

/** Create HNSW cosine index if missing (safe to call after columns exist). */
export async function ensureKnowledgeEmbeddingHnswIndex(): Promise<boolean> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx
      ON knowledge_chunks
      USING hnsw (embedding vector_cosine_ops)
    `);
    return true;
  } catch (err) {
    console.warn(
      '[embedding] HNSW index create skipped:',
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

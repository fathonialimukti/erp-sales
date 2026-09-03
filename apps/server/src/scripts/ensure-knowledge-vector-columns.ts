/**
 * Ensure knowledge_chunks is vector-ready (pgvector already expected installed).
 * Creates nullable embedding columns + FTS GIN + HNSW cosine index (best-effort).
 * Resizes the vector column to the configured embedding dimension
 * (ai.embeddingDimensions / AI_EMBEDDING_DIMENSIONS, default 1536) when needed.
 * Does NOT generate embeddings — use ingest / KB mutations for that.
 *
 * Usage: bun src/scripts/ensure-knowledge-vector-columns.ts
 */
import 'dotenv/config';
import {
  ensureKnowledgeEmbeddingHnswIndex,
  getEmbeddingDimensions,
} from '../lib/ai-embedding.js';
import { prisma } from '../lib/prisma.js';

async function main() {
  console.log('Ensuring pgvector + knowledge_chunks embedding columns…');

  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('  ✓ extension vector');
  } catch (err) {
    // Superuser may be required; extension is already installed in prod/dev (0.8.5)
    console.warn(
      '  ⚠ CREATE EXTENSION vector failed (may need superuser; skip if already installed):',
      err instanceof Error ? err.message : err,
    );
  }

  const dimensions = await getEmbeddingDimensions(prisma);
  console.log(`  Using embedding dimensions: ${dimensions}`);

  // Add the column if missing; resize if the configured dimension differs.
  await prisma.$executeRawUnsafe(`
    ALTER TABLE knowledge_chunks
    ADD COLUMN IF NOT EXISTS embedding vector(${dimensions})
  `);
  console.log(`  ✓ embedding vector(${dimensions})`);

  const colInfo = await prisma.$queryRawUnsafe<Array<{ data_type: string }>>(
    `SELECT data_type FROM information_schema.columns
     WHERE table_name = 'knowledge_chunks' AND column_name = 'embedding'`,
  );
  const declared = colInfo[0]?.data_type ?? '';
  const match = declared.match(/vector\((\d+)\)/);
  if (match && Number(match[1]) !== dimensions) {
    console.warn(
      `  ⚠ embedding column is vector(${match[1]}) but configured dimension is ${dimensions}. ` +
        `Resizing (drops the HNSW index; existing vectors are cleared).`,
    );
    await prisma.$executeRawUnsafe(`
      ALTER TABLE knowledge_chunks
        DROP INDEX IF EXISTS knowledge_chunks_embedding_hnsw_idx
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE knowledge_chunks
        ALTER COLUMN embedding TYPE vector(${dimensions})
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE knowledge_chunks SET embedding = NULL, embedding_status = 'none'
    `);
    console.log(`  ✓ resized to vector(${dimensions}) and cleared stale vectors`);
  }

  await prisma.$executeRawUnsafe(`
    ALTER TABLE knowledge_chunks
    ADD COLUMN IF NOT EXISTS embedding_model TEXT
  `);
  console.log('  ✓ embedding_model');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE knowledge_chunks
    ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ
  `);
  console.log('  ✓ embedding_updated_at');

  // FTS GIN index (idempotent)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS knowledge_chunks_fts_idx
    ON knowledge_chunks
    USING GIN (to_tsvector('english', title || ' ' || content))
  `);
  console.log('  ✓ knowledge_chunks_fts_idx');

  const hnswOk = await ensureKnowledgeEmbeddingHnswIndex();
  console.log(
    hnswOk
      ? '  ✓ knowledge_chunks_embedding_hnsw_idx'
      : '  ⚠ knowledge_chunks_embedding_hnsw_idx skipped',
  );

  console.log(
    'Done. Populate embeddings via ingest (EMBEDDING_* env) or Knowledge Base create/update.',
  );
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('ensure-knowledge-vector-columns failed:', err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});

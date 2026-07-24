/**
 * Ensure knowledge_chunks is vector-ready (pgvector already expected installed).
 * Creates nullable embedding columns + FTS GIN + HNSW cosine index (best-effort).
 * Does NOT generate embeddings — use ingest / KB mutations for that.
 *
 * Usage: bun src/scripts/ensure-knowledge-vector-columns.ts
 */
import 'dotenv/config';
import { ensureKnowledgeEmbeddingHnswIndex } from '../lib/ai-embedding.js';
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

  await prisma.$executeRawUnsafe(`
    ALTER TABLE knowledge_chunks
    ADD COLUMN IF NOT EXISTS embedding vector(1536)
  `);
  console.log('  ✓ embedding vector(1536)');

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

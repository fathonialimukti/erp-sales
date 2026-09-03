/**
 * Knowledge base ingestion script.
 * Reads all .md files from src/knowledge/, splits into chunks, and upserts them
 * keyed by (source, title). UI-created knowledge rows (other sources) are preserved.
 *
 * Idempotent: unchanged chunks keep their existing id + embedding (no re-embed,
 * no vector wipe). Only new or content-changed chunks are embedded.
 *
 * When the AI provider (AI_BASE_URL + AI_MODEL) is configured, batch-embeds new
 * chunks. Otherwise leaves embedding NULL (FTS-only hybrid fallback).
 *
 * Usage: bun src/scripts/ingest-knowledge.ts
 */
import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  embedKnowledgeChunksBestEffort,
  ensureKnowledgeEmbeddingHnswIndex,
  isEmbeddingConfigured,
} from '../lib/ai-embedding.js';
import { prisma } from '../lib/prisma.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = join(__dirname, '../knowledge');
const CHUNK_SIZE = 800; // characters per chunk

function splitIntoChunks(text: string, source: string): Array<{ title: string; content: string }> {
  const chunks: Array<{ title: string; content: string }> = [];
  const sections = text.split(/\n(?=#{1,3} )/);

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const titleLine = lines[0] ?? '';
    const title = titleLine.replace(/^#{1,3} /, '').trim() || source;
    const content = section.trim();

    if (content.length <= CHUNK_SIZE) {
      if (content.length > 20) chunks.push({ title, content });
      continue;
    }

    // Split large sections into smaller chunks
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if ((currentChunk + '\n\n' + paragraph).length > CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push({ title, content: currentChunk.trim() });
        currentChunk = paragraph;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
      }
    }

    if (currentChunk.trim().length > 20) {
      chunks.push({ title, content: currentChunk.trim() });
    }
  }

  return chunks;
}

async function ensureVectorReadyColumns() {
  // Best-effort: extension may already exist (vector 0.8.5). Superuser not always available.
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
  } catch {
    // ignore — column add still works if extension is installed
  }

  await prisma.$executeRawUnsafe(`
    ALTER TABLE knowledge_chunks
    ADD COLUMN IF NOT EXISTS embedding vector(1536)
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE knowledge_chunks
    ADD COLUMN IF NOT EXISTS embedding_model TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE knowledge_chunks
    ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ
  `);
}

async function ingest() {
  console.log('Reading knowledge files from:', KNOWLEDGE_DIR);

  const files = (await readdir(KNOWLEDGE_DIR)).filter((f) => f.endsWith('.md'));
  console.log(`Found ${files.length} knowledge file(s):`, files);

  const markdownSources = files.map((f) => f.replace(/\.md$/, ''));

  await ensureVectorReadyColumns();
  console.log('Ensured embedding columns (nullable).');

  // Load existing markdown-sourced rows once so we can upsert idempotently.
  const existing = await prisma.knowledgeChunk.findMany({
    where: { source: { in: markdownSources } },
    select: { id: true, source: true, title: true, content: true },
  });
  const existingByKey = new Map(existing.map((r) => [`${r.source}\0${r.title}`, r]));

  let totalChunks = 0;
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const toEmbed: Array<{ id: string; title: string; content: string }> = [];

  for (const file of files) {
    const source = file.replace(/\.md$/, '');
    const content = await readFile(join(KNOWLEDGE_DIR, file), 'utf-8');
    const chunks = splitIntoChunks(content, source);

    if (chunks.length === 0) continue;

    for (const chunk of chunks) {
      const key = `${source}\0${chunk.title}`;
      const row = existingByKey.get(key);

      if (!row) {
        const createdRow = await prisma.knowledgeChunk.create({
          data: { source, title: chunk.title, content: chunk.content },
          select: { id: true },
        });
        created += 1;
        toEmbed.push({ id: createdRow.id, title: chunk.title, content: chunk.content });
      } else if (row.content !== chunk.content) {
        await prisma.knowledgeChunk.update({
          where: { id: row.id },
          data: { content: chunk.content },
        });
        updated += 1;
        toEmbed.push({ id: row.id, title: chunk.title, content: chunk.content });
      } else {
        unchanged += 1;
      }
      totalChunks += 1;
    }

    console.log(`  ${file}: ${chunks.length} chunk(s) (${created + updated + unchanged} total)`);
  }

  // Create GIN index for full-text search if it doesn't exist
  await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS knowledge_chunks_fts_idx
        ON knowledge_chunks
        USING GIN (to_tsvector('english', title || ' ' || content))
    `;

  if (await isEmbeddingConfigured(prisma)) {
    console.log(`Embedding ${toEmbed.length} new/changed chunk(s)…`);
    const { attempted, succeeded } = await embedKnowledgeChunksBestEffort(prisma, toEmbed);
    console.log(`  embeddings: ${succeeded}/${attempted} succeeded`);

    const hnswOk = await ensureKnowledgeEmbeddingHnswIndex();
    console.log(hnswOk ? '  ✓ HNSW cosine index ready' : '  ⚠ HNSW index skipped');
  } else {
    console.log(
      'AI provider (AI_BASE_URL / AI_MODEL) not configured — skipping embeddings (FTS-only).',
    );
  }

  const preserved = await prisma.knowledgeChunk.count({
    where: { source: { notIn: markdownSources } },
  });

  console.log(
    `\n✓ Ingestion complete: ${totalChunks} markdown chunk(s) (${created} created, ${updated} updated, ${unchanged} unchanged); ${preserved} non-markdown row(s) preserved.`,
  );
  await prisma.$disconnect();
}

ingest().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});

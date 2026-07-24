import {
  generateEmbedding,
  getEmbeddingSimilarityThreshold,
  isEmbeddingConfigured,
  toPgVectorLiteral,
} from './ai-embedding.js';
import { prisma } from './prisma.js';

export type KnowledgeHit = {
  id?: string;
  title: string;
  source: string;
  content: string;
  rank: number;
};

export type KnowledgeSearchHit = {
  title: string;
  source: string;
  snippet: string;
  rank: number;
};

export type KnowledgeSearchMode = 'vector' | 'fts' | 'hybrid';

const SNIPPET_MAX = 280;

/** Format structured hits as markdown for system-prompt injection. */
export function formatKnowledgeHits(hits: KnowledgeHit[]): string {
  if (hits.length === 0) return '';
  return hits
    .map((c) => `### ${c.title} (source: ${c.source})\n${c.content}`)
    .join('\n\n');
}

export function toKnowledgeSearchHits(
  hits: KnowledgeHit[],
  snippetMax = SNIPPET_MAX,
): KnowledgeSearchHit[] {
  return hits.map((h) => ({
    title: h.title,
    source: h.source,
    snippet:
      h.content.length > snippetMax
        ? `${h.content.slice(0, snippetMax).trimEnd()}…`
        : h.content,
    rank: h.rank,
  }));
}

function hitKey(hit: KnowledgeHit): string {
  if (hit.id) return `id:${hit.id}`;
  return `c:${hit.source}\0${hit.title}\0${hit.content}`;
}

/** Merge FTS + vector hits; prefer higher rank; stable dedupe by id or content. */
export function mergeKnowledgeHits(
  primary: KnowledgeHit[],
  secondary: KnowledgeHit[],
  limit: number,
): KnowledgeHit[] {
  const map = new Map<string, KnowledgeHit>();

  for (const hit of [...primary, ...secondary]) {
    const key = hitKey(hit);
    const existing = map.get(key);
    if (!existing || hit.rank > existing.rank) {
      map.set(key, hit);
    }
  }

  return [...map.values()]
    .sort((a, b) => b.rank - a.rank)
    .slice(0, Math.max(0, limit));
}

async function countNonNullEmbeddings(): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number | bigint }>>(
    `SELECT COUNT(*)::int AS count FROM knowledge_chunks WHERE embedding IS NOT NULL`,
  );
  return Number(rows[0]?.count ?? 0);
}

/** Postgres FTS retrieval only. */
export async function searchKnowledgeChunksFts(
  query: string,
  limit = 5,
): Promise<KnowledgeHit[]> {
  if (!query.trim()) return [];

  const chunks = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      source: string;
      content: string;
      rank: number;
    }>
  >`
        SELECT
            id,
            title,
            source,
            content,
            ts_rank(
                to_tsvector('english', title || ' ' || content),
                plainto_tsquery('english', ${query})
            )::float8 AS rank
        FROM knowledge_chunks
        WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ${query})
        ORDER BY rank DESC
        LIMIT ${limit}
    `;

  return chunks.map((c) => ({
    id: c.id,
    title: c.title,
    source: c.source,
    content: c.content,
    rank: Number(c.rank),
  }));
}

/**
 * Vector cosine retrieval (pgvector).
 * Uses `1 - (embedding <=> query)` similarity with threshold.
 */
export async function searchKnowledgeChunksVector(
  query: string,
  limit = 5,
  threshold = getEmbeddingSimilarityThreshold(),
): Promise<KnowledgeHit[]> {
  if (!query.trim() || !isEmbeddingConfigured()) return [];

  const embedding = await generateEmbedding(query);
  const vectorLiteral = toPgVectorLiteral(embedding);

  const chunks = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      source: string;
      content: string;
      similarity: number;
    }>
  >(
    `SELECT
        id,
        title,
        source,
        content,
        (1 - (embedding <=> $1::vector))::float8 AS similarity
     FROM knowledge_chunks
     WHERE embedding IS NOT NULL
       AND (1 - (embedding <=> $1::vector)) > $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    vectorLiteral,
    threshold,
    limit,
  );

  return chunks.map((c) => ({
    id: c.id,
    title: c.title,
    source: c.source,
    content: c.content,
    rank: Number(c.similarity),
  }));
}

/**
 * Hybrid retrieval: vector (when configured + rows embedded) + FTS, merged/deduped.
 * Falls back to FTS-only when embedding is missing or vector path fails.
 */
export async function searchKnowledgeChunks(
  query: string,
  limit = 5,
): Promise<KnowledgeHit[]> {
  if (!query.trim()) return [];

  const ftsHits = await searchKnowledgeChunksFts(query, limit);

  let vectorHits: KnowledgeHit[] = [];
  let mode: KnowledgeSearchMode = 'fts';

  if (isEmbeddingConfigured()) {
    try {
      const embeddedCount = await countNonNullEmbeddings();
      if (embeddedCount > 0) {
        vectorHits = await searchKnowledgeChunksVector(query, limit);
        mode =
          vectorHits.length > 0 && ftsHits.length > 0
            ? 'hybrid'
            : vectorHits.length > 0
              ? 'vector'
              : 'fts';
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[rag] vector search failed; FTS only:',
          err instanceof Error ? err.message : err,
        );
      }
      mode = 'fts';
      vectorHits = [];
    }
  }

  const hits =
    vectorHits.length > 0
      ? mergeKnowledgeHits(vectorHits, ftsHits, limit)
      : ftsHits.slice(0, limit);

  if (process.env.NODE_ENV !== 'production') {
    console.debug(
      `[rag] mode=${mode} fts=${ftsHits.length} vector=${vectorHits.length} merged=${hits.length}` +
        (hits.length > 0
          ? ` titles=${hits.map((c) => c.title).join(' | ')}`
          : ''),
    );
  }

  return hits;
}

/** Guide-aligned alias: embed query → hybrid retrieve. */
export async function findRelevantContent(
  query: string,
  limit = 5,
): Promise<KnowledgeHit[]> {
  return searchKnowledgeChunks(query, limit);
}

/**
 * Backward-compatible helper: returns formatted markdown for prompt injection.
 * Prefer `searchKnowledgeChunks` when structured hits are needed (tools).
 */
export async function retrieveRelevantChunks(
  query: string,
  limit = 5,
): Promise<string> {
  const hits = await searchKnowledgeChunks(query, limit);
  return formatKnowledgeHits(hits);
}

